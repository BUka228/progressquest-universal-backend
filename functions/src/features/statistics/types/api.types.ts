// --- Статистика ---
export interface GetTaskStatisticsPayload {
  taskId: string;
}

export interface TaskStatisticsClientDto {
  completionTime: string | null; // ISO 8601
  timeSpentSeconds: number;
  totalPomodoroFocusSeconds: number;
  completedPomodoroFocusSessions: number;
  totalPomodoroInterrupts: number;
  wasCompletedOnce: boolean;
  firstCompletionTime: string | null;
  updatedAt: string; // ISO 8601
}

export interface GetTaskStatisticsResponse {
  statistics: TaskStatisticsClientDto;
}

export interface GetGamificationHistoryPayload {
  limit?: number;
  startAfterEntryId?: string | null;
}

export interface GamificationHistoryEntryClientDto {
  id: string;
  timestamp: string; // ISO 8601
  eventType: string;
  xpChange: number;
  coinsChange: number;
  relatedEntityCloudId: string | null;
  relatedEntityType: "task" | "challenge" | "badge" | "plant" | null;
  description: string | null;
}

export interface GetGamificationHistoryResponse {
  history: GamificationHistoryEntryClientDto[];
  nextPageToken: string | null;
}

export interface StatsTrendRequestPayload {
  startDate: string;
  endDate: string;
}


export interface DateValuePointClientDto {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface DayOfWeekValuePointClientDto {
  dayOfWeek: number; // 1 (Пн) - 7 (Вс)
  value: number;
}

export interface StatsPeriodSummaryClientDto {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  taskCompletionTrend?: DateValuePointClientDto[];
  pomodoroFocusTrend?: DateValuePointClientDto[];
  xpGainTrend?: DateValuePointClientDto[];
  coinGainTrend?: DateValuePointClientDto[];
  tasksCompletedByDayOfWeek?: DayOfWeekValuePointClientDto[];
  totalTasksCompletedInPeriod?: number;
  totalPomodoroMinutesInPeriod?: number;
  averageDailyPomodoroMinutes?: number;
  totalXpGainedInPeriod?: number;
  totalCoinsGainedInPeriod?: number;
  mostProductiveDayInPeriod?: string | null;
  averageTasksPerDayInPeriod?: number;
}

export interface GetGlobalStatisticsResponse {
    statistics: {
        userId: string;
        totalPersonalWorkspacesCreated: number;
        totalTeamWorkspacesMemberOf: number;
        totalTasksCreated: number;
        totalTasksCompleted: number;
        totalPomodoroFocusMinutes: number;
        totalTimeSpentMinutesOverall: number;
        lastActive: string; // ISO
        registrationDate: string; // ISO
    };
}
