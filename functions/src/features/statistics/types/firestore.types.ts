import {FieldValue, Timestamp} from "firebase-admin/firestore";

export interface TaskStatisticsDocument {
  completionTime: Timestamp | null;
  timeSpentSeconds: number;
  totalPomodoroFocusSeconds: number;
  completedPomodoroFocusSessions: number;
  totalPomodoroInterrupts: number;
  wasCompletedOnce: boolean;
  firstCompletionTime: Timestamp | null;
  updatedAt: Timestamp | FieldValue;
}

export interface GlobalStatisticsDocument {
  userId: string;
  totalPersonalWorkspacesCreated: number;
  totalTeamWorkspacesMemberOf: number;
  totalTasksCreated: number;
  totalTasksCompleted: number;
  totalPomodoroFocusMinutes: number;
  totalTimeSpentMinutesOverall: number;
  lastActive: Timestamp | FieldValue;
  registrationDate: Timestamp;
}
