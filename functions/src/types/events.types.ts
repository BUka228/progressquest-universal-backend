import {TaskDocument, TaskStatusType} from "./firestore.types";

export interface UserCreatedEvent {
  userId: string;
  email?: string;
  displayName?: string;
  eventType: "USER_CREATED";
}

export interface UserProfileUpdatedEvent {
  userId: string;
  updatedFields: string[];
  eventType: "USER_PROFILE_UPDATED";
}

export interface TeamEventBase {
  teamId: string;
}
export interface TeamCreatedEvent extends TeamEventBase {
  ownerUid: string;
  teamName: string;
  eventType: "TEAM_CREATED";
}

export interface WorkspaceEventBase {
  workspaceId: string;
}
export interface WorkspaceCreatedEvent extends WorkspaceEventBase {
  ownerUid: string;
  teamId: string | null;
  isPersonal: boolean;
  workspaceName: string;
  eventType: "WORKSPACE_CREATED";
}

export interface TaskEventBase {
  taskId: string;
  workspaceId: string;
}
export interface TaskCreatedEvent extends TaskEventBase {
  creatorUid: string;
  assigneeUid: string | null;
  title: string;
  eventType: "TASK_CREATED";
}
export interface TaskUpdatedEvent extends TaskEventBase {
  updaterUid: string;
  changedFields: {[key: string]: {old: any; new: any}};
  eventType: "TASK_UPDATED";
}
export interface TaskStatusUpdatedEvent extends TaskEventBase {
  userId: string;
  newStatus: TaskStatusType;
  oldStatus?: TaskStatusType;
  completedAt?: string;
  taskData?: Partial<TaskDocument>;
  eventType: "TASK_STATUS_UPDATED";
}

export interface PomodoroPhaseStartedEvent {
  sessionId: string;
  userId: string;
  taskId: string;
  workspaceId: string;
  phaseType: "FOCUS" | "SHORT_BREAK" | "LONG_BREAK";
  plannedDurationSeconds: number;
  phaseNumberInCycle: number;
  totalFocusSessionIndex: number;
  startTime: string;
  eventType: "POMODORO_PHASE_STARTED";
}
export interface PomodoroPhaseCompletedEvent {
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
  eventType: "POMODORO_PHASE_COMPLETED";
}

export interface GamificationPointsAwardedEvent {
  userId: string;
  xpAmount?: number;
  coinsAmount?: number;
  reason: string;
  relatedEntityId?: string;
  timestamp: string;
  eventType: "POINTS_AWARDED";
}
