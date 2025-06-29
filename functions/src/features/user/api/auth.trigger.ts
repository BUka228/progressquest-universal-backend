import * as functionsV1 from "firebase-functions/v1";
import {
  getFirestore,
  FieldValue,
  Timestamp,
  Query,
} from "firebase-admin/firestore";
import {PubSub} from "@google-cloud/pubsub";

import {
  USERS_COLLECTION,
  WORKSPACES_COLLECTION,
  GAMIFICATION_PROFILES_COLLECTION,
  GLOBAL_STATISTICS_COLLECTION,
  USER_EVENTS_TOPIC,
  functionRegion,
  TASKS_COLLECTION,
} from "../../../config";
import {WorkspaceDocument} from "../../workspace/types/firestore.types";
import {GlobalStatisticsDocument} from "../../statistics/types/firestore.types";
import {
  GamificationProfileDocument,
} from "../../gamification/types/firestore.types";
import {
  UserDocument,
} from "../types/firestore.types";
import {UserCreatedEventData} from "../types/events.types";

const db = getFirestore();
const pubsub = new PubSub();
const BATCH_SIZE = 500;

/**
 * Рекурсивно удаляет документы из коллекции или по запросу пачками.
 * @param {Query} query Запрос для получения документов.
 * @param {number} batchSize Размер пачки для удаления.
 * @return {Promise<void>}
 */
async function deleteCollection(
  query: Query,
  batchSize: number
): Promise<void> {
  const snapshot = await query.limit(batchSize).get();

  if (snapshot.size === 0) {
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteCollection(query, batchSize);
  });
}

export const processNewUser = functionsV1
  .region(functionRegion)
  .auth.user()
  .onCreate(async (user) => {
    const {uid, email, displayName, photoURL, metadata} = user;
    const now = FieldValue.serverTimestamp();

    const creationTime = metadata.creationTime ?
      new Date(metadata.creationTime) :
      new Date();
    const lastSignInTime = metadata.lastSignInTime ?
      new Date(metadata.lastSignInTime) :
      new Date();

    console.log(`[AuthTrigger] Processing new user: ${uid}, Email: ${email}`);

    const userDocRef = db.collection(USERS_COLLECTION).doc(uid);
    const gamificationProfileRef = db
      .collection(GAMIFICATION_PROFILES_COLLECTION)
      .doc(uid);
    const globalStatsRef = db
      .collection(GLOBAL_STATISTICS_COLLECTION)
      .doc(uid);
    const personalWorkspaceRef = db
      .collection(WORKSPACES_COLLECTION)
      .doc();

    const batch = db.batch();

    const newUserDocData: UserDocument = {
      uid,
      email: email || "",
      displayName: displayName || `User-${uid.substring(0, 5)}`,
      avatarUrl: photoURL || null,
      createdAt: Timestamp.fromDate(creationTime),
      lastLoginAt: Timestamp.fromDate(lastSignInTime),
      personalWorkspaceId: personalWorkspaceRef.id,
      activeItems: {
        workspaceId: personalWorkspaceRef.id,
        viewId: null,
      },
      defaultViewId: null,
      appSettings: {
        theme: "SYSTEM",
        dynamicColorEnabled: true,
        notificationsEnabled: true,
        taskNotifications: true,
        pomodoroNotifications: true,
        gamificationNotifications: true,
      },
      pomodoroSettings: {
        focusDurationMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        intervalBeforeLongBreak: 4,
        autoStartFocus: false,
        autoStartBreak: true,
        focusSoundUri: null,
        breakSoundUri: null,
        vibrationEnabled: true,
      },
      teamMemberships: [],
    };
    batch.set(userDocRef, newUserDocData);

    const personalWorkspaceData: Omit<WorkspaceDocument, "id"> = {
      name: "Личное пространство",
      description: "Мои задачи и проекты",
      ownerUid: uid,
      isPersonal: true,
      teamId: null,
      createdAt: now,
      updatedAt: now,
      activeApproach: "CALENDAR",
      defaultTags: ["важно", "идея"],
      settings: {
        allowMembersToCreateTasks: true,
        taskVisibility: "all_visible",
        pomodoroOverrides: null,
      },
      lastClientSyncTimestamp: null,
      syncStatus: "pending_upload",
    };
    batch.set(personalWorkspaceRef, personalWorkspaceData);

    const gamificationProfileData: GamificationProfileDocument = {
      level: 1,
      experience: 0,
      coins: 50,
      maxExperienceForLevel: 100,
      currentStreak: 0,
      lastClaimedDate: Timestamp.fromDate(new Date(0)),
      maxStreak: 0,
      selectedPlantInstanceId: null,
      lastPomodoroCompletionTime: null,
      lastTaskCompletionTime: null,
    };
    batch.set(gamificationProfileRef, gamificationProfileData);

    const globalStatsData: GlobalStatisticsDocument = {
      userId: uid,
      totalPersonalWorkspacesCreated: 1,
      totalTeamWorkspacesMemberOf: 0,
      totalTasksCreated: 0,
      totalTasksCompleted: 0,
      totalPomodoroFocusMinutes: 0,
      totalTimeSpentMinutesOverall: 0,
      lastActive: now,
      registrationDate: Timestamp.fromDate(creationTime),
    };
    batch.set(globalStatsRef, globalStatsData);

    try {
      await batch.commit();
      console.log(`[AuthTrigger] User documents created for UID: ${uid}`);

      const eventPayload: UserCreatedEventData = {
        userId: uid,
        email: email || undefined,
        displayName: displayName || undefined,
      };
      await pubsub.topic(USER_EVENTS_TOPIC).publishMessage({
        json: {
          eventType: "USER_CREATED",
          eventTimestamp: new Date().toISOString(),
          data: eventPayload,
        },
      });
      console.log(
        `[AuthTrigger] Event USER_CREATED published for UID: ${uid}`
      );
    } catch (error) {
      console.error(
        `[AuthTrigger] Error in onUserCreate for UID: ${uid}`,
        error
      );
    }
  });

export const processUserDeletion = functionsV1
  .region(functionRegion)
  .auth.user()
  .onDelete(async (user) => {
    const {uid} = user;
    console.log(`[AuthTrigger] Deleting data for user UID: ${uid}`);

    const batch = db.batch();

    batch.delete(db.collection(USERS_COLLECTION).doc(uid));
    batch.delete(db
      .collection(GAMIFICATION_PROFILES_COLLECTION)
      .doc(uid));
    batch.delete(db.collection(GLOBAL_STATISTICS_COLLECTION).doc(uid));

    try {
      await batch.commit();
      console.log(`[AuthTrigger] Core user documents for ${uid} deleted.`);
    } catch (error) {
      console.error(
        `[AuthTrigger] Error deleting core documents for UID: ${uid}`,
        error
      );
    }

    const personalWorkspacesQuery = db
      .collection(WORKSPACES_COLLECTION)
      .where("ownerUid", "==", uid)
      .where("isPersonal", "==", true);
    const tasksQuery = db
      .collection(TASKS_COLLECTION)
      .where("creatorUid", "==", uid);

    const fcmTokensQuery = db
      .collection(USERS_COLLECTION)
      .doc(uid)
      .collection("fcmTokens");
    const earnedBadgesQuery = db
      .collection(GAMIFICATION_PROFILES_COLLECTION)
      .doc(uid)
      .collection("earnedBadges");

    try {
      await Promise.all([
        deleteCollection(personalWorkspacesQuery, BATCH_SIZE),
        deleteCollection(tasksQuery, BATCH_SIZE),
        deleteCollection(fcmTokensQuery, BATCH_SIZE),
        deleteCollection(earnedBadgesQuery, BATCH_SIZE),
      ]);
      console.log(
        `[AuthTrigger] All associated data for user ${uid} ` +
        "has been queued for deletion."
      );
    } catch (error) {
      console.error(
        "[AuthTrigger] Critical error during collection deletion " +
        `for UID: ${uid}`,
        error
      );
    }
  });
