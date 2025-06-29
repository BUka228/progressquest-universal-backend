import {
  HttpsError,
  onCall,
  CallableRequest,
} from "firebase-functions/v2/https";
import {
  getFirestore,
  FieldValue,
  Timestamp,
  Query,
  PartialWithFieldValue,
} from "firebase-admin/firestore";
import {
  commonRuntimeOpts,
  TASKS_COLLECTION,
  GLOBAL_STATISTICS_COLLECTION,
  TASK_EVENTS_TOPIC,
  USERS_COLLECTION,
  DELETED_ENTITIES_COLLECTION,
} from "../../../config";
import {
  assertAuthenticated,
  assertPersonalWorkspaceOwner,
  assertWorkspaceAccess,
} from "../../../core/utils/auth.utils";
import {UserViewDocument} from "../../views/types/firestore.types";
import {
  TaskDocument,
  TaskStatusType,
} from "../types/firestore.types";
import {
  DateRangeFilterClientDto,
  ViewFiltersClientDto,
} from "../../views/types/api.types";
import {SuccessResponse} from "../../../core/types/api.types";
import {
  CreateTaskPayload,
  TaskClientDto,
  GetTasksPayload,
  GetTasksResponse,
  GetTaskDetailsPayload,
  GetTaskDetailsResponse,
  UpdateTaskPayload,
  UpdateTaskResponse,
  DeleteTaskPayload,
  UpdateTaskStatusPayload,
  CreateTaskResponse,
  GetTaskChangesPayload,
  GetTaskChangesResponse,
} from "../types/api.types";
import {
  TaskCreatedEventData,
  TaskStatusUpdatedEventData,
} from "../types/events.types";
import {PubSub} from "@google-cloud/pubsub";

const db = getFirestore();
const pubsub = new PubSub();

export const createTask = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request: CallableRequest<CreateTaskPayload>) => {
    const uid = assertAuthenticated(request.auth);
    const data = request.data;

    if (!data.title || !data.workspaceId) {
      throw new HttpsError(
        "invalid-argument",
        "Title & WorkspaceId required."
      );
    }
    await assertWorkspaceAccess(data.workspaceId, uid);

    const now = FieldValue.serverTimestamp();
    const newTaskRef = db.collection(TASKS_COLLECTION).doc();

    const newTaskData: Omit<TaskDocument, "id"> = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      status: "TODO",
      priority: data.priority || "MEDIUM",
      dueDate: data.dueDate ?
        Timestamp.fromDate(new Date(data.dueDate)) :
        null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      creatorUid: uid,
      assigneeUid: uid,
      workspaceId: data.workspaceId,
      tags: data.tags || [],
      pomodoroEstimatedCycles: null,
      pomodoroEstimatedMinutes: data.pomodoroEstimatedMinutes || null,
      approachParams: data.approachParams || null,
      orderInList: 0,
      lastSyncClientTimestamp: null,
      localId: null,
    };

    try {
      await db.runTransaction(async (t) => {
        t.set(newTaskRef, newTaskData);
        const gsRef = db.collection(GLOBAL_STATISTICS_COLLECTION).doc(uid);
        t.update(gsRef, {
          totalTasksCreated: FieldValue.increment(1),
          lastActive: now,
        });
      });

      const eventPayload: TaskCreatedEventData = {
        taskId: newTaskRef.id,
        workspaceId: data.workspaceId,
        creatorUid: uid,
        assigneeUid: uid,
        title: newTaskData.title,
      };
      await pubsub.topic(TASK_EVENTS_TOPIC).publishMessage({
        json: {
          eventType: "TASK_CREATED",
          data: eventPayload,
          eventTimestamp: new Date().toISOString(),
        },
      });
      console.log(
        `[Tasks] Task ${newTaskRef.id} created in ws ${data.workspaceId}`
      );
      const createdDoc = await newTaskRef.get();
      const createdData = createdDoc.data() as TaskDocument;
      return {
        task: {
          id: newTaskRef.id,
          ...createdData,
          createdAt: (
            createdData.createdAt as Timestamp
          ).toDate().toISOString(),
          updatedAt: (
            createdData.updatedAt as Timestamp
          ).toDate().toISOString(),
          dueDate: createdData.dueDate ?
            (createdData.dueDate as Timestamp).toDate().toISOString() :
            null,
          completedAt: null,
        },
      } as CreateTaskResponse;
    } catch (e: any) {
      console.error(
        `[Tasks] Error creating task for ws ${data.workspaceId}:`,
        e
      );
      if (e instanceof HttpsError) {
        throw e;
      }
      throw new HttpsError(
        "internal",
        "Failed to create task.",
        String(e?.message)
      );
    }
  }
);

export const getTasks = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<GetTasksPayload>
  ): Promise<GetTasksResponse> => {
    const uid = assertAuthenticated(request.auth);
    const {viewId, workspaceId, filters, sortBy, sortDirection} = request.data;

    if (!viewId && !workspaceId) {
      throw new HttpsError(
        "invalid-argument",
        "Должен быть предоставлен viewId или workspaceId."
      );
    }

    try {
      let targetWorkspaceIds: string[] = [];
      let effectiveFilters: ViewFiltersClientDto | null = filters || null;
      let effectiveSortBy = sortBy;
      let effectiveSortDir = sortDirection;

      if (viewId) {
        const viewRef = db.collection(USERS_COLLECTION).doc(uid)
          .collection("views").doc(viewId);
        const viewDoc = await viewRef.get();
        if (!viewDoc.exists) {
          throw new HttpsError("not-found", "Представление не найдено.");
        }
        const viewDataFromDb = viewDoc.data() as UserViewDocument;
        targetWorkspaceIds = viewDataFromDb.workspaceIds;

        for (const wsId of targetWorkspaceIds) {
          await assertWorkspaceAccess(wsId, uid);
        }

        if (viewDataFromDb.filters) {
          const dbFilters = viewDataFromDb.filters;
          let clientDateRange: DateRangeFilterClientDto | undefined;

          if (dbFilters.dateRange) {
            clientDateRange = {
              start: dbFilters.dateRange.start ?
                (dbFilters.dateRange.start as Timestamp)
                  .toDate().toISOString() :
                null,
              end: dbFilters.dateRange.end ?
                (dbFilters.dateRange.end as Timestamp).toDate().toISOString() :
                null,
              type: dbFilters.dateRange.type,
            };
          }
          effectiveFilters = {
            status: dbFilters.status,
            priority: dbFilters.priority,
            tagsInclude: dbFilters.tagsInclude,
            tagsExclude: dbFilters.tagsExclude,
            dateRange: clientDateRange,
            assignee: dbFilters.assignee,
          };
        } else {
          effectiveFilters = null;
        }

        effectiveSortBy = viewDataFromDb.sortBy || effectiveSortBy;
        effectiveSortDir = viewDataFromDb.sortDirection || effectiveSortDir;
      } else if (workspaceId) {
        await assertWorkspaceAccess(workspaceId, uid);
        targetWorkspaceIds = [workspaceId];
      }

      if (targetWorkspaceIds.length === 0) {
        return {tasks: []};
      }

      let query: Query = db.collection(TASKS_COLLECTION)
        .where("workspaceId", "in", targetWorkspaceIds);

      if (effectiveFilters) {
        if (effectiveFilters.status && effectiveFilters.status.length > 0) {
          query = query.where("status", "in", effectiveFilters.status);
        }
        if (effectiveFilters.priority && effectiveFilters.priority.length > 0) {
          query = query.where("priority", "in", effectiveFilters.priority);
        }
        if (
          effectiveFilters.tagsInclude &&
          effectiveFilters.tagsInclude.length > 0
        ) {
          query = query.where(
            "tags",
            "array-contains-any",
            effectiveFilters.tagsInclude
          );
        }
        if (effectiveFilters.dateRange) {
          const drClient = effectiveFilters.dateRange;
          const fieldToFilter =
            drClient.type === "created" ?
              "createdAt" :
              drClient.type === "completed" ?
                "completedAt" :
                "dueDate";
          if (drClient.start) {
            query = query.where(
              fieldToFilter,
              ">=",
              Timestamp.fromDate(new Date(drClient.start as string | number))
            );
          }
          if (drClient.end) {
            const endDate = new Date(drClient.end as string | number);
            const endOfDay = new Date(
              endDate.getFullYear(),
              endDate.getMonth(),
              endDate.getDate() + 1
            );
            query = query.where(
              fieldToFilter,
              "<",
              Timestamp.fromDate(endOfDay)
            );
          }
        }
        if (effectiveFilters.assignee) {
          if (effectiveFilters.assignee === "me") {
            query = query.where("assigneeUid", "==", uid);
          } else if (effectiveFilters.assignee === "unassigned") {
            query = query.where("assigneeUid", "==", null);
          } else {
            query = query.where(
              "assigneeUid",
              "==",
              effectiveFilters.assignee
            );
          }
        }
      }

      const finalSortBy = effectiveSortBy || "createdAt";
      const finalSortDir = effectiveSortDir || "desc";
      query = query.orderBy(finalSortBy, finalSortDir);

      const snapshot = await query.limit(100).get();
      const tasks = snapshot.docs.map((doc) => {
        const data = doc.data() as TaskDocument;
        return {
          id: doc.id,
          ...data,
          createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
          updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
          dueDate: data.dueDate ?
            (data.dueDate as Timestamp).toDate().toISOString() :
            null,
          completedAt: data.completedAt ?
            (data.completedAt as Timestamp).toDate().toISOString() :
            null,
        } as TaskClientDto;
      });

      return {tasks};
    } catch (e: any) {
      console.error(
        `[Tasks] Error fetching tasks for user ${uid}`,
        e
      );
      if (e instanceof HttpsError) {
        throw e;
      }
      throw new HttpsError(
        "internal",
        "Не удалось загрузить задачи.",
        String(e?.message)
      );
    }
  }
);

export const getTaskDetails = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request: CallableRequest<GetTaskDetailsPayload>) => {
    const uid = assertAuthenticated(request.auth);
    const {taskId} = request.data;

    if (!taskId) {
      throw new HttpsError("invalid-argument", "TaskId is required.");
    }
    try {
      const taskRef = db.collection(TASKS_COLLECTION).doc(taskId);
      const taskDoc = await taskRef.get();
      if (!taskDoc.exists) {
        throw new HttpsError("not-found", "Task not found.");
      }
      const taskData = taskDoc.data() as TaskDocument;
      await assertPersonalWorkspaceOwner(taskData.workspaceId, uid);

      return {
        task: {
          id: taskDoc.id,
          ...taskData,
          createdAt: (
            taskData.createdAt as Timestamp
          ).toDate().toISOString(),
          updatedAt: (
            taskData.updatedAt as Timestamp
          ).toDate().toISOString(),
          dueDate: taskData.dueDate ?
            (taskData.dueDate as Timestamp).toDate().toISOString() :
            null,
          completedAt: taskData.completedAt ?
            (taskData.completedAt as Timestamp).toDate().toISOString() :
            null,
        },
      } as GetTaskDetailsResponse;
    } catch (e: any) {
      console.error(
        `[Tasks] Error fetching details for task ${taskId}:`,
        e
      );
      if (e instanceof HttpsError) {
        throw e;
      }
      throw new HttpsError(
        "internal",
        "Fetch task details failed.",
        String(e?.message)
      );
    }
  }
);

export const updateTask = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request: CallableRequest<UpdateTaskPayload>) => {
    const uid = assertAuthenticated(request.auth);
    const data = request.data;
    const {taskId} = data;

    if (!taskId) {
      throw new HttpsError("invalid-argument", "TaskId is required.");
    }
    const taskRef = db.collection(TASKS_COLLECTION).doc(taskId);
    const updates: PartialWithFieldValue<TaskDocument> = {};
    let hasUpdates = false;

    if (data.title !== undefined) {
      updates.title = data.title;
      hasUpdates = true;
    }
    if (data.description !== undefined) {
      updates.description = data.description;
      hasUpdates = true;
    }
    if (data.priority !== undefined) {
      updates.priority = data.priority;
      hasUpdates = true;
    }
    if (data.dueDate !== undefined) {
      updates.dueDate = data.dueDate ?
        Timestamp.fromDate(new Date(data.dueDate)) :
        null;
      hasUpdates = true;
    }
    if (data.tags !== undefined) {
      updates.tags = data.tags;
      hasUpdates = true;
    }
    if (data.approachParams !== undefined) {
      updates.approachParams = data.approachParams;
      hasUpdates = true;
    }
    if (data.pomodoroEstimatedMinutes !== undefined) {
      updates.pomodoroEstimatedMinutes = data.pomodoroEstimatedMinutes;
      hasUpdates = true;
    }

    if (!hasUpdates) {
      throw new HttpsError("invalid-argument", "No data to update.");
    }
    updates.updatedAt = FieldValue.serverTimestamp();

    try {
      await db.runTransaction(async (t) => {
        const taskDoc = await t.get(taskRef);
        if (!taskDoc.exists) {
          throw new HttpsError("not-found", "Task not found.");
        }
        const taskData = taskDoc.data() as TaskDocument;
        await assertPersonalWorkspaceOwner(taskData.workspaceId, uid);
        t.update(taskRef, updates);
      });

      const updatedDoc = await taskRef.get();
      const updatedData = updatedDoc.data() as TaskDocument;
      console.log(`[Tasks] Task ${taskId} updated.`);
      return {
        success: true,
        updatedTask: {
          id: updatedDoc.id,
          ...updatedData,
          createdAt: (
            updatedData.createdAt as Timestamp
          ).toDate().toISOString(),
          updatedAt: (
            updatedData.updatedAt as Timestamp
          ).toDate().toISOString(),
          dueDate: updatedData.dueDate ?
            (updatedData.dueDate as Timestamp).toDate().toISOString() :
            null,
          completedAt: updatedData.completedAt ?
            (updatedData.completedAt as Timestamp).toDate().toISOString() :
            null,
        },
      } as UpdateTaskResponse;
    } catch (e: any) {
      console.error(`[Tasks] Error updating task ${taskId}:`, e);
      if (e instanceof HttpsError) {
        throw e;
      }
      throw new HttpsError(
        "internal",
        "Failed to update task.",
        String(e?.message)
      );
    }
  }
);

export const updateTaskStatus = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request: CallableRequest<UpdateTaskStatusPayload>) => {
    const uid = assertAuthenticated(request.auth);
    const {taskId, newStatus, workspaceId} = request.data;

    if (!taskId || !newStatus || !workspaceId) {
      throw new HttpsError("invalid-argument", "Required fields missing.");
    }
    const taskRef = db.collection(TASKS_COLLECTION).doc(taskId);
    const now = FieldValue.serverTimestamp();
    try {
      let oldStatus: TaskStatusType | undefined;
      let taskInfoForEvent: Partial<
        Pick<TaskDocument, "title" | "assigneeUid" | "creatorUid">
      > | undefined;

      await db.runTransaction(async (t) => {
        const taskDoc = await t.get(taskRef);
        if (
          !taskDoc.exists ||
          (taskDoc.data() as TaskDocument).workspaceId !== workspaceId
        ) {
          throw new HttpsError("not-found", "Task not found or invalid ws.");
        }
        const currentTaskData = taskDoc.data() as TaskDocument;
        await assertPersonalWorkspaceOwner(currentTaskData.workspaceId, uid);
        oldStatus = currentTaskData.status;
        taskInfoForEvent = {
          title: currentTaskData.title,
          assigneeUid: currentTaskData.assigneeUid,
          creatorUid: currentTaskData.creatorUid,
        };
        const updatePayload: PartialWithFieldValue<TaskDocument> = {
          status: newStatus,
          updatedAt: now,
        };
        if (newStatus === "DONE" && oldStatus !== "DONE") {
          updatePayload.completedAt = now;
        } else if (newStatus !== "DONE" && oldStatus === "DONE") {
          updatePayload.completedAt = null;
        }
        t.update(taskRef, updatePayload);
      });

      const eventData: TaskStatusUpdatedEventData = {
        taskId,
        workspaceId,
        userId: uid,
        newStatus,
        oldStatus,
        completedAt:
          newStatus === "DONE" ? new Date().toISOString() : undefined,
        taskData: taskInfoForEvent,
      };
      await pubsub.topic(TASK_EVENTS_TOPIC).publishMessage({
        json: {
          eventType: "TASK_STATUS_UPDATED",
          data: eventData,
          eventTimestamp: new Date().toISOString(),
        },
      });
      console.log(
        `[Tasks] Status of task ${taskId} updated to ${newStatus}.`
      );
      return {
        success: true,
        message: "Статус задачи обновлен.",
      } as SuccessResponse;
    } catch (e: any) {
      console.error(
        `[Tasks] Error updating status for task ${taskId}:`,
        e
      );
      if (e instanceof HttpsError) {
        throw e;
      }
      throw new HttpsError(
        "internal",
        "Update status failed.",
        String(e?.message)
      );
    }
  }
);

export const deleteTask = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request: CallableRequest<DeleteTaskPayload>) => {
    const uid = assertAuthenticated(request.auth);
    const {taskId} = request.data;
    if (!taskId) {
      throw new HttpsError("invalid-argument", "TaskId is required.");
    }

    const taskRef = db.collection(TASKS_COLLECTION).doc(taskId);

    try {
      const taskDoc = await taskRef.get();
      if (!taskDoc.exists) {
        throw new HttpsError("not-found", "Task not found.");
      }

      const taskData = taskDoc.data() as TaskDocument;
      await assertPersonalWorkspaceOwner(taskData.workspaceId, uid);

      // Просто удаляем документ. Триггер сделает остальную работу.
      await taskRef.delete();

      console.log(
        `[Tasks] Task ${taskId} deletion initiated by user ${uid}.`
      );
      return {success: true, message: "Задача удалена."};
    } catch (e: any) {
      console.error(`[Tasks] Error deleting task ${taskId}:`, e);
      if (e instanceof HttpsError) {
        throw e;
      }
      throw new HttpsError("internal", "Failed to delete task.", e.message);
    }
  }
);

export const getTaskChanges = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<GetTaskChangesPayload>
  ): Promise<GetTaskChangesResponse> => {
    const uid = assertAuthenticated(request.auth);
    const {since, workspaceIds} = request.data;

    if (!Array.isArray(workspaceIds) || workspaceIds.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "Workspace IDs must be a non-empty array."
      );
    }
    if (!since) {
      throw new HttpsError(
        "invalid-argument",
        "A 'since' timestamp is required."
      );
    }

    // Проверяем права на все запрашиваемые РП
    for (const wsId of workspaceIds) {
      await assertPersonalWorkspaceOwner(wsId, uid);
    }

    const sinceTimestamp = Timestamp.fromDate(new Date(since));
    const serverTimestamp = Timestamp.now().toDate().toISOString();

    const updatedTasksPromise = db
      .collection(TASKS_COLLECTION)
      .where("workspaceId", "in", workspaceIds)
      .where("updatedAt", ">", sinceTimestamp)
      .get();

    const deletedTasksPromise = db
      .collection(DELETED_ENTITIES_COLLECTION)
      .where("entityType", "==", "task")
      .where("workspaceId", "in", workspaceIds)
      .where("deletedAt", ">", sinceTimestamp)
      .get();

    try {
      const [updatedSnapshot, deletedSnapshot] = await Promise.all([
        updatedTasksPromise,
        deletedTasksPromise,
      ]);

      const updatedTasks: TaskClientDto[] = updatedSnapshot.docs.map((doc) => {
        const data = doc.data() as TaskDocument;
        // eslint-disable-next-line max-len
        return {
          /* ...маппинг в TaskClientDto... */ id: doc.id,
          ...data,
        } as unknown as TaskClientDto;
      });

      const deletedTaskCloudIds = deletedSnapshot.docs.map((doc) => doc.id);

      console.info(
        `[Sync] Returning ${updatedTasks.length} updated and ` +
        `${deletedTaskCloudIds.length} deleted tasks for user ${uid}.`
      );

      return {
        updatedTasks,
        deletedTaskCloudIds,
        serverTimestamp,
      };
    } catch (error) {
      console.error(
        `[Sync] Error getting task changes for user ${uid}`,
        error
      );
      throw new HttpsError(
        "internal",
        "Ошибка получения изменений задач."
      );
    }
  }
);
