import {onMessagePublished} from "firebase-functions/v2/pubsub";
import {
  getFirestore,
  FieldValue,
  Timestamp,
  PartialWithFieldValue,
} from "firebase-admin/firestore";
import {
  TASK_EVENTS_TOPIC,
  TASK_STATISTICS_COLLECTION,
  GAMIFICATION_PROFILES_COLLECTION,
  GLOBAL_STATISTICS_COLLECTION,
  GAMIFICATION_HISTORY_COLLECTION,
  commonRuntimeOpts,
  XP_FOR_TASK_COMPLETION,
  COINS_FOR_TASK_COMPLETION,
} from "../../../config";
import {GamificationHistoryEntryDocument} from "../types/firestore.types";
import {TaskStatisticsDocument} from "../../statistics/types/firestore.types";
import {TaskStatusUpdatedEventData} from "../../task/types/events.types";
import {
  updateChallengeProgress,
} from "../../../gamification/challengeProcessor";

const db = getFirestore();

export const onTaskStatusUpdatedProcessGamification =
  onMessagePublished(
    {topic: TASK_EVENTS_TOPIC, ...commonRuntimeOpts},
    async (event) => {
      if (!event.data.message?.json) {
        console.warn(
          "[TaskEventHandler] PubSub message missing JSON payload.",
          {eventId: event.id}
        );
        return;
      }

      // --- ИСПРАВЛЕНИЕ 1 (max-len на строке 43) ---
      const taskEvent = event.data.message.json as {
        eventType: string;
        data: unknown; // Заменили any на unknown для большей безопасности
      };
      if (taskEvent.eventType !== "TASK_STATUS_UPDATED") {
        return;
      }

      const taskEventData = taskEvent.data as TaskStatusUpdatedEventData;
      const {
        taskId,
        userId,
        newStatus,
        oldStatus,
        completedAt,
        taskData,
      } = taskEventData;

      console.log(
        `[TaskEventHandler] Processing event for task: ${taskId}, ` +
        `newStatus: ${newStatus}`
      );

      if (newStatus !== "DONE" || oldStatus === "DONE") {
        console.log(
          `[TaskEventHandler] Task ${taskId} status not 'DONE' or ` +
          "was already 'DONE'. Skipping."
        );
        return;
      }

      const serverWriteTimestamp = FieldValue.serverTimestamp();
      const completionTimestampForWrite = completedAt ?
        Timestamp.fromDate(new Date(completedAt)) :
        serverWriteTimestamp;

      try {
        await db.runTransaction(async (t) => {
          const gamificationProfileRef = db
            .collection(GAMIFICATION_PROFILES_COLLECTION)
            .doc(userId);
          const globalStatsRef = db
            .collection(GLOBAL_STATISTICS_COLLECTION)
            .doc(userId);
          const taskStatsRef = db
            .collection(TASK_STATISTICS_COLLECTION)
            .doc(taskId);
          const historyRef = db
            .collection(GAMIFICATION_HISTORY_COLLECTION)
            .doc();

          const statDoc = await t.get(taskStatsRef);
          const updateData: PartialWithFieldValue<TaskStatisticsDocument> = {
            completionTime: completionTimestampForWrite,
            wasCompletedOnce: true,
            updatedAt: serverWriteTimestamp,
          };
          if (!statDoc.exists || !statDoc.data()?.wasCompletedOnce) {
            updateData.firstCompletionTime = completionTimestampForWrite;
          }
          t.set(taskStatsRef, updateData, {merge: true});

          t.update(gamificationProfileRef, {
            experience: FieldValue.increment(XP_FOR_TASK_COMPLETION),
            coins: FieldValue.increment(COINS_FOR_TASK_COMPLETION),
            lastTaskCompletionTime: Timestamp.fromDate(new Date(event.time)),
          });

          t.update(globalStatsRef, {
            totalTasksCompleted: FieldValue.increment(1),
            lastActive: serverWriteTimestamp,
          });

          // --- ИСПРАВЛЕНИЕ 2 (indent на строке 117) ---
          const taskTitleSubstring = (
            taskData?.title ?? "Без названия"
          ).substring(0, 30);
          const historyEntry: GamificationHistoryEntryDocument = {
            userId,
            timestamp: serverWriteTimestamp,
            eventType: "TASK_COMPLETED",
            xpChange: XP_FOR_TASK_COMPLETION,
            coinsChange: COINS_FOR_TASK_COMPLETION,
            relatedEntityId: taskId,
            relatedEntityType: "task",
            description: `Задача '${taskTitleSubstring}...' выполнена.`,
          };
          t.set(historyRef, historyEntry);

          await updateChallengeProgress({
            transaction: t,
            userId,
            eventType: "TASK_COMPLETION_COUNT",
            eventValue: 1,
            eventTimestamp: new Date(event.time),
          });
        });
        // --- ИСПРАВЛЕНИЕ 3 (max-len на строке 145) ---
        console.log(
          "[TaskEventHandler] Gamification & stats updated successfully " +
          `for task completion: ${taskId}`
        );
      } catch (error) {
        console.error(
          `[TaskEventHandler] Transaction failed for completion ${taskId}:`,
          error
        );
        throw error;
      }
    }
  );
