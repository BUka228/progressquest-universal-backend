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

export interface ActiveItems {
  workspaceId?: string | null;
  viewId?: string | null;
}

export interface UserDocument {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Timestamp | FieldValue;
  lastLoginAt: Timestamp | FieldValue;
  personalWorkspaceId: string;
  activeItems: ActiveItems;
  defaultViewId: string | null;
  appSettings: AppSettings;
  pomodoroSettings: PomodoroSettings;
  teamMemberships?: TeamMembershipEntry[];
}

export interface FcmTokenDocument {
    token: string;
    platform: "android" | "web" | "unknown";
    createdAt: Timestamp;
    lastUsedAt: Timestamp;
}
