import {PomodoroSessionType} from "./firestore.types";
import {BaseEvent} from "../../user/types/events.types";

// --- 5. Pomodoro Events (Топик: pomodoro-events) ---
export interface PomodoroPhaseStartedEventData {
  sessionId: string;
  userId: string;
  taskId: string;
  workspaceId: string;
  phaseType: PomodoroSessionType;
  plannedDurationSeconds: number;
  phaseNumberInCycle: number;
  totalFocusSessionIndex: number;
  startTime: string;
}
export interface PomodoroPhaseStartedEvent extends BaseEvent {
  eventType: "POMODORO_PHASE_STARTED";
  data: PomodoroPhaseStartedEventData;
}

export interface PomodoroPhaseCompletedEventData {
  sessionId: string;
  userId: string;
  taskId: string;
  workspaceId: string;
  phaseType: PomodoroSessionType;
  plannedDurationSeconds: number;
  actualDurationSeconds: number;
  interruptions: number;
  completed: boolean;
  phaseStartTime: string;
  completionTime: string;
}
export interface PomodoroPhaseCompletedEventMessage extends BaseEvent {
  eventType: "POMODORO_PHASE_COMPLETED";
  data: PomodoroPhaseCompletedEventData;
}
