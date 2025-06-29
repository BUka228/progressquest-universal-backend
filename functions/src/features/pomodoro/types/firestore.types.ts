import {FieldValue, Timestamp} from "firebase-admin/firestore";

export type PomodoroSessionType = "FOCUS" | "SHORT_BREAK" | "LONG_BREAK";

export interface PomodoroSessionDocument {
  userId: string;
  taskId: string;
  workspaceId: string;
  startTime: Timestamp | FieldValue;
  sessionType: PomodoroSessionType;
  plannedDurationSeconds: number;
  actualDurationSeconds: number;
  interruptions: number;
  completed: boolean;
  phaseNumberInCycle: number;
  totalFocusSessionIndex: number;
  updatedAt: Timestamp | FieldValue;
}
