// --- Глобальные Настройки Функций ---
export const functionRegion = "europe-west1"; // ЗАМЕНИТЕ НА ВАШ РЕГИОН!
export const defaultMemoryOption = "256MiB" as const;

export const commonRuntimeOpts = {
  region: functionRegion,
  memory: defaultMemoryOption,
  // timeoutSeconds: 60,
  // retry: true,
};

// --- Названия Firestore Коллекций ---
export const USERS_COLLECTION = "users";
export const TEAMS_COLLECTION = "teams";
export const WORKSPACES_COLLECTION = "workspaces";
export const TASKS_COLLECTION = "tasks";
export const DELETED_ENTITIES_COLLECTION = "deletedEntities";
export const SUBTASKS_COLLECTION = "subtasks";
export const COMMENTS_COLLECTION = "comments";

export const POMODORO_SESSIONS_COLLECTION = "pomodoroSessions";

export const GAMIFICATION_PROFILES_COLLECTION = "gamificationProfiles";
export const EARNED_BADGES_SUBCOLLECTION = "earnedBadges";
export const CHALLENGE_PROGRESS_SUBCOLLECTION = "challengeProgress";
export const VIRTUAL_GARDEN_SUBCOLLECTION = "virtualGarden";
export const BADGE_DEFINITIONS_COLLECTION = "badgeDefinitions";
export const STORE_ITEMS_COLLECTION = "storeItems";

export const TASK_STATISTICS_COLLECTION = "taskStatistics";
export const GLOBAL_STATISTICS_COLLECTION = "globalStatistics";
export const GAMIFICATION_HISTORY_COLLECTION = "gamificationHistory";
export const USER_VIEWS_COLLECTION = "userViews";
export const CHALLENGE_DEFINITIONS_COLLECTION = "challengeDefinitions";
// export const REWARD_DEFINITIONS_COLLECTION = "rewardDefinitions";

// --- Названия Pub/Sub Топиков ---
export const USER_EVENTS_TOPIC = "user-events";
export const TEAM_EVENTS_TOPIC = "team-events";
export const WORKSPACE_EVENTS_TOPIC = "workspace-events";
export const TASK_EVENTS_TOPIC = "task-events";
export const POMODORO_EVENTS_TOPIC = "pomodoro-events";
export const GAMIFICATION_EVENTS_TOPIC = "gamification-events";

// --- Имена полей для Firestore (опционально, для избежания опечаток) ---
// export const FIELD_USER_UID = "uid";
// export const FIELD_TASK_STATUS = "status";

// --- Настройки по умолчанию для новых сущностей ---
export const DEFAULT_USER_DISPLAY_NAME = "Новый Искатель";
export const DEFAULT_PERSONAL_WORKSPACE_NAME = "Мое пространство";
export const DEFAULT_POMODORO_FOCUS_MIN = 25;
export const DEFAULT_POMODORO_SHORT_BREAK_MIN = 5;
export const DEFAULT_POMODORO_LONG_BREAK_MIN = 15;
export const DEFAULT_POMODORO_INTERVAL = 4;

// --- Константы для Геймификации ---
export const XP_FOR_TASK_COMPLETION = 50;
export const COINS_FOR_TASK_COMPLETION = 10;
export const XP_PER_POMODORO_FOCUS_MINUTE = 1;
// 1 монета за каждые N XP от Pomodoro
export const COINS_PER_XP_BATCH_POMODORO = 5;
export const XP_BATCH_FOR_COIN_POMODORO = 10; // N=10
// Мин. фокус для награды
export const MIN_FOCUS_DURATION_FOR_REWARD_SECONDS = 60;

// --- Другие общие константы приложения ---
// export const MAX_TEAM_MEMBERS = 50;
// export const MAX_WORKSPACES_PER_USER = 10;

// --- Константы для типов событий ---
// export const EVENT_TYPE_USER_CREATED = "USER_CREATED";
// export const EVENT_TYPE_TASK_COMPLETED = "TASK_COMPLETED";
