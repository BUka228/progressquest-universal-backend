import {FieldValue, Timestamp} from "firebase-admin/firestore";

export type TaskStatusType = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriorityType = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type FrogDifficultyType = "EASY" | "MEDIUM" | "HARD";

export interface CalendarApproachParams {
  eventId: string | null;
  isAllDay: boolean;
  recurrenceRule: string | null;
}
export interface GtdApproachParams {
  context: string | null;
  nextAction: boolean;
  projectLink: string | null;
  waitingFor: string | null;
}
export interface EisenhowerApproachParams {
  urgency: number;
  importance: number;
}
export interface FrogApproachParams {
  isFrog: boolean;
  difficulty: FrogDifficultyType;
}

export interface TaskDocument {
  title: string;
  description: string | null;
  status: TaskStatusType;
  priority: TaskPriorityType;
  dueDate: Timestamp | null;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  completedAt: Timestamp | null;
  creatorUid: string;
  assigneeUid: string | null;
  workspaceId: string;
  tags: string[];
  pomodoroEstimatedCycles: number | null;
  pomodoroEstimatedMinutes: number | null;
  approachParams: {
    calendar?: CalendarApproachParams;
    gtd?: GtdApproachParams;
    eisenhower?: EisenhowerApproachParams;
    frog?: FrogApproachParams;
  } | null;
  orderInList: number;
  lastSyncClientTimestamp: Timestamp | null;
  localId: string | null;
}

export interface SubtaskDocument {
  title: string;
  completed: boolean;
  order: number;
  createdAt: Timestamp | FieldValue;
}

export interface CommentDocument {
  authorUid: string;
  authorName: string;
  authorAvatarUrl: string | null;
  text: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue | null;
}
