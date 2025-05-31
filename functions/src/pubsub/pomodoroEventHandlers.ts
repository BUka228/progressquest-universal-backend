import {onMessagePublished} from "firebase-functions/v2/pubsub";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {
  POMODORO_EVENTS_TOPIC,
  TASK_STATISTICS_COLLECTION,
  GAMIFICATION_PROFILES_COLLECTION,
  GLOBAL_STATISTICS_COLLECTION,
  GAMIFICATION_HISTORY_COLLECTION,
  runtimeOptsV2,
} from "../config";
import {
  PomodoroPhaseCompletedEvent,
  TaskStatisticsDocument,
  GamificationHistoryEntryDocument,
} from "../types";

const db = getFirestore();

const MIN_FOCUS_DURATION_FOR_REWARD_SECONDS = 10;

export const onPomodoroPhaseCompletedUpdateStats = onMessagePublished(
  {topic: POMODORO_EVENTS_TOPIC, ...runtimeOptsV2},
  async (event) => {
    if (!event.data.message?.json) {
      console.warn(
        `[${POMODORO_EVENTS_TOPIC}] Missing JSON in message. ID:`,
        event.id
      );
      return;
    }

    const phaseEvent = event.data.message.json as PomodoroPhaseCompletedEvent;

    const {
      userId,
      taskId,
      phaseType,
      actualDurationSeconds,
      completed,
    } = phaseEvent;

    if (
      phaseType !== "FOCUS" ||
      !completed ||
      actualDurationSeconds < MIN_FOCUS_DURATION_FOR_REWARD_SECONDS
    ) {
      console.log(
        `[${POMODORO_EVENTS_TOPIC}] Skipping gam/stats: not a completed ` +
        `focus phase or too short. SessionId: ${phaseEvent.sessionId}`
      );
      return;
    }

    const batch = db.batch();
    const now = FieldValue.serverTimestamp();

    const taskStatsRef = db.collection(TASK_STATISTICS_COLLECTION).doc(taskId);
    batch.set(
      taskStatsRef,
      {
        totalPomodoroFocusSeconds: FieldValue.increment(actualDurationSeconds),
        completedPomodoroFocusSessions: FieldValue.increment(1),
        updatedAt: now,
      } as unknown as Partial<TaskStatisticsDocument>,
      {merge: true}
    );

    const gamificationProfileRef = db
      .collection(GAMIFICATION_PROFILES_COLLECTION)
      .doc(userId);

    const minutesInFocus = Math.floor(actualDurationSeconds / 60);
    const xpAwarded = minutesInFocus * 1;
    const coinsAwarded = Math.floor(xpAwarded / 5);

    if (xpAwarded > 0 || coinsAwarded > 0) {
      batch.update(gamificationProfileRef, {
        experience: FieldValue.increment(xpAwarded),
        coins: FieldValue.increment(coinsAwarded),
      });
    }

    const globalStatsRef = db
      .collection(GLOBAL_STATISTICS_COLLECTION)
      .doc(userId);
    batch.update(globalStatsRef, {
      totalPomodoroFocusMinutes: FieldValue.increment(minutesInFocus),
      lastActive: now,
    });

    if (xpAwarded > 0 || coinsAwarded > 0) {
      const historyRef = db.collection(GAMIFICATION_HISTORY_COLLECTION).doc();
      batch.set(historyRef, {
        userId,
        timestamp: now,
        eventType: "POMODORO_FOCUS_COMPLETED",
        xpChange: xpAwarded,
        coinsChange: coinsAwarded,
        relatedEntityId: taskId,
        description:
          "Завершена Pomodoro-фокус сессия " + `(${minutesInFocus} мин).`,
      } as GamificationHistoryEntryDocument);
    }

    try {
      await batch.commit();
      console.log(
        `[${POMODORO_EVENTS_TOPIC}] Gam/stats updated OK ` +
        `for pomodoro session: ${phaseEvent.sessionId}`
      );
    } catch (error) {
      console.error(
        `[${POMODORO_EVENTS_TOPIC}] Error updating gamification/stats ` +
        `for pomodoro session ${phaseEvent.sessionId}:`,
        error
      );
      throw error;
    }
  }
);
