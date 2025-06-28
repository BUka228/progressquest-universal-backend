import {
  HttpsError,
  onCall,
  CallableRequest,
} from "firebase-functions/v2/https";
import {
  getFirestore,
  FieldValue,
  Timestamp,
  PartialWithFieldValue,
} from "firebase-admin/firestore";
import {
  commonRuntimeOpts,
  POMODORO_SESSIONS_COLLECTION,
  POMODORO_EVENTS_TOPIC,
} from "../config";
import {assertAuthenticated, assertPersonalWorkspaceOwner} from "../utils";
import {
  PomodoroSessionDocument,
} from "../types/firestore.types";
import {
  StartPomodoroPhasePayload,
  StartPomodoroPhaseResponse,
  CompletePomodoroPhasePayload,
  SuccessResponse,
} from "../types/api.types";
import {
  PomodoroPhaseStartedEventData,
  PomodoroPhaseCompletedEventData,
} from "../types/events.types";
import {PubSub} from "@google-cloud/pubsub";

const db = getFirestore();
const pubsub = new PubSub();

export const startPomodoroPhase = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request: CallableRequest<StartPomodoroPhasePayload>) => {
    const uid = assertAuthenticated(request.auth);
    const data = request.data;

    if (
      !data.taskId ||
      !data.workspaceId ||
      !data.sessionType ||
      data.plannedDurationSeconds == null ||
      data.plannedDurationSeconds <= 0
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Отсутствуют или некорректны обязательные поля для старта фазы " +
          "Pomodoro."
      );
    }

    try {
      await assertPersonalWorkspaceOwner(data.workspaceId, uid);
    } catch (e: any) {
      if (e instanceof HttpsError) {
        throw e;
      }
      console.error(
        "[Pomo] Permission check failed for startPomodoroPhase for user " +
          `${uid}, ws ${data.workspaceId}`,
        e
      );
      throw new HttpsError("permission-denied", "Доступ запрещен.");
    }

    const now = FieldValue.serverTimestamp();
    const newSessionData: Omit<PomodoroSessionDocument, "id" | "updatedAt"> = {
      userId: uid,
      taskId: data.taskId,
      workspaceId: data.workspaceId,
      sessionType: data.sessionType,
      plannedDurationSeconds: data.plannedDurationSeconds,
      phaseNumberInCycle: data.phaseNumberInCycle || 0,
      totalFocusSessionIndex: data.totalFocusSessionIndex || 0,
      startTime: now,
      actualDurationSeconds: 0,
      interruptions: 0,
      completed: false,
    };

    try {
      const sessionRef = await db
        .collection(POMODORO_SESSIONS_COLLECTION)
        .add(newSessionData);

      const eventPayload: PomodoroPhaseStartedEventData = {
        sessionId: sessionRef.id,
        userId: uid,
        taskId: data.taskId,
        workspaceId: data.workspaceId,
        phaseType: data.sessionType,
        plannedDurationSeconds: data.plannedDurationSeconds,
        phaseNumberInCycle: newSessionData.phaseNumberInCycle,
        totalFocusSessionIndex: newSessionData.totalFocusSessionIndex,
        startTime: new Date().toISOString(),
      };
      await pubsub.topic(POMODORO_EVENTS_TOPIC).publishMessage({
        json: {
          eventType: "POMODORO_PHASE_STARTED",
          data: eventPayload,
          eventTimestamp: new Date().toISOString(),
        },
      });
      // Исправлено max-len
      console.log(`[Pomo] Started Pomodoro phase, ID: ${sessionRef.id}`);
      return {sessionId: sessionRef.id} as StartPomodoroPhaseResponse;
    } catch (e: any) {
      console.error(`[Pomo] Error starting pomodoro phase for user ${uid}:`, e);
      throw new HttpsError(
        "internal",
        "Не удалось начать Pomodoro фазу.",
        String(e?.message)
      );
    }
  }
);

export const completePomodoroPhase = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request: CallableRequest<CompletePomodoroPhasePayload>) => {
    const uid = assertAuthenticated(request.auth);
    const data = request.data;

    if (
      !data.sessionId ||
      data.actualDurationSeconds == null ||
      data.interruptions == null ||
      data.completed == null
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Отсутствуют обязательные поля для завершения фазы Pomodoro."
      );
    }

    const sessionRef = db
      .collection(POMODORO_SESSIONS_COLLECTION)
      .doc(data.sessionId);
    const now = FieldValue.serverTimestamp();

    try {
      let phaseDataForEvent: PomodoroPhaseCompletedEventData | null = null;

      await db.runTransaction(async (t) => {
        const sessionDoc = await t.get(sessionRef);
        if (!sessionDoc.exists) {
          throw new HttpsError("not-found", "Сессия Pomodoro не найдена.");
        }
        const sessionData = sessionDoc.data() as PomodoroSessionDocument;
        if (sessionData.userId !== uid) {
          throw new HttpsError(
            "permission-denied",
            "Вы не можете завершить эту сессию Pomodoro."
          );
        }
        if (sessionData.completed) {
          console.warn(
            `[Pomo] Session ${data.sessionId} already marked as completed. ` +
            "Skipping update, but will re-publish event."
          );
        }

        const updatePayload: PartialWithFieldValue<PomodoroSessionDocument> = {
          actualDurationSeconds: data.actualDurationSeconds,
          interruptions: data.interruptions,
          completed: data.completed,
          updatedAt: now,
        };
        t.update(sessionRef, updatePayload);

        phaseDataForEvent = {
          sessionId: data.sessionId,
          userId: uid,
          taskId: sessionData.taskId,
          workspaceId: sessionData.workspaceId,
          phaseType: sessionData.sessionType,
          plannedDurationSeconds: sessionData.plannedDurationSeconds,
          actualDurationSeconds: data.actualDurationSeconds,
          interruptions: data.interruptions,
          completed: data.completed,
          phaseStartTime:
            (sessionData.startTime as Timestamp).toDate().toISOString(),
          completionTime: new Date().toISOString(),
        };
      });

      if (phaseDataForEvent) {
        await pubsub.topic(POMODORO_EVENTS_TOPIC).publishMessage({
          json: {
            eventType: "POMODORO_PHASE_COMPLETED",
            data: phaseDataForEvent,
            eventTimestamp: new Date().toISOString(),
          },
        });
        console.log(
          `[Pomo] Pomodoro phase ${data.sessionId} processed. Event published.`
        );
      } else {
        console.error(
          "[Pomo] phaseDataForEvent was null after transaction for session " +
            `${data.sessionId}.`
        );
      }
      return {
        success: true,
        message: "Pomodoro фаза обработана.",
      } as SuccessResponse;
    } catch (e: any) {
      console.error(
        `[Pomo] Error completing pomodoro phase ${data.sessionId}:`,
        e
      );
      if (e instanceof HttpsError) {
        throw e;
      }
      throw new HttpsError(
        "internal",
        "Не удалось завершить Pomodoro фазу.",
        String(e?.message)
      );
    }
  }
);
