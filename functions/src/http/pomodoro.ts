import {HttpsError, onCall} from "firebase-functions/v2/https";
import {getFirestore, FieldValue, Timestamp} from "firebase-admin/firestore";
import {
  runtimeOptsV2,
  POMODORO_SESSIONS_COLLECTION,
  POMODORO_EVENTS_TOPIC,
} from "../config";
import {assertAuthenticated, assertPersonalWorkspaceOwner} from "../utils";
import {
  PomodoroPhaseStartData,
  PomodoroPhaseCompleteData,
  PomodoroSessionDocument,
} from "../types";
import {PomodoroPhaseCompletedEvent} from "../types/events.types";
import {PubSub} from "@google-cloud/pubsub";

const db = getFirestore();
const pubsub = new PubSub();

export const startPomodoroPhase = onCall(runtimeOptsV2, async (request) => {
  const uid = assertAuthenticated(request.auth);
  const data = request.data as PomodoroPhaseStartData;

  if (
    !data.taskId ||
    !data.workspaceId ||
    !data.sessionType ||
    data.plannedDurationSeconds == null
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Missing fields for pomodoro phase."
    );
  }
  await assertPersonalWorkspaceOwner(data.workspaceId, uid);

  const newSessionData: Omit<PomodoroSessionDocument, "id" | "updatedAt"> = {
    userId: uid,
    taskId: data.taskId,
    workspaceId: data.workspaceId,
    sessionType: data.sessionType,
    plannedDurationSeconds: data.plannedDurationSeconds,
    phaseNumberInCycle: data.phaseNumberInCycle || 0,
    totalFocusSessionIndex: data.totalFocusSessionIndex || 0,
    startTime: FieldValue.serverTimestamp(),
    actualDurationSeconds: 0,
    interruptions: 0,
    completed: false,
  };
  try {
    const sessionRef = await db
      .collection(POMODORO_SESSIONS_COLLECTION)
      .add(newSessionData);
    return {sessionId: sessionRef.id};
  } catch (e: any) {
    console.error(
      `startPomodoroPhase for user ${uid}, task ${data.taskId}:`,
      e.message
    );
    throw new HttpsError(
      "internal",
      "Failed to start pomodoro phase.",
      e.message
    );
  }
});

export const completePomodoroPhase = onCall(runtimeOptsV2, async (request) => {
  const uid = assertAuthenticated(request.auth);
  const data = request.data as PomodoroPhaseCompleteData;

  if (
    !data.sessionId ||
    data.actualDurationSeconds == null ||
    data.interruptions == null ||
    data.completed == null
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Missing fields for completion."
    );
  }
  const sessionRef = db
    .collection(POMODORO_SESSIONS_COLLECTION)
    .doc(data.sessionId);
  try {
    let phaseDataForEvent: PomodoroPhaseCompletedEvent | null = null;
    await db.runTransaction(async (t) => {
      const sessionDoc = await t.get(sessionRef);
      if (
        !sessionDoc.exists ||
        (sessionDoc.data() as PomodoroSessionDocument).userId !== uid
      ) {
        throw new HttpsError(
          "permission-denied",
          "Cannot complete this session."
        );
      }
      const s = sessionDoc.data() as PomodoroSessionDocument;
      if (s.completed) {
        console.warn(`Session ${data.sessionId} already marked as completed.`);
      }

      t.update(sessionRef, {
        actualDurationSeconds: data.actualDurationSeconds,
        interruptions: data.interruptions,
        completed: data.completed,
        updatedAt: FieldValue.serverTimestamp(),
      });

      phaseDataForEvent = {
        sessionId: data.sessionId,
        userId: uid,
        taskId: s.taskId,
        workspaceId: s.workspaceId,
        phaseType: s.sessionType,
        plannedDurationSeconds: s.plannedDurationSeconds,
        actualDurationSeconds: data.actualDurationSeconds,
        interruptions: data.interruptions,
        completed: data.completed,
        phaseStartTime: (s.startTime as Timestamp).toDate().toISOString(),
        completionTime: new Date().toISOString(),
        eventType: "POMODORO_PHASE_COMPLETED",
      };
    });

    if (phaseDataForEvent) {
      await pubsub
        .topic(POMODORO_EVENTS_TOPIC)
        .publishMessage({json: phaseDataForEvent});
      console.log(
        `Published POMODORO_PHASE_COMPLETED for session ${data.sessionId}`
      );
    } else {
      console.warn(
        `phaseDataForEvent was null for session ${data.sessionId}.`
      );
    }
    return {success: true, message: "Pomodoro phase processed."};
  } catch (e: any) {
    console.error(
      `completePomodoroPhase for session ${data.sessionId}:`,
      e.message
    );
    if (e instanceof HttpsError) {
      throw e;
    }
    throw new HttpsError(
      "internal",
      "Failed to complete pomodoro phase.",
      e.message
    );
  }
});
