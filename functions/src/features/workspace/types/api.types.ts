import {SuccessResponse} from "../../../core/types/api.types";

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
