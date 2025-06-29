import {UserDocument, AppSettings, PomodoroSettings} from "./firestore.types";

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

export interface UpdateUserProfileResponse {
  success: boolean;
  updatedProfile: UserDocument;
}

// Используем Partial для частичных обновлений
export type UpdateUserAppSettingsPayload = Partial<AppSettings>;

export interface UpdateUserAppSettingsResponse {
  success: boolean;
  appSettings: AppSettings;
}

export type UpdateUserPomodoroSettingsPayload = Partial<PomodoroSettings>;

export interface UpdateUserPomodoroSettingsResponse {
  success: boolean;
  pomodoroSettings: PomodoroSettings;
}

export interface UpdateUserActiveItemsPayload {
  workspaceId?: string | null;
  viewId?: string | null;
}

export interface UpdateUserActiveItemsResponse {
  success: boolean;
  activeItems: {
    workspaceId?: string | null;
    viewId?: string | null;
  };
}

export interface MigrateGuestDataPayload {
  workspaces: Array<{
    localId: string;
    name: string;
    description?: string;
    activeApproach?: string;
    tasks: Array<{
      localId: string;
      title: string;
      description?: string;
      dueDate?: number;
      priority?: string;
      tags?: string[];
      pomodoroEstimatedMinutes?: number;
    }>;
  }>;
}

export interface MigrateGuestDataResponse {
  success: boolean;
  idMappings: {
    workspaces: Record<string, string>;
    tasks: Record<string, string>;
  };
}
