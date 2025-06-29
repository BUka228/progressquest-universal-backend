import {
  HttpsError,
  onCall,
  CallableRequest,
} from "firebase-functions/v2/https";
import {
  getFirestore,
  FieldValue,
  Timestamp,
  WriteBatch,
} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";
import * as functions from "firebase-functions";

import {
  commonRuntimeOpts,
  USERS_COLLECTION,
  GAMIFICATION_PROFILES_COLLECTION,
  GLOBAL_STATISTICS_COLLECTION,
  WORKSPACES_COLLECTION,
  TASKS_COLLECTION,
} from "../../../config";
import {assertAuthenticated} from "../../../core/utils/auth.utils";
import {WorkspaceDocument} from "../../workspace/types/firestore.types";
import {TaskDocument, TaskPriorityType} from "../../task/types/firestore.types";
import {
  UserDocument,
  FcmTokenDocument,
  ActiveItems,
} from "../types/firestore.types";
import {
  GetUserProfileResponse,
  UpdateUserProfilePayload,
  UpdateUserAppSettingsPayload,
  UpdateUserAppSettingsResponse,
  UpdateUserPomodoroSettingsPayload,
  UpdateUserPomodoroSettingsResponse,
  UpdateUserActiveItemsPayload,
  UpdateUserActiveItemsResponse,
  SendPasswordResetEmailPayload,
  RegisterFcmTokenPayload,
  UnregisterFcmTokenPayload,
  MigrateGuestDataPayload,
  MigrateGuestDataResponse,
  UpdateUserProfileResponse,
} from "../types/api.types";
import {SuccessResponse} from "../../../core/types/api.types";

const db = getFirestore();
const authAdmin = getAuth();
const logger = functions.logger;

// --- Профиль и Настройки ---

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const getCurrentUserProfile = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request: CallableRequest): Promise<GetUserProfileResponse> => {
    const uid = assertAuthenticated(request.auth);
    const userDocRef = db.collection(USERS_COLLECTION).doc(uid);

    try {
      let userDoc = await userDocRef.get();
      let attempts = 0;
      const maxAttempts = 5;
      const retryDelay = 500;

      while (!userDoc.exists && attempts < maxAttempts) {
        attempts++;
        logger.warn(
          `[Users] Profile for user ${uid} not found on attempt ${attempts}. ` +
          `Retrying in ${retryDelay}ms...`
        );
        await delay(retryDelay);
        userDoc = await userDocRef.get();
      }

      if (!userDoc.exists) {
        logger.error(
          `[Users] Profile for user ${uid} not found ` +
          `after ${maxAttempts} attempts.`
        );
        throw new HttpsError(
          "not-found",
          "Профиль пользователя не найден. Пожалуйста, попробуйте войти снова."
        );
      }

      const userData = userDoc.data() as UserDocument;
      const clientProfile = {
        ...userData,
        createdAt: (userData.createdAt as Timestamp).toDate()
          .toISOString(),
        lastLoginAt: (userData.lastLoginAt as Timestamp).toDate()
          .toISOString(),
      };

      return {
        userProfile: clientProfile,
      } as unknown as GetUserProfileResponse;
    } catch (error: unknown) {
      logger.error(`[Users] Error fetching profile for ${uid}:`, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Ошибка получения профиля.",
        (error as Error).message
      );
    }
  }
);

import {UpdateUserProfileUseCase} from "../domain/UpdateUserProfileUseCase";

export const updateUserProfile = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<UpdateUserProfilePayload>
  ): Promise<UpdateUserProfileResponse> => {
    const uid = assertAuthenticated(request.auth);
    return await new UpdateUserProfileUseCase().execute(uid, request.data);
  }
);

export const updateUserAppSettings = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<UpdateUserAppSettingsPayload>
  ): Promise<UpdateUserAppSettingsResponse> => {
    const uid = assertAuthenticated(request.auth);
    const data = request.data;
    if (Object.keys(data).length === 0) {
      throw new HttpsError("invalid-argument", "Нет данных для обновления.");
    }
    try {
      await db
        .collection(USERS_COLLECTION)
        .doc(uid)
        .set({appSettings: data}, {merge: true});
      logger.log(`[Users] App settings updated for user ${uid}.`);
      const updatedDoc = await db.collection(USERS_COLLECTION).doc(uid).get();
      const newSettings = (updatedDoc.data() as UserDocument).appSettings;
      return {success: true, appSettings: newSettings};
    } catch (error: any) {
      logger.error(`[Users] Error updating app settings for ${uid}:`, error);
      throw new HttpsError(
        "internal",
        "Ошибка обновления настроек.",
        error.message
      );
    }
  }
);

export const updateUserPomodoroSettings = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<UpdateUserPomodoroSettingsPayload>
  ): Promise<UpdateUserPomodoroSettingsResponse> => {
    const uid = assertAuthenticated(request.auth);
    const data = request.data;
    if (Object.keys(data).length === 0) {
      throw new HttpsError("invalid-argument", "Нет данных для обновления.");
    }
    try {
      await db
        .collection(USERS_COLLECTION)
        .doc(uid)
        .set({pomodoroSettings: data}, {merge: true});
      logger.log(`[Users] Pomodoro settings updated for user ${uid}.`);
      const updatedDoc = await db.collection(USERS_COLLECTION).doc(uid).get();
      const newSettings = (updatedDoc.data() as UserDocument).pomodoroSettings;
      return {success: true, pomodoroSettings: newSettings};
    } catch (error: any) {
      logger.error(
        `[Users] Error updating pomodoro settings for ${uid}:`,
        error
      );
      throw new HttpsError(
        "internal",
        "Ошибка обновления настроек.",
        error.message
      );
    }
  }
);

export const updateUserActiveItems = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<UpdateUserActiveItemsPayload>
  ): Promise<UpdateUserActiveItemsResponse> => {
    const uid = assertAuthenticated(request.auth);
    const data = request.data;
    const updates: {[key: string]: any} = {};

    if (data.workspaceId !== undefined) {
      updates["activeItems.workspaceId"] = data.workspaceId;
    }
    if (data.viewId !== undefined) {
      updates["activeItems.viewId"] = data.viewId;
    }

    if (Object.keys(updates).length === 0) {
      throw new HttpsError("invalid-argument", "Нет данных для обновления.");
    }

    try {
      await db.collection(USERS_COLLECTION).doc(uid).update(updates);
      logger.log(`[Users] Active items updated for user ${uid}.`);
      const userDoc = await db.collection(USERS_COLLECTION).doc(uid).get();
      const activeItems = (userDoc.data() as UserDocument)?.activeItems || {
        workspaceId: null,
        viewId: null,
      };
      return {success: true, activeItems: activeItems as ActiveItems};
    } catch (error: any) {
      logger.error(`[Users] Error updating active items for ${uid}:`, error);
      throw new HttpsError(
        "internal",
        "Ошибка обновления активных элементов.",
        error.message
      );
    }
  }
);

// --- Управление Учетными Данными ---

export const sendPasswordResetEmail = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<SendPasswordResetEmailPayload>
  ): Promise<SuccessResponse> => {
    const email = request.data.email;
    if (!email || !/.+@.+\..+/.test(email)) {
      throw new HttpsError(
        "invalid-argument",
        "Предоставлен некорректный email."
      );
    }
    try {
      await authAdmin.getUserByEmail(email);
      logger.log(
        `[Users] Password reset request for existing user: ${email}. ` +
        "NOTE: Actual email sending is not implemented."
      );
      return {
        success: true,
        message: "Если пользователь существует, ему будет отправлено письмо.",
      };
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        logger.warn(
          `[Users] Password reset requested for non-existent email: ${email}`
        );
        return {
          success: true,
          message: "Если пользователь существует, ему будет отправлено письмо.",
        };
      }
      logger.error(
        `[Users] Error during password reset request for ${email}:`,
        error
      );
      throw new HttpsError(
        "internal",
        "Произошла ошибка при сбросе пароля.",
        error.message
      );
    }
  }
);

export const registerFcmToken = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<RegisterFcmTokenPayload>
  ): Promise<SuccessResponse> => {
    const uid = assertAuthenticated(request.auth);
    const {token, platform, deviceName} = request.data;
    if (!token) {
      throw new HttpsError("invalid-argument", "FCM токен обязателен.");
    }

    const tokenRef = db
      .collection(USERS_COLLECTION)
      .doc(uid)
      .collection("fcmTokens")
      .doc(token);
    const now = Timestamp.now();
    const tokenDoc: FcmTokenDocument = {
      token,
      platform: platform || "unknown",
      createdAt: now,
      lastUsedAt: now,
      ...(deviceName && {deviceName}),
    };

    try {
      await tokenRef.set(tokenDoc, {merge: true});
      logger.log(`[Users] FCM token registered/updated for UID: ${uid}`);
      return {success: true};
    } catch (error: any) {
      logger.error(`[Users] Error reg FCM token for UID ${uid}:`, error);
      throw new HttpsError(
        "internal",
        "Не удалось зарегистрировать токен.",
        error.message
      );
    }
  }
);

export const unregisterFcmToken = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<UnregisterFcmTokenPayload>
  ): Promise<SuccessResponse> => {
    const uid = assertAuthenticated(request.auth);
    const {token} = request.data;
    if (!token) {
      throw new HttpsError("invalid-argument", "FCM токен обязателен.");
    }

    const tokenRef = db
      .collection(USERS_COLLECTION)
      .doc(uid)
      .collection("fcmTokens")
      .doc(token);

    try {
      await tokenRef.delete();
      logger.log(`[Users] FCM token unregistered for UID: ${uid}`);
      return {success: true};
    } catch (error: any) {
      logger.error(
        `[Users] Error unregistering FCM token for UID ${uid}:`,
        error
      );
      throw new HttpsError(
        "internal",
        "Не удалось удалить регистрацию токена.",
        error.message
      );
    }
  }
);

// --- Специализированные Операции ---

/**
 * Удаляет основные документы пользователя из Firestore.
 * @param {string} uid UID пользователя.
 */
async function deleteUserData(uid: string) {
  logger.info(`[Users:deleteUserData] Deleting core documents for ${uid}`);
  const batch = db.batch();
  batch.delete(db.collection(USERS_COLLECTION).doc(uid));
  batch.delete(db.collection(GAMIFICATION_PROFILES_COLLECTION).doc(uid));
  batch.delete(db.collection(GLOBAL_STATISTICS_COLLECTION).doc(uid));
  await batch.commit();
}

export const requestAccountDeletion = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request: CallableRequest): Promise<SuccessResponse> => {
    const uid = assertAuthenticated(request.auth);
    logger.warn(
      `[Users] Account deletion requested by UID: ${uid}. This is irreversible.`
    );
    try {
      await deleteUserData(uid);
      await authAdmin.deleteUser(uid);
      logger.log(
        `[Users] Account for UID: ${uid} has been successfully deleted.`
      );
      return {success: true, message: "Аккаунт успешно удален."};
    } catch (error: any) {
      logger.error(
        `[Users] CRITICAL: Failed during account deletion for UID ${uid}:`,
        error
      );
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Произошла критическая ошибка при удалении аккаунта.",
        error.message
      );
    }
  }
);

export const migrateGuestData = onCall(
  {...commonRuntimeOpts, timeoutSeconds: 300},
  async (
    request: CallableRequest<MigrateGuestDataPayload>
  ): Promise<MigrateGuestDataResponse> => {
    const uid = assertAuthenticated(request.auth);
    const data = request.data;
    if (!data.workspaces || !Array.isArray(data.workspaces)) {
      throw new HttpsError(
        "invalid-argument",
        "Отсутствует или некорректен массив рабочих пространств."
      );
    }
    logger.log(
      `[Users] Starting guest data migration for UID: ${uid}. ` +
      `Workspaces to migrate: ${data.workspaces.length}`
    );

    const idMappings: {
      workspaces: Record<string, string>;
      tasks: Record<string, string>;
    } = {workspaces: {}, tasks: {}};
    const now = FieldValue.serverTimestamp();
    const batches: WriteBatch[] = [db.batch()];
    let currentBatchIndex = 0;
    let operationCount = 0;

    try {
      for (const ws of data.workspaces) {
        if (operationCount >= 500 - 10) {
          batches.push(db.batch());
          currentBatchIndex++;
          operationCount = 0;
        }

        const newWsRef = db.collection(WORKSPACES_COLLECTION).doc();
        idMappings.workspaces[ws.localId] = newWsRef.id;
        const newWsData: Omit<WorkspaceDocument, "id"> = {
          name: ws.name,
          description: ws.description || null,
          ownerUid: uid,
          isPersonal: true,
          teamId: null,
          createdAt: now,
          updatedAt: now,
          activeApproach: ws.activeApproach || "CALENDAR",
          defaultTags: [],
          settings: {
            allowMembersToCreateTasks: true,
            taskVisibility: "all_visible",
          },
          lastClientSyncTimestamp: null,
          syncStatus: "synced",
        };
        batches[currentBatchIndex].set(newWsRef, newWsData);
        operationCount++;

        for (const task of ws.tasks) {
          if (operationCount >= 500) {
            batches.push(db.batch());
            currentBatchIndex++;
            operationCount = 0;
          }
          const newTaskRef = db.collection(TASKS_COLLECTION).doc();
          idMappings.tasks[task.localId] = newTaskRef.id;
          const newTaskData: Omit<TaskDocument, "id"> = {
            title: task.title,
            description: task.description || null,
            status: "TODO",
            priority: task.priority as TaskPriorityType || "MEDIUM",
            dueDate: task.dueDate ?
              Timestamp.fromMillis(Number(task.dueDate)) :
              null,
            createdAt: now,
            updatedAt: now,
            completedAt: null,
            creatorUid: uid,
            assigneeUid: uid,
            workspaceId: newWsRef.id,
            tags: task.tags || [],
            pomodoroEstimatedCycles: null,
            pomodoroEstimatedMinutes: task.pomodoroEstimatedMinutes || null,
            approachParams: null,
            orderInList: 0,
            lastSyncClientTimestamp: null,
            localId: task.localId,
          };
          batches[currentBatchIndex].set(newTaskRef, newTaskData);
          operationCount++;
        }
      }

      await Promise.all(batches.map((b) => b.commit()));
      logger.log(`[Users] Guest data migration successful for UID: ${uid}.`);
      return {success: true, idMappings};
    } catch (error: any) {
      logger.error(
        `[Users] Error during guest data migration for UID ${uid}:`,
        error
      );
      throw new HttpsError(
        "internal",
        "Ошибка миграции данных.",
        error.message
      );
    }
  }
);
