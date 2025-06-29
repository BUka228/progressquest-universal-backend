import {TeamDocument, TeamMemberDocument} from "./firestore.types";
import {BaseEvent} from "../../user/types/events.types";

// --- 2. Team Events (Топик: team-events) ---
export interface TeamEventBaseData {
  teamId: string;
}

export interface TeamCreatedEventData extends TeamEventBaseData {
  ownerUid: string;
  teamName: string;
}
export interface TeamCreatedEvent extends BaseEvent {
  eventType: "TEAM_CREATED";
  data: TeamCreatedEventData;
}

export interface TeamUpdatedEventData extends TeamEventBaseData {
  updatedFields: Array<keyof TeamDocument>;
}
export interface TeamUpdatedEvent extends BaseEvent {
  eventType: "TEAM_UPDATED";
  data: TeamUpdatedEventData;
}

export type TeamDeletedEventData = TeamEventBaseData;
export interface TeamDeletedEvent extends BaseEvent {
  eventType: "TEAM_DELETED";
  data: TeamDeletedEventData;
}

export interface TeamMemberAddedEventData extends TeamEventBaseData {
  userId: string;
  userTeamRole: TeamMemberDocument["role"];
  addedByUid: string;
}
export interface TeamMemberAddedEvent extends BaseEvent {
  eventType: "TEAM_MEMBER_ADDED";
  data: TeamMemberAddedEventData;
}

export interface TeamMemberRemovedEventData extends TeamEventBaseData {
  userId: string;
  removedByUid: string;
}
export interface TeamMemberRemovedEvent extends BaseEvent {
  eventType: "TEAM_MEMBER_REMOVED";
  data: TeamMemberRemovedEventData;
}

export interface TeamMemberRoleUpdatedEventData extends TeamEventBaseData {
  userId: string;
  newTeamRole: TeamMemberDocument["role"];
  oldTeamRole: TeamMemberDocument["role"];
  updatedByUid: string;
}
export interface TeamMemberRoleUpdatedEvent extends BaseEvent {
  eventType: "TEAM_MEMBER_ROLE_UPDATED";
  data: TeamMemberRoleUpdatedEventData;
}
