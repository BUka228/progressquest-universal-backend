import {onMessagePublished} from "firebase-functions/v2/pubsub";
import {getFirestore, FieldValue, Timestamp} from "firebase-admin/firestore";
import {
  TASK_EVENTS_TOPIC,
  TASK_STATISTICS_COLLECTION,
  GAMIFICATION_PROFILES_COLLECTION,
  GLOBAL_STATISTICS_COLLECTION,
  GAMIFICATION_HISTORY_COLLECTION,
  runtimeOptsV2,
} from "../config";
import {
  TaskStatusUpdatedEvent,
  TaskStatisticsDocument,
  GamificationHistoryEntryDocument,
} from "../types";

const db = getFirestore();

export const onTaskStatusUpdatedProcessCompletion = onMessagePublished(
  {topic: TASK_EVENTS_TOPIC, ...runtimeOptsV2},
  async (event) => {
    if (!event.data.message?.json) {
      console.warn(
        `[${TASK_EVENTS_TOPIC}] Missing JSON in message. ID:`,
        event.id
      );
      return;
    }
    const taskEvent = event.data.message.json as TaskStatusUpdatedEvent;

    const {taskId, userId, newStatus, completedAt} = taskEvent;

    if (newStatus !== "DONE") {
      console.log(
        `[${TASK_EVENTS_TOPIC}] Task ${taskId} not 'DONE', skipping.`
      );
      return;
    }

    const batch = db.batch();
    const now = FieldValue.serverTimestamp();

    const taskStatsRef = db.collection(TASK_STATISTICS_COLLECTION).doc(taskId);
    try {
      await db.runTransaction(async (t) => {
        const statDoc = await t.get(taskStatsRef);
        const updateData: Partial<TaskStatisticsDocument> = {
          completionTime: completedAt
            ? Timestamp.fromDate(new Date(completedAt))
            : (now as Timestamp),
          wasCompletedOnce: true,
          updatedAt: now,
        };
        if (!statDoc.exists || !statDoc.data()?.wasCompletedOnce) {
          updateData.firstCompletionTime =
            updateData.completionTime as Timestamp;
        }
        t.set(taskStatsRef, updateData, {merge: true});
      });
    } catch (error) {
      console.error(
        `[${TASK_EVENTS_TOPIC}] Error in transaction for taskStats ` +
          `${taskId}:`,
        error
      );
      throw error;
    }

    const gamificationProfileRef = db
      .collection(GAMIFICATION_PROFILES_COLLECTION)
      .doc(userId);
    const xpForTask = 50;
    const coinsForTask = 10;
    batch.update(gamificationProfileRef, {
      experience: FieldValue.increment(xpForTask),
      coins: FieldValue.increment(coinsForTask),
    });

    const globalStatsRef = db
      .collection(GLOBAL_STATISTICS_COLLECTION)
      .doc(userId);
    batch.update(globalStatsRef, {
      completedTasks: FieldValue.increment(1),
      lastActive: now,
    });

    const historyRef = db.collection(GAMIFICATION_HISTORY_COLLECTION).doc();
    batch.set(historyRef, {
      userId,
      timestamp: now,
      eventType: "TASK_COMPLETED",
      xpChange: xpForTask,
      coinsChange: coinsForTask,
      relatedEntityId: taskId,
      description: "Задача выполнена.",
    } as GamificationHistoryEntryDocument);

    try {
      await batch.commit();
      console.log(
        `[${TASK_EVENTS_TOPIC}] Gam/stats updated OK for task: ${taskId}`
      );
    } catch (error) {
      console.error(
        `[${TASK_EVENTS_TOPIC}] Error committing batch for task ${taskId}:`,
        error
      );
      throw error;
    }
  }
);
