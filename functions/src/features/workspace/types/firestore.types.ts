import {FieldValue, Timestamp} from "firebase-admin/firestore";
import {PomodoroSettings} from "../../user/types/firestore.types";

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
