import {HttpsError} from "firebase-functions/v2/https";
import {
  getFirestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import {PubSub} from "@google-cloud/pubsub";

import {
  WORKSPACES_COLLECTION,
  GLOBAL_STATISTICS_COLLECTION,
  WORKSPACE_EVENTS_TOPIC,
} from "../../../config";
import {
  assertTeamRole,
} from "../../../core/utils/auth.utils";
import {
  WorkspaceDocument,
} from "../types/firestore.types";
import {
  CreateWorkspacePayload,
  CreateWorkspaceResponse,
} from "../types/api.types";
import {
  WorkspaceCreatedEventData,
} from "../types/events.types";

const db = getFirestore();
const pubsub = new PubSub();

/**
 * Use case для создания нового рабочего пространства.
 */
export class CreateWorkspaceUseCase {
  /**
   * Executes the use case to create a new workspace.
   * @param {string} uid The user ID.
   * @param {CreateWorkspacePayload} data The data for the new workspace.
   * @return {Promise<CreateWorkspaceResponse>} The created workspace response.
   */
  async execute(
    uid: string,
    data: CreateWorkspacePayload
  ): Promise<CreateWorkspaceResponse> {
    if (!data.name || data.name.trim().length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "Название пространства обязательно."
      );
    }
    if (!data.isPersonal && !data.teamId) {
      throw new HttpsError(
        "invalid-argument",
        "Для командного пространства необходим ID команды."
      );
    }

    const now = FieldValue.serverTimestamp();
    const newWorkspaceRef = db.collection(WORKSPACES_COLLECTION).doc();

    const newWorkspaceData: Omit<WorkspaceDocument, "id"> = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      ownerUid: uid,
      isPersonal: data.isPersonal,
      teamId: data.isPersonal ? null : data.teamId || null,
      createdAt: now,
      updatedAt: now,
      activeApproach: data.activeApproach || "CALENDAR",
      defaultTags: data.defaultTags || [],
      settings: data.settings || {},
      lastClientSyncTimestamp: null,
      syncStatus: data.isPersonal ? "pending_upload" : null,
    };

    try {
      if (!data.isPersonal && data.teamId) {
        await assertTeamRole(data.teamId, uid, ["owner", "admin"]);
      }

      await newWorkspaceRef.set(newWorkspaceData);

      const userStatsUpdate: {[key: string]: any} = {};
      if (data.isPersonal) {
        userStatsUpdate.totalPersonalWorkspacesCreated =
          FieldValue.increment(1);
      }

      if (data.isPersonal && Object.keys(userStatsUpdate).length > 0) {
        const userGlobalStatsRef = db
          .collection(GLOBAL_STATISTICS_COLLECTION)
          .doc(uid);
        await userGlobalStatsRef.set(userStatsUpdate, {merge: true});
      }

      const eventPayload: WorkspaceCreatedEventData = {
        workspaceId: newWorkspaceRef.id,
        ownerUid: uid,
        teamId: newWorkspaceData.teamId,
        isPersonal: newWorkspaceData.isPersonal,
        workspaceName: newWorkspaceData.name,
      };
      await pubsub.topic(WORKSPACE_EVENTS_TOPIC).publishMessage({
        json: {
          eventType: "WORKSPACE_CREATED",
          data: eventPayload,
          eventTimestamp: new Date().toISOString(),
        },
      });

      console.log(
        `[WS] Workspace created: ${newWorkspaceRef.id} by user ${uid}`
      );
      const createdDoc = await newWorkspaceRef.get();
      const createdData = createdDoc.data() as WorkspaceDocument;

      return {
        workspace: {
          id: newWorkspaceRef.id,
          ...createdData,
          createdAt: (
            createdData.createdAt as Timestamp
          ).toDate().toISOString(),
          updatedAt: (
            createdData.updatedAt as Timestamp
          ).toDate().toISOString(),
          lastClientSyncTimestamp: null,
          syncStatus: createdData.syncStatus,
        },
      } as CreateWorkspaceResponse;
    } catch (error: any) {
      console.error(
        `[WS] Error creating workspace for user ${uid}:`,
        error
      );
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Не удалось создать пространство.",
        error.message
      );
    }
  }
}
