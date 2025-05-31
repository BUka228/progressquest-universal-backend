export const region = "europe-west1";
export const runtimeOptsV2 = {region, memory: "256MiB" as const};

export const USERS_COLLECTION = "users";
export const WORKSPACES_COLLECTION = "workspaces";
export const TASKS_COLLECTION = "tasks";
export const POMODORO_SESSIONS_COLLECTION = "pomodoroSessions";
export const GAMIFICATION_PROFILES_COLLECTION = "gamificationProfiles";
export const GLOBAL_STATISTICS_COLLECTION = "globalStatistics";
export const TASK_STATISTICS_COLLECTION = "taskStatistics";
export const GAMIFICATION_HISTORY_COLLECTION = "gamificationHistory";

export const USER_EVENTS_TOPIC = "user-events";
export const TASK_EVENTS_TOPIC = "task-events";
export const POMODORO_EVENTS_TOPIC = "pomodoro-events";
