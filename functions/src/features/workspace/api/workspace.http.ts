import {HttpsError, onCall} from "firebase-functions/v2/https";
import {
  getFirestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import {
  commonRuntimeOpts,
  WORKSPACES_COLLECTION,
  USERS_COLLECTION,
  WORKSPACE_EVENTS_TOPIC,
} from "../../../config";
import {
  assertAuthenticated,
  assertWorkspaceRole,
} from "../../../core/utils/auth.utils";
import {UserDocument} from "../../user/types/firestore.types";
import {
  WorkspaceDocument,
  WorkspaceMemberDocument,
} from "../types/firestore.types";
import {
  CreateWorkspacePayload,
  WorkspaceClientDto,
  GetUserWorkspacesResponse,
  GetWorkspaceDetailsPayload,
  GetWorkspaceDetailsResponse,
  UpdateWorkspacePayload,
  UpdateWorkspaceResponse,
  DeleteWorkspacePayload,
} from "../types/api.types";
import {SuccessResponse} from "../../../core/types/api.types";
import {
  WorkspaceUpdatedEventData,
  WorkspaceDeletedEventData,
} from "../types/events.types";
import {PubSub} from "@google-cloud/pubsub";

const db = getFirestore();
const pubsub = new PubSub();

import {CreateWorkspaceUseCase} from "../domain/CreateWorkspaceUseCase";

export const createWorkspace = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request) => {
    const uid = assertAuthenticated(request.auth);
    const data = request.data as CreateWorkspacePayload;
    return await new CreateWorkspaceUseCase().execute(uid, data);
  }
);

export const getUserWorkspaces = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request) => {
    const userUID = assertAuthenticated(request.auth);
    const clientWorkspaces: WorkspaceClientDto[] = [];

    try {
      // 1. Запрос личных рабочих пространств
      const personalSnapshot = await db
        .collection(WORKSPACES_COLLECTION)
        .where("ownerUid", "==", userUID)
        .where("isPersonal", "==", true)
        .orderBy("createdAt", "desc")
        .get();

      personalSnapshot.docs.forEach((doc) => {
        const data = doc.data() as WorkspaceDocument;
        clientWorkspaces.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          ownerUid: data.ownerUid,
          isPersonal: data.isPersonal,
          teamId: data.teamId,
          createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
          updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
          activeApproach: data.activeApproach,
          defaultTags: data.defaultTags,
          settings: data.settings,
          currentUserWorkspaceRole: "owner",
        });
      });

      // 2. Запрос командных рабочих пространств
      const userDocSnap = await db
        .collection(USERS_COLLECTION)
        .doc(userUID)
        .get();
      const userDocData = userDocSnap.data() as UserDocument | undefined;
      const teamMemberships = userDocData?.teamMemberships || [];

      if (teamMemberships.length > 0) {
        const teamIds = teamMemberships.map((m) => m.teamId);

        // Один запрос для всех командных рабочих пространств
        const teamWsSnap = await db
          .collection(WORKSPACES_COLLECTION)
          .where("teamId", "in", teamIds)
          .orderBy("name", "asc")
          .get();

        const teamRoleMap = teamMemberships.reduce((acc, m) => {
          acc[m.teamId] = m.userTeamRole;
          return acc;
        }, {} as Record<string, string>);

        teamWsSnap.docs.forEach((wsDoc) => {
          const wsData = wsDoc.data() as WorkspaceDocument;
          const userTeamRole = teamRoleMap[wsData.teamId as string] || null;

          if (userTeamRole) {
            clientWorkspaces.push({
              id: wsDoc.id,
              name: wsData.name,
              description: wsData.description,
              ownerUid: wsData.ownerUid,
              isPersonal: wsData.isPersonal,
              teamId: wsData.teamId,
              createdAt: (wsData.createdAt as Timestamp).toDate().toISOString(),
              updatedAt: (wsData.updatedAt as Timestamp).toDate().toISOString(),
              activeApproach: wsData.activeApproach,
              defaultTags: wsData.defaultTags,
              settings: wsData.settings,
              currentUserWorkspaceRole:
                userTeamRole as WorkspaceMemberDocument["workspaceRole"],
            });
          }
        });
      }

      // Финальная сортировка (личные обычно новее и должны быть вверху)
      clientWorkspaces.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      return {workspaces: clientWorkspaces} as GetUserWorkspacesResponse;
    } catch (e: any) {
      console.error(`[WS] Err fetch workspaces for ${userUID}:`, e.message);
      if (e instanceof HttpsError) {
        throw e;
      }
      throw new HttpsError(
        "internal",
        "Fetch workspaces failed.",
        e.message
      );
    }
  }
);

export const getWorkspaceDetails = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request) => {
    const uid = assertAuthenticated(request.auth);
    const {workspaceId} = request.data as GetWorkspaceDetailsPayload;

    if (!workspaceId) {
      throw new HttpsError("invalid-argument", "WorkspaceId is required.");
    }
    try {
      const workspaceRef = db
        .collection(WORKSPACES_COLLECTION)
        .doc(workspaceId);
      const workspaceDoc = await workspaceRef.get();

      if (!workspaceDoc.exists) {
        throw new HttpsError(
          "not-found",
          "Рабочее пространство не найдено."
        );
      }
      const wsData = workspaceDoc.data() as WorkspaceDocument;
      let currentUserRole:
        | WorkspaceMemberDocument["workspaceRole"]
        | null = null;

      if (wsData.isPersonal) {
        if (wsData.ownerUid !== uid) {
          throw new HttpsError("permission-denied", "Доступ запрещен.");
        }
        currentUserRole = "owner";
      } else {
        const memberRef = workspaceRef.collection("members").doc(uid);
        const memberDoc = await memberRef.get();
        if (!memberDoc.exists) {
          throw new HttpsError(
            "permission-denied",
            "Вы не являетесь участником этого пространства."
          );
        }
        currentUserRole = (
          memberDoc.data() as WorkspaceMemberDocument
        ).workspaceRole;
      }

      const responseWorkspace: WorkspaceClientDto = {
        id: workspaceDoc.id,
        ...wsData,
        createdAt: (wsData.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: (wsData.updatedAt as Timestamp).toDate().toISOString(),
        currentUserWorkspaceRole: currentUserRole,
      };
      return {workspace: responseWorkspace} as GetWorkspaceDetailsResponse;
    } catch (e: any) {
      console.error(`[WS] Error details for ws ${workspaceId}:`, e.message);
      if (e instanceof HttpsError) {
        throw e;
      }
      throw new HttpsError(
        "internal",
        "Failed to get details.",
        e.message
      );
    }
  }
);

export const updateWorkspace = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request) => {
    const uid = assertAuthenticated(request.auth);
    const data = request.data as UpdateWorkspacePayload;

    if (!data.workspaceId) {
      throw new HttpsError("invalid-argument", "WorkspaceId is required.");
    }

    const workspaceRef = db
      .collection(WORKSPACES_COLLECTION)
      .doc(data.workspaceId);
    const updates: Partial<
      Omit<
        WorkspaceDocument,
        "id" | "createdAt" | "ownerUid" | "isPersonal" | "teamId"
      >
    > & {updatedAt: FieldValue} = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (data.name !== undefined) {
      updates.name = data.name;
    }
    if (data.description !== undefined) {
      updates.description = data.description;
    }
    if (data.activeApproach !== undefined) {
      updates.activeApproach = data.activeApproach;
    }
    if (data.defaultTags !== undefined) {
      updates.defaultTags = data.defaultTags;
    }
    if (data.settings !== undefined) {
      updates.settings = data.settings;
    }

    if (Object.keys(updates).length === 1 && "updatedAt" in updates) {
      throw new HttpsError("invalid-argument", "Нет данных для обновления.");
    }

    try {
      const wsDoc = await workspaceRef.get();
      if (!wsDoc.exists) {
        throw new HttpsError("not-found", "Workspace not found.");
      }
      const wsData = wsDoc.data() as WorkspaceDocument;

      if (wsData.isPersonal && wsData.ownerUid !== uid) {
        throw new HttpsError("permission-denied", "Permission denied.");
      }
      if (!wsData.isPersonal) {
        await assertWorkspaceRole(data.workspaceId, uid, [
          "owner",
          "admin",
          "manager",
        ]);
      }

      await workspaceRef.update(updates);

      const eventPayload: WorkspaceUpdatedEventData = {
        workspaceId: data.workspaceId,
        updatedFields: Object.keys(updates).filter(
          (k) => k !== "updatedAt"
        ) as Array<keyof WorkspaceDocument>,
        updatedByUid: uid,
      };
      await pubsub.topic(WORKSPACE_EVENTS_TOPIC).publishMessage({
        json: {
          eventType: "WORKSPACE_UPDATED",
          data: eventPayload,
          eventTimestamp: new Date().toISOString(),
        },
      });

      const updatedDoc = await workspaceRef.get();
      const updatedWsData = updatedDoc.data() as WorkspaceDocument;
      return {
        success: true,
        updatedWorkspace: {
          id: updatedDoc.id,
          ...updatedWsData,
          createdAt: (
            updatedWsData.createdAt as Timestamp
          ).toDate().toISOString(),
          updatedAt: (
            updatedWsData.updatedAt as Timestamp
          ).toDate().toISOString(),
        },
      } as UpdateWorkspaceResponse;
    } catch (e: any) {
      console.error(`[WS] Error updating ws ${data.workspaceId}:`, e.message);
      if (e instanceof HttpsError) {
        throw e;
      }
      throw new HttpsError(
        "internal",
        "Failed to update workspace.",
        e.message
      );
    }
  }
);

export const deleteWorkspace = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request) => {
    const uid = assertAuthenticated(request.auth);
    const {workspaceId} = request.data as DeleteWorkspacePayload;

    if (!workspaceId) {
      throw new HttpsError("invalid-argument", "WorkspaceId is required.");
    }
    const workspaceRef = db.collection(WORKSPACES_COLLECTION).doc(workspaceId);
    try {
      const wsDoc = await workspaceRef.get();
      if (!wsDoc.exists) {
        throw new HttpsError("not-found", "Workspace not found.");
      }
      const wsData = wsDoc.data() as WorkspaceDocument;

      if (wsData.ownerUid !== uid) {
        throw new HttpsError(
          "permission-denied",
          "Only owner can delete workspace."
        );
      }
      await workspaceRef.delete();

      const eventPayload: WorkspaceDeletedEventData = {
        workspaceId,
        teamId: wsData.teamId,
        deletedByUid: uid,
      };
      await pubsub.topic(WORKSPACE_EVENTS_TOPIC).publishMessage({
        json: {
          eventType: "WORKSPACE_DELETED",
          data: eventPayload,
          eventTimestamp: new Date().toISOString(),
        },
      });

      console.log(`[WS] Workspace ${workspaceId} deleted by user ${uid}`);
      return {
        success: true,
        message: "Рабочее пространство удалено.",
      } as SuccessResponse;
    } catch (e: any) {
      console.error(`[WS] Error deleting ws ${workspaceId}:`, e.message);
      if (e instanceof HttpsError) {
        throw e;
      }
      throw new HttpsError(
        "internal",
        "Failed to delete workspace.",
        e.message
      );
    }
  }
);
