import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import {
  TaskStatusType,
  TaskPriorityType,
} from "../../task/types/firestore.types";

export interface DateRangeFilter {
  start: Timestamp | null;
  end: Timestamp | null;
  type: "due" | "created" | "completed";
}

export interface UserViewDocument {
  uid: string;
  name: string;
  workspaceIds: string[];
  filters: {
    status?: TaskStatusType[];
    priority?: TaskPriorityType[];
    tagsInclude?: string[];
    tagsExclude?: string[];
    dateRange?: DateRangeFilter | null;
    assignee?: "me" | "unassigned" | string | null;
  } | null;
  sortBy: string;
  sortDirection: "asc" | "desc";
  isDefault: boolean;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}
