import {HttpsError, onCall} from "firebase-functions/v2/https";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {runtimeOptsV2, USERS_COLLECTION} from "../config";
import {assertAuthenticated} from "../utils";
import {
  UserDocument,
  UpdateUserProfilePayload,
  UpdateUserAppSettingsPayload,
  UpdateUserPomodoroSettingsPayload,
  UpdateUserActiveItemsPayload,
} from "../types";

const db = getFirestore();

export const getCurrentUserProfile = onCall(
  runtimeOptsV2,
  async (request) => {
    const uid = assertAuthenticated(request.auth);
    try {
      const userDocRef = db.collection(USERS_COLLECTION).doc(uid);
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "Профиль пользователя не найден.");
      }
      return userDoc.data() as UserDocument;
    } catch (error: any) {
      console.error(
        `Error fetching profile for user ${uid}:`,
        error.message
      );
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Не удалось получить профиль.",
        error.message
      );
    }
  }
);

export const updateUserProfile = onCall(runtimeOptsV2, async (request) => {
  const uid = assertAuthenticated(request.auth);
  const data = request.data as UpdateUserProfilePayload;
  const updates: Partial<UserDocument> = {};

  if (typeof data.displayName === "string") {
    updates.displayName = data.displayName;
  }
  if (typeof data.avatarUrl === "string" || data.avatarUrl === null) {
    updates.avatarUrl = data.avatarUrl;
  }

  if (Object.keys(updates).length === 0) {
    throw new HttpsError("invalid-argument", "Нет данных для обновления.");
  }
  updates.lastLoginAt = FieldValue.serverTimestamp();

  try {
    await db.collection(USERS_COLLECTION).doc(uid).update(updates);
    return {success: true, message: "Профиль обновлен."};
  } catch (error: any) {
    console.error(
      `Error updating profile for user ${uid}:`,
      error.message
    );
    throw new HttpsError(
      "internal",
      "Не удалось обновить профиль.",
      error.message
    );
  }
});

export const updateUserAppSettings = onCall(
  runtimeOptsV2,
  async (request) => {
    const uid = assertAuthenticated(request.auth);
    const data = request.data as UpdateUserAppSettingsPayload;
    try {
      await db
        .collection(USERS_COLLECTION)
        .doc(uid)
        .set({appSettings: data}, {merge: true});
      return {success: true, message: "Настройки приложения обновлены."};
    } catch (error: any) {
      console.error(
        `Error updating app settings for ${uid}:`,
        error.message
      );
      throw new HttpsError(
        "internal",
        "Ошибка обновления настроек.",
        error.message
      );
    }
  }
);

export const updateUserPomodoroSettings = onCall(
  runtimeOptsV2,
  async (request) => {
    const uid = assertAuthenticated(request.auth);
    const data = request.data as UpdateUserPomodoroSettingsPayload;
    try {
      await db
        .collection(USERS_COLLECTION)
        .doc(uid)
        .set({pomodoroSettings: data}, {merge: true});
      return {success: true, message: "Настройки Pomodoro обновлены."};
    } catch (error: any) {
      console.error(
        `Error updating pomodoro settings for ${uid}:`,
        error.message
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
  runtimeOptsV2,
  async (request) => {
    const uid = assertAuthenticated(request.auth);
    const data = request.data as UpdateUserActiveItemsPayload;
    const updates: any = {};
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
      return {success: true, message: "Активные элементы обновлены."};
    } catch (error: any) {
      console.error(
        `Error updating active items for ${uid}:`,
        error.message
      );
      throw new HttpsError(
        "internal",
        "Ошибка обновления.",
        error.message
      );
    }
  }
);
