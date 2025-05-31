import {FieldValue, Timestamp} from "firebase-admin/firestore";

export interface AppSettings {
  theme: "SYSTEM" | "LIGHT" | "DARK";
  dynamicColorEnabled: boolean;
  notificationsEnabled: boolean;
}

export type TaskStatusType = "TODO" | "IN_PROGRESS" | "DONE";

export interface PomodoroSettings {
  focusDurationMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  intervalBeforeLongBreak: number;
  focusSoundUri: string | null;
  breakSoundUri: string | null;
  vibrationEnabled: boolean;
}

export interface TeamMembershipEntry {
  teamId: string;
  teamName: string;
  userTeamRole: "admin" | "editor" | "member" | "viewer";
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
  defaultMemberRole: "member" | "viewer";
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
  settings: {[key: string]: any};
}

export interface WorkspaceMemberDocument {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  workspaceRole: "owner" | "admin" | "editor" | "member" | "viewer";
  addedAt: Timestamp | FieldValue;
}

export interface TaskDocument {
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

export interface SubtaskDocument {
  title: string;
  completed: boolean;
  order: number;
  createdAt: Timestamp | FieldValue;
}

export interface CommentDocument {
  authorUid: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  text: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue | null;
}

export interface PomodoroSessionDocument {
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

export interface GamificationProfileDocument {
  level: number;
  experience: number;
  coins: number;
  maxExperienceForLevel: number;
  currentStreak: number;
  lastClaimedDate: Timestamp;
  maxStreak: number;
  selectedPlantId: string | null;
}

export interface EarnedBadgeDocument {
  badgeDefinitionId: string;
  earnedAt: Timestamp;
  name: string;
  imageUrl: string;
}

export interface ChallengeProgressDocument {
  challengeDefinitionId: string;
  progress: number;
  target: number;
  isCompleted: boolean;
  lastUpdated: Timestamp | FieldValue;
  completedAt: Timestamp | null;
}

export interface VirtualPlantDocument {
  plantType: string;
  growthStage: number;
  growthPoints: number;
  lastWatered: Timestamp | null;
  createdAt: Timestamp | FieldValue;
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
  totalWorkspacesCreated: number;
  totalTasksCreated: number;
  totalTasksCompleted: number;
  totalPomodoroFocusMinutes: number;
  totalTimeSpentMinutesOverall: number;
  lastActive: Timestamp | FieldValue;
}

export interface GamificationHistoryEntryDocument {
  userId: string;
  timestamp: Timestamp | FieldValue;
  eventType: string;
  xpChange: number;
  coinsChange: number;
  relatedEntityId: string | null;
  description: string | null;
}

export interface UserViewDocument {
  uid: string;
  name: string;
  workspaceIds: string[];
  filters: {
    status?: ("TODO" | "IN_PROGRESS" | "DONE")[];
    priority?: ("LOW" | "MEDIUM" | "HIGH" | "CRITICAL")[];
    tagsInclude?: string[];
    tagsExclude?: string[];
    dateRange?: {
      start: Timestamp | null;
      end: Timestamp | null;
      type: "due" | "created" | "completed";
    } | null;
    assignee?: "me" | "unassigned" | string | null;
  } | null;
  sortBy: string;
  sortDirection: "asc" | "desc";
  isDefault: boolean;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface ChallengeDefinitionDocument {
  name: string;
  description: string;
  creatorUid: string | "system";
  scope: "personal" | "team" | "workspace";
  targetEntityId: string | null;
  isPublic: boolean;
  rewardId: string | null;
  period: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY";
  type: string;
  targetValue: number;
  conditionJson: string | null;
  isActiveGlobally: boolean;
  createdAt: Timestamp | FieldValue;
}
