import {PomodoroSessionType} from "./firestore.types";

// --- 7.6. Управление Pomodoro-сессиями ---
export interface StartPomodoroPhasePayload {
  taskId: string;
  workspaceId: string;
  sessionType: PomodoroSessionType;
  plannedDurationSeconds: number;
  phaseNumberInCycle?: number;
  totalFocusSessionIndex?: number;
}
export interface StartPomodoroPhaseResponse {
  sessionId: string;
}
export interface CompletePomodoroPhasePayload {
  sessionId: string;
  actualDurationSeconds: number;
  interruptions: number;
  completed: boolean;
}
