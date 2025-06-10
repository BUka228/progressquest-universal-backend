import {
  UserDocument,
  AppSettings,
  PomodoroSettings,
  TaskStatusType,
  TaskPriorityType,
  CalendarApproachParams,
  GtdApproachParams,
  EisenhowerApproachParams,
  FrogApproachParams,
  PomodoroSessionType,
  ChallengeScopeType,
  ChallengeRewardType,
  ChallengePeriodType,
  ChallengeEventType,
} from "./firestore.types";

// --- Общие Типы Ответов ---
export interface SuccessResponse {
  success: boolean;
  message?: string;
  id?: string;
}

// --- 7.1. Аутентификация, Сессия и Учетные данные ---
export interface SendPasswordResetEmailPayload {
  email: string;
}

export interface RegisterFcmTokenPayload {
    token: string;
    platform: "android" | "web";
    deviceName?: string;
}

export interface UnregisterFcmTokenPayload {
    token: string;
}

// --- 7.2. Управление Профилем Пользователя ---
export interface GetUserProfileResponse {
  userProfile: UserDocument;
}

export interface UpdateUserProfilePayload {
  displayName?: string;
  avatarUrl?: string | null;
}

export interface UpdateUserProfileResponse extends SuccessResponse {
  updatedProfile: UserDocument;
}

// Используем Partial для частичных обновлений
export type UpdateUserAppSettingsPayload = Partial<AppSettings>;

export interface UpdateUserAppSettingsResponse extends SuccessResponse {
  appSettings: AppSettings;
}

export type UpdateUserPomodoroSettingsPayload = Partial<PomodoroSettings>;

export interface UpdateUserPomodoroSettingsResponse extends SuccessResponse {
  pomodoroSettings: PomodoroSettings;
}

export interface UpdateUserActiveItemsPayload {
  workspaceId?: string | null;
  viewId?: string | null;
}

export interface UpdateUserActiveItemsResponse extends SuccessResponse {
  activeItems: {
    workspaceId?: string | null;
    viewId?: string | null;
  };
}

// --- 7.3. Управление Командами ---
export interface CreateTeamPayload {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  defaultMemberRole?: "admin" | "editor" | "member" | "viewer";
}
export interface TeamClientDto {
  id: string;
  name: string;
  description: string | null;
  ownerUid: string;
  logoUrl: string | null;
  createdAt: string; // ISO Timestamp
  updatedAt: string; // ISO Timestamp
  settings: {[key: string]: any} | null;
  defaultMemberRole: "admin" | "editor" | "member" | "viewer";
}
export interface CreateTeamResponse {
  team: TeamClientDto;
}
export interface GetUserTeamsResponse {
  teams: {
    teamId: string;
    teamName: string;
    userTeamRole: "owner" | "admin" | "editor" | "member" | "viewer";
  }[];
}
export interface GetTeamDetailsPayload {
  teamId: string;
}
export interface TeamMemberClientDto {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  role: "owner" | "admin" | "editor" | "member" | "viewer";
  joinedAt: string; // ISO Timestamp
}
export interface GetTeamDetailsResponse {
  team: TeamClientDto;
  members?: TeamMemberClientDto[];
}
export interface UpdateTeamPayload {
  teamId: string;
  name?: string;
  description?: string | null;
  logoUrl?: string | null;
  settings?: {[key: string]: any} | null;
  defaultMemberRole?: string;
}
export interface UpdateTeamResponse extends SuccessResponse {
  updatedTeam: TeamClientDto;
}
export interface DeleteTeamPayload {
  teamId: string;
}
export interface AddTeamMemberPayload {
  teamId: string;
  userEmailOrUid: string;
  role: "admin" | "editor" | "member" | "viewer";
}
export interface AddTeamMemberResponse extends SuccessResponse {
  member: TeamMemberClientDto;
}
export interface UpdateTeamMemberRolePayload {
  teamId: string;
  memberUid: string;
  newRole: "admin" | "editor" | "member" | "viewer";
}
export interface UpdateTeamMemberRoleResponse extends SuccessResponse {
  updatedMember: TeamMemberClientDto;
}
export interface RemoveTeamMemberPayload {
  teamId: string;
  memberUid: string;
}

// --- 7.4. Управление Рабочими Пространствами ---
export interface CreateWorkspacePayload {
  name: string;
  description?: string | null;
  isPersonal: boolean;
  teamId?: string | null;
  activeApproach?: string;
  defaultTags?: string[];
  settings?: {[key: string]: any};
}
export interface WorkspaceClientDto {
  id: string;
  name: string;
  description: string | null;
  ownerUid: string;
  isPersonal: boolean;
  teamId: string | null;
  createdAt: string; // ISO Timestamp
  updatedAt: string; // ISO Timestamp
  activeApproach: string;
  defaultTags: string[];
  settings: {[key: string]: any};
  currentUserWorkspaceRole?:
    | "owner"
    | "admin"
    | "manager"
    | "editor"
    | "member"
    | "viewer"
    | null;
}
export interface CreateWorkspaceResponse {
  workspace: WorkspaceClientDto;
}
export interface GetUserWorkspacesResponse {
  workspaces: WorkspaceClientDto[];
}
export interface GetWorkspaceDetailsPayload {
  workspaceId: string;
}
export interface WorkspaceMemberClientDto {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  workspaceRole:
    | "owner"
    | "admin"
    | "manager"
    | "editor"
    | "member"
    | "viewer";
  addedAt: string; // ISO Timestamp
}
export interface GetWorkspaceDetailsResponse {
  workspace: WorkspaceClientDto;
  members?: WorkspaceMemberClientDto[];
}
export interface UpdateWorkspacePayload {
  workspaceId: string;
  name?: string;
  description?: string | null;
  activeApproach?: string;
  defaultTags?: string[];
  settings?: {[key: string]: any};
}
export interface UpdateWorkspaceResponse extends SuccessResponse {
  updatedWorkspace: WorkspaceClientDto;
}
export interface DeleteWorkspacePayload {
  workspaceId: string;
}

// --- 7.5. Управление Задачами ---
export interface TaskApproachParamsClientDto {
  calendar?: CalendarApproachParams;
  gtd?: GtdApproachParams;
  eisenhower?: EisenhowerApproachParams;
  frog?: FrogApproachParams;
}
export interface CreateTaskPayload {
  workspaceId: string;
  title: string;
  description?: string | null;
  dueDate?: string | number | null;
  priority?: TaskPriorityType;
  assigneeUid?: string | null;
  tags?: string[];
  approachParams?: TaskApproachParamsClientDto | null;
  pomodoroEstimatedMinutes?: number | null;
}
export interface TaskClientDto {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatusType;
  priority: TaskPriorityType;
  dueDate: string | null; // ISO Timestamp
  createdAt: string; // ISO Timestamp
  updatedAt: string; // ISO Timestamp
  completedAt: string | null; // ISO Timestamp
  creatorUid: string;
  assigneeUid: string | null;
  workspaceId: string;
  tags: string[];
  pomodoroEstimatedCycles: number | null;
  pomodoroEstimatedMinutes: number | null;
  approachParams: TaskApproachParamsClientDto | null;
  orderInList: number;
}
export interface CreateTaskResponse {
  task: TaskClientDto;
}
export interface GetTasksPayload {
  viewId?: string | null;
  workspaceId?: string;
  filters?: ViewFiltersClientDto | null;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}
export interface GetTasksResponse {
  tasks: TaskClientDto[];
}
export interface GetTaskDetailsPayload {
  taskId: string;
}
export interface SubtaskClientDto {
  id: string;
  title: string;
  completed: boolean;
  order: number;
  createdAt: string; // ISO Timestamp
}
export interface CommentClientDto {
  id: string;
  authorUid: string;
  authorName: string;
  authorAvatarUrl: string | null;
  text: string;
  createdAt: string; // ISO
  updatedAt: string | null; // ISO
}
export interface GetTaskDetailsResponse {
  task: TaskClientDto;
  subtasks?: SubtaskClientDto[];
  comments?: CommentClientDto[];
}
export interface UpdateTaskPayload {
  taskId: string;
  title?: string;
  description?: string | null;
  status?: TaskStatusType;
  priority?: TaskPriorityType;
  dueDate?: string | number | null;
  assigneeUid?: string | null;
  tags?: string[];
  approachParams?: TaskApproachParamsClientDto | null;
  pomodoroEstimatedMinutes?: number | null;
}
export interface UpdateTaskResponse extends SuccessResponse {
  updatedTask: TaskClientDto;
}
export interface DeleteTaskPayload {
  taskId: string;
}
export interface CreateCommentPayload {
  taskId: string;
  text: string;
}
export interface CreateCommentResponse {
  comment: CommentClientDto;
}

// --- 7.6. Управление Pomodoro-сессиями ---
export interface StartPomodoroPhasePayload {
  taskId: string;
  workspaceId: string;
  sessionType: PomodoroSessionType;
  plannedDurationSeconds: number;
  phaseNumberInCycle?: number;
  totalFocusSessionIndex?: number;
}
export interface StartPomodoroPhaseResponse {
  sessionId: string;
}
export interface CompletePomodoroPhasePayload {
  sessionId: string;
  actualDurationSeconds: number;
  interruptions: number;
  completed: boolean;
}

// --- 7.7. Геймификация и Статистика ---
export interface GamificationProfileClientDto {
  level: number;
  experience: number;
  coins: number;
  maxExperienceForLevel: number;
  currentStreak: number;
  lastClaimedDate: string;
  maxStreak: number;
  selectedPlantId: string | null;
  lastPomodoroCompletionTime: string | null;
  lastTaskCompletionTime: string | null;
}
export interface GetGamificationProfileResponse {
  profile: GamificationProfileClientDto;
}

export interface RewardClientDto {
  type: ChallengeRewardType;
  value: string;
  badgeName?: string | null;
  badgeImageUrl?: string | null;
}

// --- Значки ---
export interface BadgeDefinitionClientDto {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    criteria: string;
    rewardXp?: number;
    rewardCoins?: number;
    isHidden?: boolean;
}

export interface GetAllBadgeDefinitionsResponseDto {
    badges: BadgeDefinitionClientDto[];
}

export interface EarnedBadgeClientDto {
  badgeDefinitionId: string;
  earnedAt: string; // ISO
  name: string;
  imageUrl: string;
  criteria: string;
}
export interface GetBadgesResponse {
  badges: EarnedBadgeClientDto[];
}

export interface CreateCustomChallengePayload {
  name: string;
  description: string;
  period: ChallengePeriodType;
  type: ChallengeEventType;
  targetValue: number;
  reward: {
    type: ChallengeRewardType;
    value: string;
    badgeName?: string | null;
    badgeImageUrl?: string | null;
  };
  conditionJson?: string | null;
}
export interface ChallengeDefinitionClientDto {
  id: string;
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
  createdAt: string;
  updatedAt: string;
  currentUserProgress?: {
    progress: {[key: string]: number} | number;
    isCompleted: boolean;
  };
}

export interface CreateChallengeResponse {
  challenge: ChallengeDefinitionClientDto;
}

export interface GetChallengesResponse {
  challenges: ChallengeDefinitionClientDto[];
}

export interface UpdateCustomChallengePayload
  extends Partial<Omit<CreateCustomChallengePayload, "type">> {
  challengeDefId: string;
}

export interface DeleteChallengePayload {
  challengeDefId: string;
}

// Новые DTO для сада и ежедневной награды
export interface ClaimDailyRewardResponseDto extends SuccessResponse {
  rewardReceived: RewardClientDto;
  newStreak: number;
  newXp: number;
  newCoins: number;
}

// --- Виртуальный сад ---
export interface VirtualPlantClientDto {
    id: string;
    plantType: string;
    growthStage: number;
    growthPoints: number;
    lastWateredAt: string; // ISO
    createdAt: string; // ISO
}

export interface GetVirtualGardenResponse {
    plants: VirtualPlantClientDto[];
    selectedPlantId: string | null;
}

export interface SelectPlantRequestPayload {
    plantInstanceId: string;
}

export interface WaterPlantRequestPayload {
  plantInstanceId?: string | null;
}

export interface WaterPlantResponseDto extends SuccessResponse {
  updatedPlants: VirtualPlantClientDto[];
  growthPointsAdded?: { [plantInstanceId: string]: number };
}

// --- Магазин ---
export interface StoreItemClientDto {
    id: string;
    name: string;
    description: string;
    costInCoins: number;
    category: string;
    itemValue: string;
    imageUrl: string;
    isAvailable: boolean;
}

export interface GetStoreItemsResponse {
    items: StoreItemClientDto[];
}

export interface PurchaseStoreItemPayload {
    itemId: string;
}

export interface PurchaseStoreItemResponse extends SuccessResponse {
  remainingCoins: number;
  itemReceived: StoreItemClientDto;
}

// --- 7.8. Управление "Представлениями" ---
export interface DateRangeFilterClientDto {
  start?: string | number | null;
  end?: string | number | null;
  type: "due" | "created" | "completed";
}
export interface ViewFiltersClientDto {
  status?: TaskStatusType[];
  priority?: TaskPriorityType[];
  tagsInclude?: string[];
  tagsExclude?: string[];
  dateRange?: DateRangeFilterClientDto | null;
  assignee?: "me" | "unassigned" | string | null;
}
export interface CreateUserViewPayload {
  name: string;
  workspaceIds: string[];
  filters?: ViewFiltersClientDto | null;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  isDefault?: boolean;
}
export interface UserViewClientDto {
  id: string;
  uid: string;
  name: string;
  workspaceIds: string[];
  filters: ViewFiltersClientDto | null;
  sortBy: string | null;
  sortDirection: "asc" | "desc" | null;
  isDefault: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
export interface CreateUserViewResponse {
  view: UserViewClientDto;
}
export interface GetUserViewsResponse {
  views: UserViewClientDto[];
}
export interface GetUserViewDetailsPayload {
  viewId: string;
}
export interface GetUserViewDetailsResponse {
  view: UserViewClientDto;
}
export interface UpdateUserViewPayload extends Partial<CreateUserViewPayload> {
  viewId: string;
}
export interface UpdateUserViewResponse extends SuccessResponse {
  updatedView: UserViewClientDto;
}
export interface DeleteUserViewPayload {
  viewId: string;
}
export interface SetDefaultViewPayload {
  viewId: string;
}
export interface GetAggregatedTasksFromViewPayload {
  viewId: string;
  dateFilter?: "today" | "this_week" | "this_month" | null;
}

export interface UpdateTaskStatusPayload {
  taskId: string;
  newStatus: TaskStatusType;
  workspaceId: string;
}


// --- Специализированные Операции ---
interface GuestTaskDto {
  localId: string;
  title: string;
  description?: string | null;
  priority: TaskPriorityType;
  dueDate?: string | number | null;
  pomodoroEstimatedMinutes?: number | null;
  tags?: string[];
}

interface GuestWorkspaceDto {
  localId: string;
  name: string;
  description?: string | null;
  activeApproach: string;
  tasks: GuestTaskDto[];
}

export interface MigrateGuestDataPayload {
  workspaces: GuestWorkspaceDto[];
}

export interface MigrateGuestDataResponse extends SuccessResponse {
  idMappings: {
    workspaces: Record<string, string>;
    tasks: Record<string, string>;
  };
}


// --- Статистика ---
export interface GetTaskStatisticsPayload {
  taskId: string;
}

export interface TaskStatisticsClientDto {
  completionTime: string | null; // ISO 8601
  timeSpentSeconds: number;
  totalPomodoroFocusSeconds: number;
  completedPomodoroFocusSessions: number;
  totalPomodoroInterrupts: number;
  wasCompletedOnce: boolean;
  firstCompletionTime: string | null;
  updatedAt: string; // ISO 8601
}

export interface GetTaskStatisticsResponse {
  statistics: TaskStatisticsClientDto;
}

export interface GetGamificationHistoryPayload {
  limit?: number;
  startAfterEntryId?: string | null;
}

export interface GamificationHistoryEntryClientDto {
  id: string;
  timestamp: string; // ISO 8601
  eventType: string;
  xpChange: number;
  coinsChange: number;
  relatedEntityCloudId: string | null;
  relatedEntityType: "task" | "challenge" | "badge" | "plant" | null;
  description: string | null;
}

export interface GetGamificationHistoryResponse {
  history: GamificationHistoryEntryClientDto[];
  nextPageToken: string | null;
}

export interface StatsTrendRequestPayload {
  startDate: string;
  endDate: string;
}


export interface DateValuePointClientDto {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface DayOfWeekValuePointClientDto {
  dayOfWeek: number; // 1 (Пн) - 7 (Вс)
  value: number;
}

export interface StatsPeriodSummaryClientDto {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  taskCompletionTrend?: DateValuePointClientDto[];
  pomodoroFocusTrend?: DateValuePointClientDto[];
  xpGainTrend?: DateValuePointClientDto[];
  coinGainTrend?: DateValuePointClientDto[];
  tasksCompletedByDayOfWeek?: DayOfWeekValuePointClientDto[];
  totalTasksCompletedInPeriod?: number;
  totalPomodoroMinutesInPeriod?: number;
  averageDailyPomodoroMinutes?: number;
  totalXpGainedInPeriod?: number;
  totalCoinsGainedInPeriod?: number;
  mostProductiveDayInPeriod?: string | null;
  averageTasksPerDayInPeriod?: number;
}

export interface GetGlobalStatisticsResponse {
    statistics: {
        userId: string;
        totalPersonalWorkspacesCreated: number;
        totalTeamWorkspacesMemberOf: number;
        totalTasksCreated: number;
        totalTasksCompleted: number;
        totalPomodoroFocusMinutes: number;
        totalTimeSpentMinutesOverall: number;
        lastActive: string; // ISO
        registrationDate: string; // ISO
    };
}

/**
 * Payload для создания новой подзадачи.
 */
export interface CreateSubtaskPayload {
  parentTaskId: string;
  title: string;
  order?: number;
}

/**
 * Payload для обновления подзадачи.
 */
export interface UpdateSubtaskPayload {
  parentTaskId: string;
  subtaskId: string;
  title?: string;
  completed?: boolean;
  order?: number;
}

/**
 * Payload для удаления подзадачи.
 */
export interface DeleteSubtaskPayload {
  parentTaskId: string;
  subtaskId: string;
}


// === DTO для Дельта-Синхронизации Задач ===

/**
 * Payload для запроса изменений по задачам.
 */
export interface GetTaskChangesPayload {
  since: string;
  workspaceIds: string[];
}

/**
 * DTO ответа с изменениями по задачам.
 */
export interface GetTaskChangesResponse {
  updatedTasks: TaskClientDto[];
  deletedTaskCloudIds: string[];
  serverTimestamp: string;
}
