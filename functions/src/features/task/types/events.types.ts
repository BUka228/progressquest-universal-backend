import {TaskDocument, TaskStatusType} from "./firestore.types";
import {BaseEvent} from "../../user/types/events.types";

// --- 4. Task Events (Топик: task-events) ---
export interface TaskEventBaseData {
  taskId: string;
  workspaceId: string;
}

export interface TaskCreatedEventData extends TaskEventBaseData {
  creatorUid: string;
  assigneeUid: string | null;
  title: string;
}
export interface TaskCreatedEvent extends BaseEvent {
  eventType: "TASK_CREATED";
  data: TaskCreatedEventData;
}

export interface TaskUpdatedEventData extends TaskEventBaseData {
  updaterUid: string;
  changedFields: Partial<TaskDocument>;
  previousValues?: Partial<TaskDocument>;
}
export interface TaskUpdatedEvent extends BaseEvent {
  eventType: "TASK_UPDATED";
  data: TaskUpdatedEventData;
}

export interface TaskStatusUpdatedEventData {
  taskId: string;
  workspaceId: string;
  userId: string;
  newStatus: TaskStatusType;
  oldStatus?: TaskStatusType;
  completedAt?: string;
  taskData?: Partial<
    Pick<TaskDocument, "title" | "assigneeUid" | "creatorUid">
  >;
}
export interface TaskStatusUpdatedEventMessage extends BaseEvent {
  eventType: "TASK_STATUS_UPDATED";
  data: TaskStatusUpdatedEventData;
}

export interface TaskDeletedEventData extends TaskEventBaseData {
  deleterUid: string;
}
export interface TaskDeletedEvent extends BaseEvent {
  eventType: "TASK_DELETED";
  data: TaskDeletedEventData;
}

export interface TaskAssignedEventData extends TaskEventBaseData {
  newAssigneeUid: string | null;
  oldAssigneeUid: string | null;
  assignerUid: string;
}
export interface TaskAssignedEvent extends BaseEvent {
  eventType: "TASK_ASSIGNED";
  data: TaskAssignedEventData;
}

export interface TaskCommentAddedEventData extends TaskEventBaseData {
  commentId: string;
  authorUid: string;
  text: string;
}
export interface TaskCommentAddedEvent extends BaseEvent {
  eventType: "TASK_COMMENT_ADDED";
  data: TaskCommentAddedEventData;
}
