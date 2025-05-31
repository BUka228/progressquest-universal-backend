import {initializeApp} from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  Timestamp,
  Query,
} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {onMessagePublished} from "firebase-functions/v2/pubsub";
import {PubSub} from "@google-cloud/pubsub";
import * as functions from "firebase-functions/v1";

initializeApp();
const db = getFirestore();
const pubsub = new PubSub();

const region = "europe-west1";
const runtimeOpts = {region, memory: "256MiB" as const};

const USERS_COLLECTION = "users";
const WORKSPACES_COLLECTION = "workspaces";
const TASKS_COLLECTION = "tasks";
const POMODORO_SESSIONS_COLLECTION = "pomodoroSessions";
const GAMIFICATION_PROFILES_COLLECTION = "gamificationProfiles";
const GLOBAL_STATISTICS_COLLECTION = "globalStatistics";
const TASK_STATISTICS_COLLECTION = "taskStatistics";
const GAMIFICATION_HISTORY_COLLECTION = "gamificationHistory";

const USER_EVENTS_TOPIC = "user-events";
const TASK_EVENTS_TOPIC = "task-events";
const POMODORO_EVENTS_TOPIC = "pomodoro-events";

interface AppSettings {
  theme: "SYSTEM" | "LIGHT" | "DARK";
  dynamicColorEnabled: boolean;
  notificationsEnabled: boolean;
}
interface PomodoroSettings {
  focusDurationMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  intervalBeforeLongBreak: number;
  focusSoundUri: string | null;
  breakSoundUri: string | null;
  vibrationEnabled: boolean;
}
interface TeamMembershipEntry {
  teamId: string;
  teamName: string;
  userTeamRole: "admin" | "editor" | "member" | "viewer";
}
interface UserDocument {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Timestamp | FieldValue;
  lastLoginAt: Timestamp | FieldValue;
  personalWorkspaceId: string;
  activeItems: {
    workspaceId?: string | null;
    viewId?: string | null;
  };
  defaultViewId: string | null;
  appSettings: AppSettings;
  pomodoroSettings: PomodoroSettings;
  teamMemberships?: TeamMembershipEntry[];
}

interface WorkspaceDocument {
  name: string;
  description: string | null;
  ownerUid: string;
  isPersonal: boolean;
  teamId: string | null;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  activeApproach: string;
  defaultTags: string[];
  settings: {[key: string]: any};
}

interface WorkspaceClientResponse {
  id: string;
  name: string;
  description: string | null;
  ownerUid: string;
  isPersonal: boolean;
  teamId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  activeApproach: string;
  defaultTags: string[];
  settings: {[key: string]: any};
  userTeamRole?: "admin" | "editor" | "member" | "viewer";
}

interface TaskDataFromClient {
  title: string;
  workspaceId: string;
  description?: string | null;
  dueDate?: string | number;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  tags?: string[];
  approachParams?: {[key: string]: any};
  pomodoroEstimatedMinutes?: number | null;
}

interface PomodoroPhaseStartData {
  taskId: string;
  workspaceId: string;
  sessionType: "FOCUS" | "SHORT_BREAK" | "LONG_BREAK";
  plannedDurationSeconds: number;
  phaseNumberInCycle?: number;
  totalFocusSessionIndex?: number;
}

interface PomodoroPhaseCompleteData {
  sessionId: string;
  actualDurationSeconds: number;
  interruptions: number;
  completed: boolean;
}

interface TaskDocument {
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate: Timestamp | null;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  completedAt: Timestamp | null;
  creatorUid: string;
  assigneeUid: string | null;
  workspaceId: string;
  tags: string[];
  pomodoroEstimatedCycles: number | null;
  pomodoroEstimatedMinutes: number | null;
  approachParams: {
    calendar?: {
      eventId: string;
      isAllDay: boolean;
      recurrenceRule: string | null;
    };
    gtd?: {
      context: string;
      nextAction: boolean;
      projectLink: string | null;
      waitingFor: string | null;
    };
    eisenhower?: {
      urgency: number;
      importance: number;
    };
    frog?: {
      isFrog: boolean;
      difficulty: "EASY" | "MEDIUM" | "HARD";
    };
  } | null;
  orderInList: number;
}

interface PomodoroSessionDocument {
  userId: string;
  taskId: string;
  workspaceId: string;
  startTime: Timestamp | FieldValue;
  sessionType: "FOCUS" | "SHORT_BREAK" | "LONG_BREAK";
  plannedDurationSeconds: number;
  actualDurationSeconds: number;
  interruptions: number;
  completed: boolean;
  phaseNumberInCycle: number;
  totalFocusSessionIndex: number;
  updatedAt?: Timestamp | FieldValue;
}

interface GamificationProfileDocument {
  level: number;
  experience: number;
  coins: number;
  maxExperienceForLevel: number;
  currentStreak: number;
  lastClaimedDate: Timestamp;
  maxStreak: number;
  selectedPlantId: string | null;
}

interface TaskStatisticsDocument {
  completionTime: Timestamp | null;
  timeSpentSeconds: number;
  totalPomodoroFocusSeconds: number;
  completedPomodoroFocusSessions: number;
  totalPomodoroInterrupts: number;
  wasCompletedOnce: boolean;
  firstCompletionTime: Timestamp | null;
  updatedAt: Timestamp | FieldValue;
}

interface GlobalStatisticsDocument {
  userId: string;
  totalWorkspacesCreated: number;
  totalTasksCreated: number;
  totalTasksCompleted: number;
  totalPomodoroFocusMinutes: number;
  totalTimeSpentMinutesOverall: number;
  lastActive: Timestamp | FieldValue;
}

interface GamificationHistoryEntry {
  userId: string;
  timestamp: Timestamp | FieldValue;
  eventType: string;
  xpChange: number;
  coinsChange: number;
  relatedEntityId: string | null;
  description: string | null;
}

interface UserCreatedEvent {
  userId: string;
  email?: string;
  displayName?: string;
}
interface PomodoroPhaseCompletedEvent {
  sessionId: string;
  userId: string;
  taskId: string;
  workspaceId: string;
  phaseType: "FOCUS" | "SHORT_BREAK" | "LONG_BREAK";
  plannedDurationSeconds: number;
  actualDurationSeconds: number;
  interruptions: number;
  completed: boolean;
  phaseStartTime: string;
  completionTime: string;
}

type TaskStatusType = "TODO" | "IN_PROGRESS" | "DONE";

interface TaskStatusUpdatedEvent {
  taskId: string;
  workspaceId: string;
  userId: string;
  newStatus: TaskStatusType;
  oldStatus?: TaskStatusType;
  completedAt?: string;
  taskData?: TaskDocument;
}

export const processNewUser = functions
  .region("europe-west1")
  .auth.user()
  .onCreate(async (user) => {
    const {uid, email, displayName, photoURL, metadata} = user;
    const now = FieldValue.serverTimestamp();

    const creationTime = metadata.creationTime ?
      new Date(metadata.creationTime) :
      new Date();
    const lastSignInTime = metadata.lastSignInTime ?
      new Date(metadata.lastSignInTime) :
      new Date();

    console.log(`Processing new user: ${uid}, Email: ${email}`);

    const userDocRef = db.collection(USERS_COLLECTION).doc(uid);
    const gamificationProfileRef = db
      .collection(GAMIFICATION_PROFILES_COLLECTION)
      .doc(uid);
    const globalStatsRef = db
      .collection(GLOBAL_STATISTICS_COLLECTION)
      .doc(uid);
    const personalWorkspaceRef = db
      .collection(WORKSPACES_COLLECTION)
      .doc();

    const batch = db.batch();

    const newUserDoc: UserDocument = {
      uid,
      email: email || "",
      displayName: displayName || `User-${uid.substring(0, 5)}`,
      avatarUrl: photoURL || null,
      createdAt: Timestamp.fromDate(creationTime),
      lastLoginAt: Timestamp.fromDate(lastSignInTime),
      personalWorkspaceId: personalWorkspaceRef.id,
      activeItems: {workspaceId: personalWorkspaceRef.id},
      defaultViewId: null,
      appSettings: {
        theme: "SYSTEM",
        dynamicColorEnabled: true,
        notificationsEnabled: true,
      },
      pomodoroSettings: {
        focusDurationMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        intervalBeforeLongBreak: 4,
        focusSoundUri: null,
        breakSoundUri: null,
        vibrationEnabled: true,
      },
      teamMemberships: [],
    };
    batch.set(userDocRef, newUserDoc);

    batch.set(personalWorkspaceRef, {
      name: "Личное пространство",
      description: "Мои задачи и проекты",
      ownerUid: uid,
      isPersonal: true,
      teamId: null,
      createdAt: now,
      updatedAt: now,
      activeApproach: "CALENDAR",
      defaultTags: ["важно", "идея"],
      settings: {},
    } as Omit<WorkspaceDocument, "id">);

    batch.set(gamificationProfileRef, {
      level: 1,
      experience: 0,
      coins: 50,
      maxExperienceForLevel: 100,
      currentStreak: 0,
      lastClaimedDate: Timestamp.fromDate(new Date(0)),
      maxStreak: 0,
      selectedPlantId: null,
    } as GamificationProfileDocument);

    batch.set(globalStatsRef, {
      userId: uid,
      totalWorkspacesCreated: 1,
      totalTasksCreated: 0,
      totalTasksCompleted: 0,
      totalPomodoroFocusMinutes: 0,
      totalTimeSpentMinutesOverall: 0,
      lastActive: now,
    } as GlobalStatisticsDocument);

    try {
      await batch.commit();
      console.log(`User documents created for UID: ${uid}`);
      const eventData: UserCreatedEvent = {
        userId: uid,
        email: email || undefined,
        displayName: displayName || undefined,
      };
      await pubsub.topic(USER_EVENTS_TOPIC).publishMessage({json: eventData});
      console.log(`Event USER_CREATED published for UID: ${uid}`);
    } catch (error) {
      console.error(`Error in onUserCreate for UID: ${uid}`, error);
      throw error;
    }
  });

export const getUserWorkspaces = onCall(runtimeOpts, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Auth required.");
  }
  const userUID = request.auth.uid;
  const workspaces: WorkspaceClientResponse[] = [];
  try {
    const personalSnapshot = await db.collection(WORKSPACES_COLLECTION)
      .where("ownerUid", "==", userUID)
      .where("isPersonal", "==", true)
      .orderBy("createdAt", "desc")
      .get();

    personalSnapshot.docs.forEach((doc) => {
      const data = doc.data() as WorkspaceDocument;
      workspaces.push({
        id: doc.id,
        name: data.name || "Без названия",
        description: data.description || null,
        ownerUid: data.ownerUid,
        isPersonal: data.isPersonal,
        teamId: data.teamId || null,
        createdAt: data.createdAt as Timestamp || Timestamp.now(),
        updatedAt: data.updatedAt as Timestamp || Timestamp.now(),
        activeApproach: data.activeApproach || "CALENDAR",
        defaultTags: data.defaultTags || [],
        settings: data.settings || {},
      });
    });
    return {workspaces};
  } catch (e: any) {
    console.error("getUserWorkspaces error:", e.message);
    throw new HttpsError("internal", "Failed to fetch workspaces.", e.message);
  }
});

export const createTask = onCall(runtimeOpts, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Auth required.");
  }
  const uid = request.auth.uid;
  const data = request.data as TaskDataFromClient;

  if (!data.title || !data.workspaceId) {
    throw new HttpsError("invalid-argument", "Title & WorkspaceId required.");
  }
  const workspaceRef =
    db.collection(WORKSPACES_COLLECTION).doc(data.workspaceId);
  const now = FieldValue.serverTimestamp();
  try {
    const taskData = await db.runTransaction(async (t) => {
      const workspaceDoc = await t.get(workspaceRef);
      if (!workspaceDoc.exists ||
          !(workspaceDoc.data() as WorkspaceDocument).isPersonal ||
          (workspaceDoc.data() as WorkspaceDocument).ownerUid !== uid) {
        throw new HttpsError("permission-denied", "Workspace access denied.");
      }
      const newTaskData = {
        title: data.title,
        description: data.description || null,
        dueDate: data.dueDate ?
          Timestamp.fromDate(new Date(data.dueDate)) : null,
        status: "TODO",
        priority: data.priority || "MEDIUM",
        createdAt: now,
        updatedAt: now,
        creatorUid: uid,
        assigneeUid: uid,
        workspaceId: data.workspaceId,
        tags: data.tags || [],
        approachParams: data.approachParams || {},
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
    console.error("createTask error:", e.message);
    if (e instanceof HttpsError) throw e;
    throw new HttpsError("internal", "Failed to create task.", e.message);
  }
});

export const getTasksForWorkspace = onCall(runtimeOpts, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Auth required.");
  }
  const uid = request.auth.uid;
  const {
    workspaceId, statusFilter, sortBy, sortDirection,
  } = request.data as {
    workspaceId: string,
    statusFilter?: string,
    sortBy?: string,
    sortDirection?: "asc" | "desc"
  };
  if (!workspaceId) {
    throw new HttpsError("invalid-argument", "WorkspaceId required.");
  }
  try {
    const wsDoc = await db.collection(WORKSPACES_COLLECTION)
      .doc(workspaceId)
      .get();
    if (!wsDoc.exists ||
        !(wsDoc.data() as WorkspaceDocument).isPersonal ||
        (wsDoc.data() as WorkspaceDocument).ownerUid !== uid) {
      throw new HttpsError("permission-denied", "Access to workspace denied.");
    }
    let query: Query = db.collection(TASKS_COLLECTION)
      .where("workspaceId", "==", workspaceId);

    if (statusFilter && statusFilter !== "ALL") {
      query = query.where("status", "==", statusFilter);
    }
    if (sortBy) {
      query = query.orderBy(sortBy,
        sortDirection === "desc" ? "desc" : "asc");
    } else {
      query = query.orderBy("createdAt", "desc");
    }
    const snap = await query.get();
    const tasks = snap.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    return {tasks};
  } catch (e: any) {
    console.error("getTasksForWorkspace error:", e.message);
    if (e instanceof HttpsError) throw e;
    throw new HttpsError("internal", "Failed to fetch tasks.", e.message);
  }
});

export const updateTaskStatus = onCall(runtimeOpts, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Auth required.");
  }
  const uid = request.auth.uid;
  const {
    taskId,
    newStatus,
    workspaceId,
  } = request.data as {
    taskId: string,
    newStatus: TaskStatusType,
    workspaceId: string
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
      if (!taskDoc.exists ||
          (taskDoc.data() as TaskDocument).workspaceId !== workspaceId) {
        throw new HttpsError("not-found", "Task not found or invalid ws.");
      }
      const taskCurrentData = taskDoc.data() as TaskDocument;
      oldStatus = taskCurrentData.status as TaskStatusType;

      const updateData: any = {status: newStatus, updatedAt: now};
      if (newStatus === "DONE" && oldStatus !== "DONE") {
        updateData.completedAt = now;
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
    };
    await pubsub.topic(TASK_EVENTS_TOPIC).publishMessage({json: eventData});
    return {success: true, message: "Task status updated."};
  } catch (e: any) {
    console.error("updateTaskStatus error:", e.message);
    if (e instanceof HttpsError) throw e;
    throw new HttpsError("internal", "Update task status failed.", e.message);
  }
});

export const startPomodoroPhase = onCall(runtimeOpts, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Auth required.");
  }
  const uid = request.auth.uid;
  const data = request.data as PomodoroPhaseStartData;
  if (!data.taskId || !data.workspaceId || !data.sessionType ||
      data.plannedDurationSeconds == null) {
    throw new HttpsError("invalid-argument", "Missing fields for pomodoro.");
  }
  const newSession = {
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
    const sessionRef = await db.collection(POMODORO_SESSIONS_COLLECTION)
      .add(newSession);
    return {sessionId: sessionRef.id};
  } catch (e: any) {
    console.error("startPomodoroPhase error:", e.message);
    throw new HttpsError("internal", "Pomodoro start failed.", e.message);
  }
});

export const completePomodoroPhase = onCall(runtimeOpts, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Auth required.");
  }
  const uid = request.auth.uid;
  const data = request.data as PomodoroPhaseCompleteData;
  if (!data.sessionId || data.actualDurationSeconds == null ||
      data.interruptions == null || data.completed == null) {
    throw new HttpsError("invalid-argument", "Missing fields for completion.");
  }
  const sessionRef =
    db.collection(POMODORO_SESSIONS_COLLECTION).doc(data.sessionId);
  try {
    let phaseDataForEvent: PomodoroPhaseCompletedEvent | null = null;
    await db.runTransaction(async (t) => {
      const sessionDoc = await t.get(sessionRef);
      if (!sessionDoc.exists ||
          (sessionDoc.data() as PomodoroSessionDocument).userId !== uid) {
        throw new HttpsError("permission-denied", "Cannot complete session.");
      }
      const s = sessionDoc.data() as PomodoroSessionDocument;
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
      };
    });
    if (phaseDataForEvent) {
      await pubsub.topic(POMODORO_EVENTS_TOPIC)
        .publishMessage({json: phaseDataForEvent});
    }
    return {success: true, message: "Pomodoro phase processed."};
  } catch (e: any) {
    console.error("completePomodoroPhase error:", e.message);
    if (e instanceof HttpsError) throw e;
    throw new HttpsError("internal", "Failed to complete phase.", e.message);
  }
});

export const onPomodoroEvent = onMessagePublished(
  {topic: POMODORO_EVENTS_TOPIC, ...runtimeOpts},
  async (event) => {
    if (!event.data.message?.json) {
      console.warn(
        `[${POMODORO_EVENTS_TOPIC}] Missing JSON in message.`,
        event.id
      );
      return;
    }

    const phaseEvent = event.data.message.json as PomodoroPhaseCompletedEvent;
    console.log(
      `[${POMODORO_EVENTS_TOPIC}] Processing event for sessionId:`,
      phaseEvent.sessionId,
      "Payload:", JSON.stringify(phaseEvent)
    );

    const {
      userId,
      taskId,
      phaseType,
      actualDurationSeconds,
      completed,
    } = phaseEvent;

    const MIN_FOCUS_DURATION_FOR_REWARD_SECONDS = 60;

    if (
      phaseType !== "FOCUS" ||
      !completed ||
      actualDurationSeconds < MIN_FOCUS_DURATION_FOR_REWARD_SECONDS
    ) {
      console.log(
        `[${POMODORO_EVENTS_TOPIC}] Skipping gam/stats: non-focus.` +
        ` Incomplete/too short. SessionId: ${phaseEvent.sessionId}, ` +
        `Type: ${phaseType}, Completed: ${completed}, ` +
        `Duration: ${actualDurationSeconds}s`
      );
      return;
    }

    const batch = db.batch();
    const now = FieldValue.serverTimestamp();

    const taskStatsRef = db.collection(TASK_STATISTICS_COLLECTION).doc(taskId);
    batch.set(taskStatsRef, {
      totalPomodoroFocusSeconds: FieldValue.increment(actualDurationSeconds),
      completedPomodoroFocusSessions: FieldValue.increment(1),
      updatedAt: now,
    } as unknown as Partial<TaskStatisticsDocument>, {merge: true});

    const gamificationProfileRef =
      db.collection(GAMIFICATION_PROFILES_COLLECTION).doc(userId);

    const minutesInFocus = Math.floor(actualDurationSeconds / 60);
    const xpAwarded = minutesInFocus * 1;
    const coinsAwarded = Math.floor(xpAwarded / 5);

    if (xpAwarded > 0) {
      batch.update(gamificationProfileRef, {
        experience: FieldValue.increment(xpAwarded),
        coins: FieldValue.increment(coinsAwarded),
      });
    }

    const globalStatsRef =
      db.collection(GLOBAL_STATISTICS_COLLECTION).doc(userId);
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
        description: "Завершена Pomodoro-фокус сессия " +
                `(${minutesInFocus} мин) для задачи.`,
      } as GamificationHistoryEntry);
    }

    try {
      await batch.commit();
      console.log(
        `[${POMODORO_EVENTS_TOPIC}] Gam/stats updated OK.` +
        `for pomodoro session: ${phaseEvent.sessionId}`
      );
    } catch (error) {
      console.error(
        `[${POMODORO_EVENTS_TOPIC}] Error updating gamification/stats ` +
        `for pomodoro session ${phaseEvent.sessionId}:`, error
      );
      throw error;
    }
  }
);

export const onTaskEvent = onMessagePublished(
  {topic: TASK_EVENTS_TOPIC, ...runtimeOpts},
  async (event) => {
    if (!event.data.message?.json) {
      console.warn("PubSub: No JSON in message.");
      return;
    }
    const taskEvent = event.data.message.json as TaskStatusUpdatedEvent;
    console.log("Processing TASK_EVENT:", taskEvent.taskId);

    const {taskId, userId, newStatus, completedAt} = taskEvent;
    if (newStatus !== "DONE") {
      console.log(`Task ${taskId} not 'DONE', skipping.`);
      return;
    }
    const batch = db.batch();
    const now = FieldValue.serverTimestamp();
    const taskStatsRef = db.collection(TASK_STATISTICS_COLLECTION).doc(taskId);

    await db.runTransaction(async (t) => {
      const statDoc = await t.get(taskStatsRef);
      const updateData: any = {
        completionTime: completedAt ?
          Timestamp.fromDate(new Date(completedAt)) : now,
        wasCompletedOnce: true,
        updatedAt: now,
      };
      if (!statDoc.exists || !statDoc.data()?.wasCompletedOnce) {
        updateData.firstCompletionTime = updateData.completionTime;
      }
      t.set(taskStatsRef, updateData, {merge: true});
    });

    const gfnProfileRef =
      db.collection(GAMIFICATION_PROFILES_COLLECTION).doc(userId);
    const xpForTask = 50;
    const coinsForTask = 10;
    batch.update(gfnProfileRef, {
      experience: FieldValue.increment(xpForTask),
      coins: FieldValue.increment(coinsForTask),
    });
    const gsRef = db.collection(GLOBAL_STATISTICS_COLLECTION).doc(userId);
    batch.update(gsRef, {
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
    });
    try {
      await batch.commit();
      console.log(`Gfn/stats for task ${taskId} done.`);
    } catch (e: any) {
      console.error(`Err Gfn/stats task ${taskId}:`, e.message);
    }
  }
);
