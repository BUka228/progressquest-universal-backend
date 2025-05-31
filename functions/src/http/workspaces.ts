import {HttpsError, onCall} from "firebase-functions/v2/https";
import {getFirestore, FieldValue, Timestamp} from "firebase-admin/firestore";
import {
  runtimeOptsV2,
  WORKSPACES_COLLECTION,
  USERS_COLLECTION,
  GLOBAL_STATISTICS_COLLECTION,
} from "../config";
import {assertAuthenticated} from "../utils";
import {
  WorkspaceDocument,
  WorkspaceClientResponse,
  CreateWorkspacePayload,
  TeamMembershipEntry,
} from "../types";

const db = getFirestore();

export const getUserWorkspaces = onCall(runtimeOptsV2, async (request) => {
  const userUID = assertAuthenticated(request.auth);
  const workspaces: WorkspaceClientResponse[] = [];
  try {
    const personalSnapshot = await db
      .collection(WORKSPACES_COLLECTION)
      .where("ownerUid", "==", userUID)
      .where("isPersonal", "==", true)
      .orderBy("createdAt", "desc")
      .get();

    personalSnapshot.docs.forEach((doc) => {
      const data = doc.data() as WorkspaceDocument;
      workspaces.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        ownerUid: data.ownerUid,
        isPersonal: data.isPersonal,
        teamId: data.teamId,
        createdAt: data.createdAt as Timestamp,
        updatedAt: data.updatedAt as Timestamp,
        activeApproach: data.activeApproach,
        defaultTags: data.defaultTags,
        settings: data.settings,
      });
    });

    const userDoc = await db.collection(USERS_COLLECTION).doc(userUID).get();
    const teamMemberships =
      (userDoc.data()?.teamMemberships as TeamMembershipEntry[]) || [];

    if (teamMemberships.length > 0) {
      const teamWorkspacePromises = teamMemberships.map(
        async (membership) => {
          const teamWsSnap = await db
            .collection(WORKSPACES_COLLECTION)
            .where("teamId", "==", membership.teamId)
            .orderBy("name", "asc")
            .get();
          teamWsSnap.docs.forEach((doc) => {
            if (!workspaces.some((ws) => ws.id === doc.id)) {
              const data = doc.data() as WorkspaceDocument;
              workspaces.push({
                id: doc.id,
                name: data.name,
                description: data.description,
                ownerUid: data.ownerUid,
                isPersonal: data.isPersonal,
                teamId: data.teamId,
                createdAt: data.createdAt as Timestamp,
                updatedAt: data.updatedAt as Timestamp,
                activeApproach: data.activeApproach,
                defaultTags: data.defaultTags,
                settings: data.settings,
                userTeamRole: membership.userTeamRole,
              });
            }
          });
        }
      );
      await Promise.all(teamWorkspacePromises);
    }
    return {workspaces};
  } catch (e: any) {
    console.error(`Err fetch workspaces for ${userUID}:`, e.message);
    if (e instanceof HttpsError) {
      throw e;
    }
    throw new HttpsError(
      "internal",
      "Fetch workspaces failed.",
      e.message
    );
  }
});

export const createWorkspace = onCall(runtimeOptsV2, async (request) => {
  const uid = assertAuthenticated(request.auth);
  const data = request.data as CreateWorkspacePayload;

  if (!data.name) {
    throw new HttpsError(
      "invalid-argument",
      "Название пространства обязательно."
    );
  }
  if (!data.isPersonal && !data.teamId) {
    if (!data.isPersonal) {
      throw new HttpsError(
        "invalid-argument",
        "Для командного пространства необходим teamId или другая логика создания."
      );
    }
  }

  const now = FieldValue.serverTimestamp();
  const newWorkspaceData: Omit<WorkspaceDocument, "id"> = {
    name: data.name,
    description: data.description || null,
    ownerUid: uid,
    isPersonal: data.isPersonal,
    teamId: data.isPersonal ? null : data.teamId || null,
    createdAt: now,
    updatedAt: now,
    activeApproach: data.activeApproach || "CALENDAR",
    defaultTags: data.defaultTags || [],
    settings: {},
  };

  try {
    const workspaceRef = await db
      .collection(WORKSPACES_COLLECTION)
      .add(newWorkspaceData);

    if (data.isPersonal) {
      const gsRef = db.collection(GLOBAL_STATISTICS_COLLECTION).doc(uid);
      await gsRef.update({
        totalWorkspacesCreated: FieldValue.increment(1),
      });
    }

    return {workspaceId: workspaceRef.id, ...newWorkspaceData};
  } catch (e: any) {
    console.error(`Error creating workspace for user ${uid}:`, e.message);
    throw new HttpsError(
      "internal",
      "Не удалось создать пространство.",
      e.message
    );
  }
});
