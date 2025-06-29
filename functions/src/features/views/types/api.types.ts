import {
  TaskStatusType,
  TaskPriorityType,
} from "../../task/types/firestore.types";
import {SuccessResponse} from "../../../core/types/api.types";

// --- 7.8. Управление "Представлениями" ---
export interface DateRangeFilterClientDto {
  start?: string | number | null;
  end?: string | number | null;
  type: "due" | "created" | "completed";
}
export interface ViewFiltersClientDto {
  status?: TaskStatusType[];
  priority?: TaskPriorityType[];
  tagsInclude?: string[];
  tagsExclude?: string[];
  dateRange?: DateRangeFilterClientDto | null;
  assignee?: "me" | "unassigned" | string | null;
}
export interface CreateUserViewPayload {
  name: string;
  workspaceIds: string[];
  filters?: ViewFiltersClientDto | null;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  isDefault?: boolean;
}
export interface UserViewClientDto {
  id: string;
  uid: string;
  name: string;
  workspaceIds: string[];
  filters: ViewFiltersClientDto | null;
  sortBy: string | null;
  sortDirection: "asc" | "desc" | null;
  isDefault: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
export interface CreateUserViewResponse {
  view: UserViewClientDto;
}
export interface GetUserViewsResponse {
  views: UserViewClientDto[];
}
export interface GetUserViewDetailsPayload {
  viewId: string;
}
export interface GetUserViewDetailsResponse {
  view: UserViewClientDto;
}
export interface UpdateUserViewPayload extends Partial<CreateUserViewPayload> {
  viewId: string;
}
export interface UpdateUserViewResponse extends SuccessResponse {
  updatedView: UserViewClientDto;
}
export interface DeleteUserViewPayload {
  viewId: string;
}
export interface SetDefaultViewPayload {
  viewId: string;
}
export interface GetAggregatedTasksFromViewPayload {
  viewId: string;
  dateFilter?: "today" | "this_week" | "this_month" | null;
}
