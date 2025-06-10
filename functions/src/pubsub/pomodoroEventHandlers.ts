import {onMessagePublished} from "firebase-functions/v2/pubsub";
import {getFirestore, FieldValue, Timestamp} from "firebase-admin/firestore";
import {
  POMODORO_EVENTS_TOPIC,
  TASK_STATISTICS_COLLECTION,
  GAMIFICATION_PROFILES_COLLECTION,
  GLOBAL_STATISTICS_COLLECTION,
  GAMIFICATION_HISTORY_COLLECTION,
  commonRuntimeOpts,
  XP_PER_POMODORO_FOCUS_MINUTE,
  COINS_PER_XP_BATCH_POMODORO,
  XP_BATCH_FOR_COIN_POMODORO,
  MIN_FOCUS_DURATION_FOR_REWARD_SECONDS,
} from "../config";
import {
  GamificationHistoryEntryDocument,
} from "../types/firestore.types";
import {PomodoroPhaseCompletedEventData} from "../types/events.types";

const db = getFirestore();

export const onPomodoroPhaseCompletedUpdateGamificationAndStats =
  onMessagePublished(
    {topic: POMODORO_EVENTS_TOPIC, ...commonRuntimeOpts},
    async (event) => {
      if (!event.data.message?.json) {
        console.warn(
          "[PomoEventHandler] PubSub message for topic " + // quotes
            POMODORO_EVENTS_TOPIC +
            " missing JSON payload. Event ID:",
          event.id
        );
        return;
      }

      const phaseEventData = event.data.message
        .json as PomodoroPhaseCompletedEventData;
      const eventTimestamp = event.time;

      // Для строки 28, если ошибка quotes все еще там:
      console.log(
        "[PomoEventHandler] Processing POMODORO_PHASE_COMPLETED event " +
          "for session: " + // quotes
          phaseEventData.sessionId
      );

      const {
        userId,
        taskId,
        phaseType,
        actualDurationSeconds,
        completed,
      } = phaseEventData;

      if (
        phaseType !== "FOCUS" ||
        !completed ||
        actualDurationSeconds < MIN_FOCUS_DURATION_FOR_REWARD_SECONDS
      ) {
        // Для строки 40, если ошибка quotes все еще там:
        console.log(
          "[PomoEventHandler] Skipping gamification/stats update for " +
            "session " + // quotes
            phaseEventData.sessionId +
            ": Not a qualifying focus phase. Type: " +
            phaseType +
            ", Completed: " + // quotes
            completed +
            ", Duration: " + // quotes
            actualDurationSeconds +
            "s."
        );
        return;
      }

      const batch = db.batch();
      const serverTimestamp = FieldValue.serverTimestamp();

      const taskStatsRef = db
        .collection(TASK_STATISTICS_COLLECTION)
        .doc(taskId);
      batch.set(
        taskStatsRef,
        {
          totalPomodoroFocusSeconds: FieldValue.increment(
            actualDurationSeconds
          ),
          completedPomodoroFocusSessions: FieldValue.increment(1),
          updatedAt: serverTimestamp,
        },
        {merge: true}
      );

      const gamificationProfileRef = db
        .collection(GAMIFICATION_PROFILES_COLLECTION)
        .doc(userId);

      const minutesInFocus = Math.floor(actualDurationSeconds / 60);
      const xpAwarded = minutesInFocus * XP_PER_POMODORO_FOCUS_MINUTE;
      const coinsAwarded =
        Math.floor(xpAwarded / XP_BATCH_FOR_COIN_POMODORO) *
        COINS_PER_XP_BATCH_POMODORO;

      if (xpAwarded > 0 || coinsAwarded > 0) {
        batch.update(gamificationProfileRef, {
          experience: FieldValue.increment(xpAwarded),
          coins: FieldValue.increment(coinsAwarded),
          lastPomodoroCompletionTime: Timestamp.fromDate(
            new Date(eventTimestamp)
          ),
        });
      }

      const globalStatsRef = db
        .collection(GLOBAL_STATISTICS_COLLECTION)
        .doc(userId);
      batch.update(globalStatsRef, {
        totalPomodoroFocusMinutes: FieldValue.increment(minutesInFocus),
        lastActive: serverTimestamp,
      });

      if (xpAwarded > 0 || coinsAwarded > 0) {
        const historyRef = db.collection(GAMIFICATION_HISTORY_COLLECTION).doc();
        const historyEntry: GamificationHistoryEntryDocument = {
          userId,
          timestamp: serverTimestamp,
          eventType: "POMODORO_FOCUS_PHASE",
          xpChange: xpAwarded,
          coinsChange: coinsAwarded,
          relatedEntityId: taskId,
          relatedEntityType: "task",
          description:
            "Завершена фокус-сессия Pomodoro (" +
            minutesInFocus + // quotes
            " мин) для задачи ID: " +
            taskId.substring(0, 5) + // quotes
            "...",
        };
        batch.set(historyRef, historyEntry);
      }

      console.log(
        "[PomoEventHandler] TODO: Implement challenge checks for Pomodoro " +
          "event."
      );

      console.log(
        "[PomoEventHandler] TODO: Implement plant growth for Pomodoro event."
      );

      try {
        await batch.commit();
        console.log(
          "[PomoEventHandler] Gamification & stats updated successfully for " +
            "pomodoro session: " + // quotes
            phaseEventData.sessionId
        );
      } catch (error) {
        console.error(
          "[PomoEventHandler] Error committing batch for pomodoro session " +
            phaseEventData.sessionId + // quotes
            ":",
          error
        );
        throw error;
      }
    }
  );
