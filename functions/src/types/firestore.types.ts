import {FieldValue, Timestamp} from "firebase-admin/firestore";

export interface AppSettings {
  theme: "SYSTEM" | "LIGHT" | "DARK";
  dynamicColorEnabled: boolean;
  notificationsEnabled: boolean;
  taskNotifications?: boolean;
  pomodoroNotifications?: boolean;
  gamificationNotifications?: boolean;
}

export interface PomodoroSettings {
  focusDurationMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  intervalBeforeLongBreak: number;
  autoStartFocus?: boolean;
  autoStartBreak?: boolean;
  focusSoundUri: string | null;
  breakSoundUri: string | null;
  vibrationEnabled: boolean;
}

export interface TeamMembershipEntry {
  teamId: string;
  teamName: string;
  userTeamRole: "owner" | "admin" | "editor" | "member" | "viewer";
}

export interface UserDocument {
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

export interface TeamDocument {
  name: string;
  description: string | null;
  ownerUid: string;
  logoUrl: string | null;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  settings: {[key: string]: any} | null;
  defaultMemberRole: "admin" | "editor" | "member" | "viewer";
}

export interface TeamMemberDocument {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  role: "owner" | "admin" | "editor" | "member" | "viewer";
  joinedAt: Timestamp | FieldValue;
}

export interface WorkspaceDocument {
  name: string;
  description: string | null;
  ownerUid: string;
  isPersonal: boolean;
  teamId: string | null;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  activeApproach: string;
  defaultTags: string[];
  settings: {
    allowMembersToCreateTasks?: boolean;
    taskVisibility?: "all_visible" | "assigned_only";
    pomodoroOverrides?: PomodoroSettings | null;
    [key: string]: any;
  };
  lastClientSyncTimestamp: Timestamp | null;
  syncStatus: "synced" | "pending_upload" | "pending_download" |
              "error" | null;
}

export interface WorkspaceMemberDocument {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  workspaceRole: "owner" | "admin" | "manager" | "editor" |
                 "member" | "viewer";
  addedAt: Timestamp | FieldValue;
}

export type TaskStatusType = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriorityType = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type FrogDifficultyType = "EASY" | "MEDIUM" | "HARD";

export interface CalendarApproachParams {
  eventId: string | null;
  isAllDay: boolean;
  recurrenceRule: string | null;
}
export interface GtdApproachParams {
  context: string | null;
  nextAction: boolean;
  projectLink: string | null;
  waitingFor: string | null;
}
export interface EisenhowerApproachParams {
  urgency: number;
  importance: number;
}
export interface FrogApproachParams {
  isFrog: boolean;
  difficulty: FrogDifficultyType;
}

export interface TaskDocument {
  title: string;
  description: string | null;
  status: TaskStatusType;
  priority: TaskPriorityType;
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
    calendar?: CalendarApproachParams;
    gtd?: GtdApproachParams;
    eisenhower?: EisenhowerApproachParams;
    frog?: FrogApproachParams;
  } | null;
  orderInList: number;
  lastSyncClientTimestamp: Timestamp | null;
  localId: string | null;
}

export interface SubtaskDocument {
  title: string;
  completed: boolean;
  order: number;
  createdAt: Timestamp | FieldValue;
}

export interface CommentDocument {
  authorUid: string;
  authorName: string;
  authorAvatarUrl: string | null;
  text: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue | null;
}

export type PomodoroSessionType = "FOCUS" | "SHORT_BREAK" | "LONG_BREAK";

export interface PomodoroSessionDocument {
  userId: string;
  taskId: string;
  workspaceId: string;
  startTime: Timestamp | FieldValue;
  sessionType: PomodoroSessionType;
  plannedDurationSeconds: number;
  actualDurationSeconds: number;
  interruptions: number;
  completed: boolean;
  phaseNumberInCycle: number;
  totalFocusSessionIndex: number;
  updatedAt: Timestamp | FieldValue;
}

/**
 * Основной профиль геймификации пользователя.
 * Путь: /gamificationProfiles/{userUID}
 */
export interface GamificationProfileDocument {
  level: number;
  experience: number;
  coins: number;
  maxExperienceForLevel: number;
  currentStreak: number;
  lastClaimedDate: Timestamp;
  maxStreak: number;
  selectedPlantInstanceId: string | null; // Комментарий изменен
  lastPomodoroCompletionTime: Timestamp | null;
  lastTaskCompletionTime: Timestamp | null;
}

/**
 * Определение значка.
 * Путь: /badgeDefinitions/{badgeDefId}
 */
export interface BadgeDefinitionDocument {
    name: string;
    description: string;
    imageUrl: string;
    criteriaText: string;
    rewardXp: number;
    rewardCoins: number;
    isHidden: boolean;
}

/**
 * Документ о получении значка пользователем.
 * Путь: /gamificationProfiles/{userUID}/earnedBadges/{badgeDefId}
 */
export interface EarnedBadgeDocument {
  badgeDefinitionId: string;
  earnedAt: Timestamp;
  name: string;
  imageUrl: string;
  criteria: string;
}

// Первое определение ChallengeDefinitionDocument удалено

/**
 * Прогресс пользователя по челленджу.
 * Путь: /gamificationProfiles/{userUID}/challengeProgress/{challengeDefId}
 */
export interface ChallengeProgressDocument {
  challengeDefinitionId: string;
  progress: {[key: string]: number} | number;
  isCompleted: boolean;
  lastUpdated: Timestamp | FieldValue;
  completedAt: Timestamp | null;
}

/**
 * Документ экземпляра растения в саду пользователя.
 * Путь: /gamificationProfiles/{userUID}/virtualGarden/{plantInstanceId}
 */
export interface VirtualPlantDocument {
  plantType: string;
  growthStage: number;
  growthPoints: number;
  lastWateredAt: Timestamp;
  createdAt: Timestamp | FieldValue;
}

/**
 * Определение предмета в магазине.
 * Путь: /storeItems/{itemId}
 */
export interface StoreItemDocument {
    name: string;
    description: string;
    costInCoins: number;
    category: "PLANT_SEED" | "PLANT_FOOD" | "COSMETIC";
    itemValue: string;
    imageUrl: string;
    isAvailable: boolean;
}
export interface TaskStatisticsDocument {
  completionTime: Timestamp | null;
  timeSpentSeconds: number;
  totalPomodoroFocusSeconds: number;
  completedPomodoroFocusSessions: number;
  totalPomodoroInterrupts: number;
  wasCompletedOnce: boolean;
  firstCompletionTime: Timestamp | null;
  updatedAt: Timestamp | FieldValue;
}

export interface GlobalStatisticsDocument {
  userId: string;
  totalPersonalWorkspacesCreated: number;
  totalTeamWorkspacesMemberOf: number;
  totalTasksCreated: number;
  totalTasksCompleted: number;
  totalPomodoroFocusMinutes: number;
  totalTimeSpentMinutesOverall: number;
  lastActive: Timestamp | FieldValue;
  registrationDate: Timestamp;
}

export type GamificationHistoryEventType =
  | "TASK_COMPLETED" | "POMODORO_FOCUS_PHASE" | "DAILY_REWARD_CLAIMED"
  | "CHALLENGE_COMPLETED" | "BADGE_EARNED" | "PLANT_WATERED" | "LEVEL_UP"
  | "CUSTOM_CHALLENGE_COMPLETED";

export interface GamificationHistoryEntryDocument {
  userId: string;
  timestamp: Timestamp | FieldValue;
  eventType: GamificationHistoryEventType;
  xpChange: number;
  coinsChange: number;
  relatedEntityId: string | null;
  relatedEntityType: "task" | "challenge" | "badge" | "plant" | null;
  description: string | null;
}

export interface DateRangeFilter {
  start: Timestamp | null;
  end: Timestamp | null;
  type: "due" | "created" | "completed";
}

export interface UserViewDocument {
  uid: string;
  name: string;
  workspaceIds: string[];
  filters: {
    status?: TaskStatusType[];
    priority?: TaskPriorityType[];
    tagsInclude?: string[];
    tagsExclude?: string[];
    dateRange?: DateRangeFilter | null;
    assignee?: "me" | "unassigned" | string | null;
  } | null;
  sortBy: string;
  sortDirection: "asc" | "desc";
  isDefault: boolean;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export type ChallengeScopeType = "personal" | "team" | "workspace";
export type ChallengeRewardType = "XP" | "COINS" | "BADGE_ID" | "TEXT";
export type ChallengePeriodType = "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY";
export type ChallengeEventType =
  | "TASK_COMPLETION_COUNT" | "POMODORO_FOCUS_MINUTES" | "LOGIN_STREAK"
  | "POMODORO_SESSION_COUNT"
  | "CUSTOM_EVENT" | "BADGE_COUNT" | "PLANT_MAX_STAGE"
  | "LEVEL_REACHED" | "RESOURCE_ACCUMULATED";

/**
 * Определение челленджа.
 * Путь: /challengeDefinitions/{challengeDefId}
 */
export interface ChallengeDefinitionDocument { // Это определение остается
  name: string;
  description: string;
  creatorUid: string | "system";
  scope: ChallengeScopeType;
  targetEntityId: string | null;
  isPublicTemplate: boolean;
  reward: {
    type: ChallengeRewardType;
    value: string;
    badgeName?: string | null;
    badgeImageUrl?: string | null;
  };
  period: ChallengePeriodType;
  type: ChallengeEventType;
  targetValue: number;
  conditionJson: string | null;
  isActiveSystemChallenge?: boolean;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface ActiveItems {
  workspaceId?: string | null;
  viewId?: string | null;
}

// Новая сущность для хранения FCM токенов
export interface FcmTokenDocument {
    token: string;
    platform: "android" | "web" | "unknown";
    createdAt: Timestamp;
    lastUsedAt: Timestamp;
}


export interface DeletedEntityDocument {
  entityType: "task" | "subtask" | "workspace" | "view" | "team";
  deletedAt: Timestamp | FieldValue;
  userId?: string | null;
  workspaceId?: string | null;
  teamId?: string | null;
}
