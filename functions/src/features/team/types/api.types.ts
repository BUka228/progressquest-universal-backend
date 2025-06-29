import {SuccessResponse} from "../../../core/types/api.types";

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
