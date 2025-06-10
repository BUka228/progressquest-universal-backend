import {
  TaskDocument,
  TaskStatusType,
  PomodoroSessionType,
  ChallengeScopeType,
  ChallengeRewardType,
  TeamMemberDocument,
  WorkspaceMemberDocument,
  GamificationHistoryEventType,
  WorkspaceDocument,
  TeamDocument,
  UserDocument,
} from "./firestore.types";

export interface BaseEvent {
  eventType: string;
  eventTimestamp: string;
  traceId?: string; // Опционально, для сквозной трассировки
}

// --- 1. User Events (Топик: user-events) ---
export interface UserCreatedEventData {
  userId: string;
  email?: string | null;
  displayName?: string | null;
}
export interface UserCreatedEvent extends BaseEvent {
  eventType: "USER_CREATED";
  data: UserCreatedEventData;
}

export interface UserProfileUpdatedEventData {
  userId: string;
  updatedFields: Array<keyof UserDocument>;
}
export interface UserProfileUpdatedEvent extends BaseEvent {
  eventType: "USER_PROFILE_UPDATED";
  data: UserProfileUpdatedEventData;
}

export interface UserDeletedEventData {
  userId: string;
}
export interface UserDeletedEvent extends BaseEvent {
  eventType: "USER_DELETED";
  data: UserDeletedEventData;
}

// --- 2. Team Events (Топик: team-events) ---
export interface TeamEventBaseData {
  teamId: string;
}

export interface TeamCreatedEventData extends TeamEventBaseData {
  ownerUid: string;
  teamName: string;
}
export interface TeamCreatedEvent extends BaseEvent {
  eventType: "TEAM_CREATED";
  data: TeamCreatedEventData;
}

export interface TeamUpdatedEventData extends TeamEventBaseData {
  updatedFields: Array<keyof TeamDocument>;
}
export interface TeamUpdatedEvent extends BaseEvent {
  eventType: "TEAM_UPDATED";
  data: TeamUpdatedEventData;
}

export type TeamDeletedEventData = TeamEventBaseData;
export interface TeamDeletedEvent extends BaseEvent {
  eventType: "TEAM_DELETED";
  data: TeamDeletedEventData;
}

export interface TeamMemberAddedEventData extends TeamEventBaseData {
  userId: string;
  userTeamRole: TeamMemberDocument["role"];
  addedByUid: string;
}
export interface TeamMemberAddedEvent extends BaseEvent {
  eventType: "TEAM_MEMBER_ADDED";
  data: TeamMemberAddedEventData;
}

export interface TeamMemberRemovedEventData extends TeamEventBaseData {
  userId: string;
  removedByUid: string;
}
export interface TeamMemberRemovedEvent extends BaseEvent {
  eventType: "TEAM_MEMBER_REMOVED";
  data: TeamMemberRemovedEventData;
}

export interface TeamMemberRoleUpdatedEventData extends TeamEventBaseData {
  userId: string;
  newTeamRole: TeamMemberDocument["role"];
  oldTeamRole: TeamMemberDocument["role"];
  updatedByUid: string;
}
export interface TeamMemberRoleUpdatedEvent extends BaseEvent {
  eventType: "TEAM_MEMBER_ROLE_UPDATED";
  data: TeamMemberRoleUpdatedEventData;
}

// --- 3. Workspace Events (Топик: workspace-events) ---
export interface WorkspaceEventBaseData {
  workspaceId: string;
}

export interface WorkspaceCreatedEventData extends WorkspaceEventBaseData {
  ownerUid: string;
  teamId: string | null;
  isPersonal: boolean;
  workspaceName: string;
}
export interface WorkspaceCreatedEvent extends BaseEvent {
  eventType: "WORKSPACE_CREATED";
  data: WorkspaceCreatedEventData;
}

export interface WorkspaceUpdatedEventData extends WorkspaceEventBaseData {
  updatedFields: Array<keyof WorkspaceDocument>;
  updatedByUid: string;
}
export interface WorkspaceUpdatedEvent extends BaseEvent {
  eventType: "WORKSPACE_UPDATED";
  data: WorkspaceUpdatedEventData;
}

export interface WorkspaceDeletedEventData extends WorkspaceEventBaseData {
  teamId: string | null;
  deletedByUid: string;
}
export interface WorkspaceDeletedEvent extends BaseEvent {
  eventType: "WORKSPACE_DELETED";
  data: WorkspaceDeletedEventData;
}

export interface WorkspaceMemberAddedEventData extends WorkspaceEventBaseData {
  userId: string;
  workspaceRole: WorkspaceMemberDocument["workspaceRole"];
  teamId: string | null;
  addedByUid: string;
}
export interface WorkspaceMemberAddedEvent extends BaseEvent {
  eventType: "WORKSPACE_MEMBER_ADDED";
  data: WorkspaceMemberAddedEventData;
}

// --- 4. Task Events (Топик: task-events) ---
export interface TaskEventBaseData {
  taskId: string;
  workspaceId: string;
}

export interface TaskCreatedEventData extends TaskEventBaseData {
  creatorUid: string;
  assigneeUid: string | null;
  title: string;
}
export interface TaskCreatedEvent extends BaseEvent {
  eventType: "TASK_CREATED";
  data: TaskCreatedEventData;
}

export interface TaskUpdatedEventData extends TaskEventBaseData {
  updaterUid: string;
  changedFields: Partial<TaskDocument>;
  previousValues?: Partial<TaskDocument>;
}
export interface TaskUpdatedEvent extends BaseEvent {
  eventType: "TASK_UPDATED";
  data: TaskUpdatedEventData;
}

export interface TaskStatusUpdatedEventData {
  taskId: string;
  workspaceId: string;
  userId: string;
  newStatus: TaskStatusType;
  oldStatus?: TaskStatusType;
  completedAt?: string;
  taskData?: Partial<
    Pick<TaskDocument, "title" | "assigneeUid" | "creatorUid">
  >;
}
export interface TaskStatusUpdatedEventMessage extends BaseEvent {
  eventType: "TASK_STATUS_UPDATED";
  data: TaskStatusUpdatedEventData;
}

export interface TaskDeletedEventData extends TaskEventBaseData {
  deleterUid: string;
}
export interface TaskDeletedEvent extends BaseEvent {
  eventType: "TASK_DELETED";
  data: TaskDeletedEventData;
}

export interface TaskAssignedEventData extends TaskEventBaseData {
  newAssigneeUid: string | null;
  oldAssigneeUid: string | null;
  assignerUid: string;
}
export interface TaskAssignedEvent extends BaseEvent {
  eventType: "TASK_ASSIGNED";
  data: TaskAssignedEventData;
}

export interface TaskCommentAddedEventData extends TaskEventBaseData {
  commentId: string;
  authorUid: string;
  text: string;
}
export interface TaskCommentAddedEvent extends BaseEvent {
  eventType: "TASK_COMMENT_ADDED";
  data: TaskCommentAddedEventData;
}

// --- 5. Pomodoro Events (Топик: pomodoro-events) ---
export interface PomodoroPhaseStartedEventData {
  sessionId: string;
  userId: string;
  taskId: string;
  workspaceId: string;
  phaseType: PomodoroSessionType;
  plannedDurationSeconds: number;
  phaseNumberInCycle: number;
  totalFocusSessionIndex: number;
  startTime: string;
}
export interface PomodoroPhaseStartedEvent extends BaseEvent {
  eventType: "POMODORO_PHASE_STARTED";
  data: PomodoroPhaseStartedEventData;
}

export interface PomodoroPhaseCompletedEventData {
  sessionId: string;
  userId: string;
  taskId: string;
  workspaceId: string;
  phaseType: PomodoroSessionType;
  plannedDurationSeconds: number;
  actualDurationSeconds: number;
  interruptions: number;
  completed: boolean;
  phaseStartTime: string;
  completionTime: string;
}
export interface PomodoroPhaseCompletedEventMessage extends BaseEvent {
  eventType: "POMODORO_PHASE_COMPLETED";
  data: PomodoroPhaseCompletedEventData;
}

// --- 6. Gamification Events (Топик: gamification-events, если нужен) ---
export interface PointsAwardedEventData {
  userId: string;
  xpAmount?: number;
  coinsAmount?: number;
  reason: GamificationHistoryEventType;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
}
export interface PointsAwardedEvent extends BaseEvent {
  eventType: "POINTS_AWARDED";
  data: PointsAwardedEventData;
}

export interface LevelUpEventData {
  userId: string;
  newLevel: number;
  oldLevel: number;
}
export interface LevelUpEvent extends BaseEvent {
  eventType: "LEVEL_UP";
  data: LevelUpEventData;
}

export interface BadgeEarnedEventData {
  userId: string;
  badgeDefinitionId: string;
  badgeName: string;
}
export interface BadgeEarnedEvent extends BaseEvent {
  eventType: "BADGE_EARNED";
  data: BadgeEarnedEventData;
}

export interface ChallengeProgressUpdateData {
  challengeDefinitionId: string;
  progress: {[key: string]: number} | number;
  isCompleted: boolean;
}
export interface ChallengeProgressUpdatedEventData {
  userId: string;
  challenge: ChallengeProgressUpdateData;
  scope: ChallengeScopeType;
  targetEntityId?: string | null;
}
export interface ChallengeProgressUpdatedEvent extends BaseEvent {
  eventType: "CHALLENGE_PROGRESS_UPDATED";
  data: ChallengeProgressUpdatedEventData;
}

export interface ChallengeCompletedEventData {
  userId: string;
  challengeDefinitionId: string;
  challengeName: string;
  scope: ChallengeScopeType;
  targetEntityId?: string | null;
  rewardApplied?: {type: ChallengeRewardType; value: string};
}
export interface ChallengeCompletedEvent extends BaseEvent {
  eventType: "CHALLENGE_COMPLETED";
  data: ChallengeCompletedEventData;
}

export interface PlantGrownStageUpEventData {
  userId: string;
  plantInstanceId: string;
  newStage: number;
  plantType: string;
}
export interface PlantGrownStageUpEvent extends BaseEvent {
  eventType: "PLANT_GROWN_STAGE_UP";
  data: PlantGrownStageUpEventData;
}
