import {
  TaskStatusType,
  TaskPriorityType,
  CalendarApproachParams,
  GtdApproachParams,
  EisenhowerApproachParams,
  FrogApproachParams,
} from "./firestore.types";
import {SuccessResponse} from "../../../core/types/api.types";

// --- 7.5. Управление Задачами ---
export interface TaskApproachParamsClientDto {
    calendar?: CalendarApproachParams;
    gtd?: GtdApproachParams;
    eisenhower?: EisenhowerApproachParams;
    frog?: FrogApproachParams;
  }
export interface CreateTaskPayload {
    workspaceId: string;
    title: string;
    description?: string | null;
    dueDate?: string | number | null;
    priority?: TaskPriorityType;
    assigneeUid?: string | null;
    tags?: string[];
    subtasks?: CreateSubtaskPayload[];
    approachParams?: TaskApproachParamsClientDto | null;
    pomodoroEstimatedMinutes?: number | null;
  }
export interface TaskClientDto {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatusType;
    priority: TaskPriorityType;
    dueDate: string | null; // ISO Timestamp
    createdAt: string; // ISO Timestamp
    updatedAt: string; // ISO Timestamp
    completedAt: string | null; // ISO Timestamp
    creatorUid: string;
    assigneeUid: string | null;
    workspaceId: string;
    tags: string[];
    subtasks?: SubtaskClientDto[];
    pomodoroEstimatedCycles: number | null;
    pomodoroEstimatedMinutes: number | null;
    approachParams: TaskApproachParamsClientDto | null;
    orderInList: number;
  }
export interface CreateTaskResponse {
    task: TaskClientDto;
  }
export interface GetTasksPayload {
    viewId?: string | null;
    workspaceId?: string;
    filters?: any | null;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
  }
export interface GetTasksResponse {
    tasks: TaskClientDto[];
  }
export interface GetTaskDetailsPayload {
    taskId: string;
  }
export interface SubtaskClientDto {
    id: string;
    title: string;
    completed: boolean;
    order: number;
    createdAt: string; // ISO Timestamp
  }
export interface CommentClientDto {
    id: string;
    authorUid: string;
    authorName: string;
    authorAvatarUrl: string | null;
    text: string;
    createdAt: string; // ISO
    updatedAt: string | null; // ISO
  }
export interface GetTaskDetailsResponse {
    task: TaskClientDto;
    subtasks?: SubtaskClientDto[];
    comments?: CommentClientDto[];
  }
export interface UpdateTaskPayload {
    taskId: string;
    title?: string;
    description?: string | null;
    status?: TaskStatusType;
    priority?: TaskPriorityType;
    dueDate?: string | number | null;
    assigneeUid?: string | null;
    tags?: string[];
    approachParams?: TaskApproachParamsClientDto | null;
    pomodoroEstimatedMinutes?: number | null;
  }
export interface UpdateTaskResponse extends SuccessResponse {
    updatedTask: TaskClientDto;
  }
export interface DeleteTaskPayload {
    taskId: string;
  }
export interface CreateCommentPayload {
    taskId: string;
    text: string;
  }
export interface CreateCommentResponse {
    comment: CommentClientDto;
  }

export interface UpdateTaskStatusPayload {
    taskId: string;
    newStatus: TaskStatusType;
    workspaceId: string;
  }

/**
   * Payload для создания новой подзадачи.
   */
export interface CreateSubtaskPayload {
    parentTaskId: string;
    title: string;
    order?: number;
  }

/**
   * Payload для обновления подзадачи.
   */
export interface UpdateSubtaskPayload {
    parentTaskId: string;
    subtaskId: string;
    title?: string;
    completed?: boolean;
    order?: number;
  }

/**
   * Payload для удаления подзадачи.
   */
export interface DeleteSubtaskPayload {
    parentTaskId: string;
    subtaskId: string;
  }

// === DTO для Дельта-Синхронизации Задач ===

/**
   * Payload для запроса изменений по задачам.
   */
export interface GetTaskChangesPayload {
    since: string;
    workspaceIds: string[];
  }

/**
   * DTO ответа с изменениями по задачам.
   */
export interface GetTaskChangesResponse {
    updatedTasks: TaskClientDto[];
    deletedTaskCloudIds: string[];
    serverTimestamp: string;
  }
