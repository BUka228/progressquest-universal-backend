import {
  getFirestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";
import {PubSub} from "@google-cloud/pubsub";
import * as functions from "firebase-functions";
import {HttpsError} from "firebase-functions/v2/https";

import {
  USERS_COLLECTION,
  USER_EVENTS_TOPIC,
} from "../../../config";
import {UserDocument} from "../types/firestore.types";
import {
  UpdateUserProfilePayload,
  UpdateUserProfileResponse,
} from "../types/api.types";
import {UserProfileUpdatedEventData} from "../types/events.types";

const db = getFirestore();
const authAdmin = getAuth();
const pubsub = new PubSub();
const logger = functions.logger;

type UpdatableProfileFields = Pick<UserDocument, "displayName" | "avatarUrl">;
type UpdatableProfileFieldKey = keyof UpdatableProfileFields;

/**
 * Use case для обновления профиля пользователя.
 */
export class UpdateUserProfileUseCase {
  /**
   * Выполняет use case для обновления профиля пользователя.
   * @param {string} uid ID пользователя.
   * @param {UpdateUserProfilePayload} data Данные для обновления.
   * @return {Promise<UpdateUserProfileResponse>} Ответ с обновленным профилем.
   */
  async execute(
    uid: string,
    data: UpdateUserProfilePayload
  ): Promise<UpdateUserProfileResponse> {
    const userDocRef = db.collection(USERS_COLLECTION).doc(uid);

    const updates: Partial<UpdatableProfileFields> = {};
    const updatedFields: UpdatableProfileFieldKey[] = [];

    if (typeof data.displayName === "string") {
      updates.displayName = data.displayName.trim();
      updatedFields.push("displayName");
    }
    if (data.avatarUrl !== undefined) {
      updates.avatarUrl = data.avatarUrl;
      updatedFields.push("avatarUrl");
    }

    if (updatedFields.length === 0) {
      throw new HttpsError("invalid-argument", "Нет данных для обновления.");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updates as any).lastLoginAt = FieldValue.serverTimestamp();

    try {
      await userDocRef.update(updates);
      const authUpdates: {displayName?: string; photoURL?: string | null} = {};
      if (updates.displayName) {
        authUpdates.displayName = updates.displayName;
      }
      if (updates.avatarUrl !== undefined) {
        authUpdates.photoURL = updates.avatarUrl;
      }
      if (Object.keys(authUpdates).length > 0) {
        await authAdmin.updateUser(uid, authUpdates);
      }

      const eventPayload: UserProfileUpdatedEventData = {
        userId: uid,
        updatedFields,
      };
      await pubsub.topic(USER_EVENTS_TOPIC).publishMessage({
        json: {
          eventType: "USER_PROFILE_UPDATED",
          data: eventPayload,
          eventTimestamp: new Date().toISOString(),
        },
      });

      const updatedDoc = await userDocRef.get();
      const updatedData = updatedDoc.data() as UserDocument;
      return {
        success: true,
        updatedProfile: {
          ...updatedData,
          createdAt: (updatedData.createdAt as Timestamp)
            .toDate()
            .toISOString(),
          lastLoginAt: (updatedData.lastLoginAt as Timestamp)
            .toDate()
            .toISOString(),
        },
      } as unknown as UpdateUserProfileResponse;
    } catch (error) {
      logger.error(`[Users] Error updating profile for ${uid}:`, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Ошибка обновления профиля.",
        (error as Error).message
      );
    }
  }
}
