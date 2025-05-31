import {HttpsError, onCall} from "firebase-functions/v2/https";
import {
  getFirestore,
  FieldValue,
  Timestamp,
  Query,
  // DocumentData, // Не используется напрямую, Query покрывает
} from "firebase-admin/firestore";
import {
  runtimeOptsV2,
  TASKS_COLLECTION,
  WORKSPACES_COLLECTION,
  GLOBAL_STATISTICS_COLLECTION,
  TASK_EVENTS_TOPIC,
} from "../config";
import {assertAuthenticated, assertPersonalWorkspaceOwner} from "../utils";
import {
  TaskDataFromClient,
  TaskDocument,
  TaskStatusType,
  TaskStatusUpdatedEvent,
  WorkspaceDocument,
} from "../types";
import {PubSub} from "@google-cloud/pubsub";

const db = getFirestore();
const pubsub = new PubSub();

export const createTask = onCall(runtimeOptsV2, async (request) => {
  const uid = assertAuthenticated(request.auth);
  const data = request.data as TaskDataFromClient;

  if (!data.title || !data.workspaceId) {
    throw new HttpsError("invalid-argument", "Title & WorkspaceId required.");
  }
  const workspaceRef = db
    .collection(WORKSPACES_COLLECTION)
    .doc(data.workspaceId);
  const now = FieldValue.serverTimestamp();
  try {
    const taskData = await db.runTransaction(async (t) => {
      const workspaceDoc = await t.get(workspaceRef);
      if (!workspaceDoc.exists) {
        throw new HttpsError("not-found", "Workspace not found.");
      }
      const wsData = workspaceDoc.data() as WorkspaceDocument;

      if (!wsData.isPersonal || wsData.ownerUid !== uid) {
        throw new HttpsError("permission-denied", "Access denied.");
      }

      const newTaskData: Omit<TaskDocument, "id"> = {
        title: data.title,
        description: data.description || null,
        dueDate: data.dueDate ?
          Timestamp.fromDate(new Date(data.dueDate)) :
          null,
        status: "TODO",
        priority: data.priority || "MEDIUM",
        createdAt: now,
        updatedAt: now,
        creatorUid: uid,
        assigneeUid: uid,
        workspaceId: data.workspaceId,
        tags: data.tags || [],
        approachParams: data.approachParams || null,
        orderInList: 0,
        pomodoroEstimatedMinutes: data.pomodoroEstimatedMinutes || null,
        pomodoroEstimatedCycles: null,
        completedAt: null,
      };
      const taskRef = db.collection(TASKS_COLLECTION).doc();
      t.set(taskRef, newTaskData);
      const gsRef = db.collection(GLOBAL_STATISTICS_COLLECTION).doc(uid);
      t.update(gsRef, {
        totalTasksCreated: FieldValue.increment(1),
        lastActive: now,
      });
      return {taskId: taskRef.id, ...newTaskData};
    });

    return taskData;
  } catch (e: any) {
    console.error(`createTask error for user ${uid}:`, e.message);
    if (e instanceof HttpsError) {
      throw e;
    }
    throw new HttpsError("internal", "Failed to create task.", e.message);
  }
});

export const getTasksForWorkspace = onCall(
  runtimeOptsV2,
  async (request) => {
    const uid = assertAuthenticated(request.auth);
    const {
      workspaceId,
      statusFilter,
      sortBy,
      sortDirection,
    } = request.data as {
      workspaceId: string;
      statusFilter?: string;
      sortBy?: string;
      sortDirection?: "asc" | "desc";
    };
    if (!workspaceId) {
      throw new HttpsError("invalid-argument", "WorkspaceId required.");
    }
    try {
      await assertPersonalWorkspaceOwner(workspaceId, uid);

      let query: Query = db
        .collection(TASKS_COLLECTION)
        .where("workspaceId", "==", workspaceId);

      if (statusFilter && statusFilter !== "ALL") {
        query = query.where("status", "==", statusFilter);
      }
      if (sortBy) {
        query = query.orderBy(
          sortBy,
          sortDirection === "desc" ? "desc" : "asc"
        );
      } else {
        query = query.orderBy("createdAt", "desc");
      }
      const snap = await query.get();
      const tasks = snap.docs.map((doc) => ({id: doc.id, ...doc.data()}));
      return {tasks};
    } catch (e: any) {
      console.error(
        `getTasksForWorkspace for user ${uid}, ws ${workspaceId}:`,
        e.message
      );
      if (e instanceof HttpsError) {
        throw e;
      }
      throw new HttpsError("internal", "Failed to fetch tasks.", e.message);
    }
  }
);

export const updateTaskStatus = onCall(runtimeOptsV2, async (request) => {
  const uid = assertAuthenticated(request.auth);
  const {
    taskId,
    newStatus,
    workspaceId,
  } = request.data as {
    taskId: string;
    newStatus: TaskStatusType;
    workspaceId: string;
  };
  if (!taskId || !newStatus || !workspaceId) {
    throw new HttpsError("invalid-argument", "Required fields missing.");
  }
  if (!["TODO", "IN_PROGRESS", "DONE"].includes(newStatus)) {
    throw new HttpsError("invalid-argument", "Invalid newStatus value.");
  }
  const taskRef = db.collection(TASKS_COLLECTION).doc(taskId);
  const now = FieldValue.serverTimestamp();
  try {
    let oldStatus: TaskStatusType | undefined;
    await db.runTransaction(async (t) => {
      const taskDoc = await t.get(taskRef);
      if (
        !taskDoc.exists ||
        (taskDoc.data() as TaskDocument).workspaceId !== workspaceId
      ) {
        throw new HttpsError("not-found", "Task not found or invalid ws.");
      }

      await assertPersonalWorkspaceOwner(workspaceId, uid);

      oldStatus = (taskDoc.data() as TaskDocument).status as TaskStatusType;
      const updateData: Partial<TaskDocument> = {
        status: newStatus,
        updatedAt: now,
      };
      if (newStatus === "DONE" && oldStatus !== "DONE") {
        updateData.completedAt = now as Timestamp;
      } else if (newStatus !== "DONE" && oldStatus === "DONE") {
        updateData.completedAt = null;
      }
      t.update(taskRef, updateData);
    });
    const eventData: TaskStatusUpdatedEvent = {
      taskId,
      workspaceId,
      userId: uid,
      newStatus,
      oldStatus,
      completedAt: newStatus === "DONE" ? new Date().toISOString() : undefined,
      eventType: "TASK_STATUS_UPDATED",
    };
    await pubsub.topic(TASK_EVENTS_TOPIC).publishMessage({json: eventData});
    return {success: true, message: "Task status updated."};
  } catch (e: any) {
    console.error(`updateTaskStatus for task ${taskId}:`, e.message);
    if (e instanceof HttpsError) {
      throw e;
    }
    throw new HttpsError("internal", "Update task status failed.", e.message);
  }
});
