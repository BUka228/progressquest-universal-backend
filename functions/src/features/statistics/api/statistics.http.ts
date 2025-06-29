import {
  HttpsError,
  onCall,
  CallableRequest,
} from "firebase-functions/v2/https";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import {
  commonRuntimeOpts,
  GLOBAL_STATISTICS_COLLECTION,
  TASK_STATISTICS_COLLECTION,
  GAMIFICATION_HISTORY_COLLECTION,
} from "../../../config";
import {assertAuthenticated} from "../../../core/utils/auth.utils";
import {
  GamificationHistoryEntryDocument,
} from "../../gamification/types/firestore.types";
import {
  GlobalStatisticsDocument,
  TaskStatisticsDocument,
} from "../types/firestore.types";
import {
  GetGlobalStatisticsResponse,
  GetTaskStatisticsResponse,
  GetGamificationHistoryPayload,
  GetGamificationHistoryResponse,
  GamificationHistoryEntryClientDto,
  GetTaskStatisticsPayload,
  TaskStatisticsClientDto,
  StatsPeriodSummaryClientDto,
  StatsTrendRequestPayload,
} from "../types/api.types";

const db = getFirestore();
const logger = functions.logger;

export const getGlobalStatistics = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request: CallableRequest): Promise<GetGlobalStatisticsResponse> => {
    const uid = assertAuthenticated(request.auth);
    try {
      const doc = await db
        .collection(GLOBAL_STATISTICS_COLLECTION)
        .doc(uid)
        .get();
      if (!doc.exists) {
        throw new HttpsError("not-found", "Статистика не найдена.");
      }
      const data = doc.data() as GlobalStatisticsDocument;
      return {
        statistics: {
          ...data,
          lastActive: (
            data.lastActive as Timestamp
          ).toDate().toISOString(),
          registrationDate: (
            data.registrationDate as Timestamp
          ).toDate().toISOString(),
        },
      };
    } catch (error) {
      logger.error(
        `[Stats] Error fetching global stats for ${uid}:`,
        error
      );
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Ошибка загрузки статистики."
      );
    }
  }
);

export const getTaskStatistics = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<GetTaskStatisticsPayload>
  ): Promise<GetTaskStatisticsResponse> => {
    assertAuthenticated(request.auth);
    const {taskId} = request.data;
    if (!taskId) {
      throw new HttpsError("invalid-argument", "Необходим ID задачи.");
    }

    try {
      const doc = await db
        .collection(TASK_STATISTICS_COLLECTION)
        .doc(taskId)
        .get();
      if (!doc.exists) {
        throw new HttpsError(
          "not-found",
          "Статистика для задачи не найдена."
        );
      }

      const data = doc.data() as TaskStatisticsDocument;
      const responseDto: TaskStatisticsClientDto = {
        completionTime: data.completionTime ?
          (data.completionTime as Timestamp).toDate().toISOString() :
          null,
        timeSpentSeconds: data.timeSpentSeconds,
        totalPomodoroFocusSeconds: data.totalPomodoroFocusSeconds,
        completedPomodoroFocusSessions:
          data.completedPomodoroFocusSessions,
        totalPomodoroInterrupts: data.totalPomodoroInterrupts,
        wasCompletedOnce: data.wasCompletedOnce,
        firstCompletionTime: data.firstCompletionTime ?
          (
            data.firstCompletionTime as Timestamp
          ).toDate().toISOString() :
          null,
        updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
      };
      return {statistics: responseDto};
    } catch (error) {
      logger.error(
        `[Stats] Error fetching task stats for ${taskId}:`,
        error
      );
      throw new HttpsError(
        "internal",
        "Ошибка загрузки статистики задачи."
      );
    }
  }
);

export const getGamificationHistory = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<GetGamificationHistoryPayload>
  ): Promise<GetGamificationHistoryResponse> => {
    const uid = assertAuthenticated(request.auth);
    const {limit = 20, startAfterEntryId} = request.data;

    try {
      let query = db
        .collection(GAMIFICATION_HISTORY_COLLECTION)
        .where("userId", "==", uid)
        .orderBy("timestamp", "desc")
        .limit(limit);

      if (startAfterEntryId) {
        const lastDoc = await db
          .collection(GAMIFICATION_HISTORY_COLLECTION)
          .doc(startAfterEntryId)
          .get();
        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }

      const snapshot = await query.get();
      const history: GamificationHistoryEntryClientDto[] =
        snapshot.docs.map((doc) => {
          const data = doc.data() as GamificationHistoryEntryDocument;
          return {
            id: doc.id,
            timestamp: (
              data.timestamp as Timestamp
            ).toDate().toISOString(),
            eventType: data.eventType,
            xpChange: data.xpChange,
            coinsChange: data.coinsChange,
            relatedEntityCloudId: data.relatedEntityId,
            relatedEntityType: data.relatedEntityType,
            description: data.description,
          };
        });

      const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
      const nextPageToken = lastVisibleDoc ?
        lastVisibleDoc.id :
        null;

      return {history, nextPageToken};
    } catch (error) {
      logger.error(
        `[Stats] Error fetching gamification history for ${uid}:`,
        error
      );
      throw new HttpsError(
        "internal",
        "Ошибка загрузки истории."
      );
    }
  }
);

export const getStatsPeriodSummary = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<StatsTrendRequestPayload>
  ): Promise<StatsPeriodSummaryClientDto> => {
    assertAuthenticated(request.auth);
    // Это сложная функция, которая требует агрегации данных.
    // Для MVP она возвращает заглушку.
    logger.warn(
      "[Stats] getStatsPeriodSummary is a placeholder and not implemented."
    );
    return {
      startDate: request.data.startDate,
      endDate: request.data.endDate,
    };
  }
);
