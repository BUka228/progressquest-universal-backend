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
  TASKS_COLLECTION,
  SUBTASKS_COLLECTION,
  WORKSPACES_COLLECTION,
  DELETED_ENTITIES_COLLECTION,
} from "../config";
import {
  TaskStatisticsDocument,
  GamificationHistoryEntryDocument,
  DeletedEntityDocument,
  TaskDocument,
  WorkspaceDocument,
} from "../types/firestore.types";
import {TaskStatusUpdatedEventData} from "../types/events.types";
import {updateChallengeProgress} from "../gamification/challengeProcessor";
import {
  onDocumentDeleted,
  onDocumentWritten,
} from "firebase-functions/firestore";

const db = getFirestore();

export const onTaskStatusUpdatedProcessGamification = onMessagePublished(
  {topic: TASK_EVENTS_TOPIC, ...commonRuntimeOpts},
  async (event) => {
    if (!event.data.message?.json) {
      console.warn(
        "[TaskEventHandler] PubSub message missing JSON payload.",
        {eventId: event.id}
      );
      return;
    }

    const taskEvent = event.data.message.json as {
      eventType: string;
      data: any;
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
      console.log(
        "[TaskEventHandler] Gamification & stats updated " +
        `successfully for task completion: ${taskId}`
      );
    } catch (error) {
      console.error(
        `[TaskEventHandler] Transaction failed for task completion ${taskId}:`,
        error
      );
      throw error;
    }
  }
);

/**
 * Триггер для "мягкого удаления". Срабатывает, когда физически удаляется.
 * Создает запись в коллекции deletedEntities.
 */
export const onTaskDocumentDeleted = onDocumentDeleted(
  {...commonRuntimeOpts, document: `${TASKS_COLLECTION}/{taskId}`},
  async (event) => {
    const deletedTaskData = event.data?.data() as TaskDocument | undefined;
    const taskId = event.params.taskId;

    if (!deletedTaskData) {
      console.warn(
        `[onTaskDelete] No data for deleted task ID: ${taskId}. Skipping.`
      );
      return;
    }

    try {
      let parentTeamId: string | null = null;
      if (deletedTaskData.workspaceId) {
        const workspaceDoc = await db
          .collection(WORKSPACES_COLLECTION)
          .doc(deletedTaskData.workspaceId)
          .get();
        if (workspaceDoc.exists) {
          const workspaceData = workspaceDoc.data() as WorkspaceDocument;
          if (!workspaceData.isPersonal) {
            parentTeamId = workspaceData.teamId;
          }
        }
      }

      const softDeleteEntry: DeletedEntityDocument = {
        entityType: "task",
        deletedAt: FieldValue.serverTimestamp(),
        userId: deletedTaskData.creatorUid,
        workspaceId: deletedTaskData.workspaceId,
        teamId: parentTeamId,
      };

      await db
        .collection(DELETED_ENTITIES_COLLECTION)
        .doc(taskId)
        .set(softDeleteEntry);
      console.info(
        `[onTaskDelete] Soft delete entry created for task: ${taskId} ` +
        `with teamId: ${parentTeamId}`
      );
    } catch (error) {
      console.error(
        `[onTaskDelete] Failed to create soft delete entry for task ${taskId}:`,
        error
      );
    }
  }
);

/**
 * Триггер, который обновляет `updatedAt` у родительской задачи
 * при любом изменении (создании, обновлении, удалении) ее подзадачи.
 */
export const onSubtaskChangeUpdateParentTask = onDocumentWritten(
  {
    ...commonRuntimeOpts,
    document: `${TASKS_COLLECTION}/{taskId}/${SUBTASKS_COLLECTION}/{subtaskId}`,
  },
  async (event) => {
    const parentTaskId = event.params.taskId;
    if (!parentTaskId) {
      return;
    }

    console.debug(
      `[onSubtaskChange] Subtask changed for task ${parentTaskId}. ` +
      "Updating parent timestamp."
    );

    const parentTaskRef = db.collection(TASKS_COLLECTION).doc(parentTaskId);
    try {
      await parentTaskRef.update({updatedAt: FieldValue.serverTimestamp()});
      console.info(
        `[onSubtaskChange] Parent task ${parentTaskId} timestamp updated.`
      );
    } catch (error) {
      console.error(
        `[onSubtaskChange] Failed to update parent task ${parentTaskId} ` +
        "timestamp:",
        error
      );
    }
  }
);
