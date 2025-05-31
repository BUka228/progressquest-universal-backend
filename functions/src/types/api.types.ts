import {Timestamp} from "firebase-admin/firestore";
import {
  TeamDocument,
  WorkspaceDocument,
  TaskDocument,
  UserViewDocument,
  ChallengeDefinitionDocument,
} from "./firestore.types";

export interface SuccessResponse {
  success: boolean;
  message?: string;
}

export interface UpdateUserProfilePayload {
  displayName?: string;
  avatarUrl?: string;
}
export interface UpdateUserAppSettingsPayload {
  theme?: "SYSTEM" | "LIGHT" | "DARK";
  dynamicColorEnabled?: boolean;
  notificationsEnabled?: boolean;
}
export interface UpdateUserPomodoroSettingsPayload {
  focusDurationMinutes?: number;
  shortBreakMinutes?: number;
  longBreakMinutes?: number;
  intervalBeforeLongBreak?: number;
  focusSoundUri?: string | null;
  breakSoundUri?: string | null;
  vibrationEnabled?: boolean;
}
export interface UpdateUserActiveItemsPayload {
  workspaceId?: string | null;
  viewId?: string | null;
}

export interface CreateTeamPayload {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  defaultMemberRole?: "member" | "viewer";
}
export interface TeamResponse
  extends Omit<TeamDocument, "createdAt" | "updatedAt"> {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
export interface AddTeamMemberPayload {
  userEmailOrUid: string;
  role: "admin" | "editor" | "member" | "viewer";
}
export interface UpdateTeamMemberPayload {
  role: "admin" | "editor" | "member" | "viewer";
}

export interface WorkspaceClientResponse
  extends Omit<WorkspaceDocument, "createdAt" | "updatedAt"> {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userTeamRole?: "admin" | "editor" | "member" | "viewer";
  userWorkspaceRole?: "owner" | "admin" | "editor" | "member" | "viewer";
}
export type WorkspaceListResponse = {
  workspaces: WorkspaceClientResponse[];
};

export interface CreateWorkspacePayload {
  name: string;
  description?: string | null;
  isPersonal: boolean;
  teamId?: string | null;
  activeApproach?: string;
  defaultTags?: string[];
}
export interface UpdateWorkspacePayload {
  name?: string;
  description?: string | null;
  activeApproach?: string;
  defaultTags?: string[];
  settings?: {[key: string]: any};
}

export interface TaskDataFromClient {
  workspaceId: string;
  title: string;
  description?: string | null;
  dueDate?: string | number;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assigneeUid?: string | null;
  tags?: string[];
  approachParams?: {[key: string]: any};
  pomodoroEstimatedMinutes?: number | null;
}
export interface TaskResponse
  extends Omit<
    TaskDocument,
    "createdAt" | "updatedAt" | "dueDate" | "completedAt"
  > {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  dueDate: Timestamp | null;
  completedAt: Timestamp | null;
}
export type TaskListResponse = {
  tasks: TaskResponse[];
};

export type UpdateTaskStatusPayload = {
  newStatus: "TODO" | "IN_PROGRESS" | "DONE";
  workspaceId: string;
};
export interface CreateCommentPayload {
  text: string;
}

export interface PomodoroPhaseStartData {
  taskId: string;
  workspaceId: string;
  sessionType: "FOCUS" | "SHORT_BREAK" | "LONG_BREAK";
  plannedDurationSeconds: number;
  phaseNumberInCycle?: number;
  totalFocusSessionIndex?: number;
}
export interface StartPomodoroPhaseResponse {
  sessionId: string;
}
export interface PomodoroPhaseCompleteData {
  sessionId: string;
  actualDurationSeconds: number;
  interruptions: number;
  completed: boolean;
}

export type CreateUserViewPayload = Omit<
  UserViewDocument,
  "uid" | "id" | "createdAt" | "updatedAt"
>;
export type UpdateUserViewPayload = Partial<CreateUserViewPayload>;
export interface UserViewResponse
  extends Omit<UserViewDocument, "createdAt" | "updatedAt"> {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
export type UserViewListResponse = {
  views: UserViewResponse[];
};

export type AggregatedTasksRequestFiltersType = UserViewDocument["filters"];

export interface AggregatedTasksRequestPayload {
  workspaceIds: string[];
  filters?: AggregatedTasksRequestFiltersType;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export type CreateCustomChallengePayload = Omit<
  ChallengeDefinitionDocument,
  | "id"
  | "creatorUid"
  | "scope"
  | "targetEntityId"
  | "isActiveGlobally"
  | "createdAt"
>;
export type UpdateCustomChallengePayload = Partial<
  CreateCustomChallengePayload
>;
