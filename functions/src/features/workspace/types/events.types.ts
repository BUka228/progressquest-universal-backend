import {WorkspaceDocument, WorkspaceMemberDocument} from "./firestore.types";
import {BaseEvent} from "../../user/types/events.types";

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
