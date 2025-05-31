import {HttpsError} from "firebase-functions/v2/https";
import {
  getFirestore,
  DocumentReference,
  Firestore,
} from "firebase-admin/firestore";
import {
  WORKSPACES_COLLECTION,
} from "../config";
import {
  WorkspaceDocument,
  WorkspaceMemberDocument,
} from "../types/firestore.types";

const db: Firestore = getFirestore();


/**
 * Проверяет, аутентифицирован ли пользователь.
 * @param {object} auth - Контекст аутентификации Firebase.
 * @return {string} UID аутентифицированного пользователя.
 * @throws {HttpsError} Если пользователь не аутентифицирован.
 */
export function assertAuthenticated(
  auth: import("firebase-functions/v2/https").CallableRequest["auth"] |
        undefined
): string {
  if (!auth) {
    console.warn("Authentication check failed: No auth context.");
    throw new HttpsError(
      "unauthenticated",
      "Запрос требует аутентификации."
    );
  }
  return auth.uid;
}

/**
 * Получает роль пользователя в указанном командном рабочем пространстве.
 * @param {string} workspaceId - ID рабочего пространства.
 * @param {string} userId - ID пользователя.
 * @return {Promise<string|null>} Роль или null.
 */
export async function getUserRoleInWorkspace(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMemberDocument["workspaceRole"] | null> {
  try {
    const memberRef = db
      .collection(WORKSPACES_COLLECTION)
      .doc(workspaceId)
      .collection("members")
      .doc(userId) as DocumentReference<WorkspaceMemberDocument>;
    const memberDoc = await memberRef.get();
    if (memberDoc.exists) {
      return memberDoc.data()?.workspaceRole || null;
    }
    return null;
  } catch (error) {
    console.error(
      `Error fetching user role for user ${userId} ` +
      `in workspace ${workspaceId}:`,
      error
    );
    return null;
  }
}

/**
 * Проверяет роль пользователя в рабочем пространстве.
 * @param {string} workspaceId - ID рабочего пространства.
 * @param {string} userId - ID пользователя.
 * @param {Array<string>} requiredRoles - Массив допустимых ролей.
 * @return {Promise<string>} Роль пользователя.
 * @throws {HttpsError} Если права отсутствуют.
 */
export async function assertWorkspaceRole(
  workspaceId: string,
  userId: string,
  requiredRoles: Array<WorkspaceMemberDocument["workspaceRole"]>
): Promise<WorkspaceMemberDocument["workspaceRole"]> {
  const userRole = await getUserRoleInWorkspace(workspaceId, userId);
  if (!userRole || !requiredRoles.includes(userRole)) {
    console.warn(
      `Permission denied for user ${userId} in workspace ${workspaceId}. ` +
      `Required: ${requiredRoles.join("|")}, Has: ${userRole || "none"}.`
    );
    throw new HttpsError(
      "permission-denied",
      "У вас недостаточно прав для выполнения этого действия " +
      "в данном рабочем пространстве."
    );
  }
  return userRole;
}

/**
 * Проверяет, является ли пользователь владельцем личного рабочего пространства.
 * @param {string} workspaceId - ID рабочего пространства.
 * @param {string} userId - ID пользователя.
 * @return {Promise<boolean>} True, если владелец.
 * @throws {HttpsError} Если Workspace не найден или не личный.
 */
export async function assertPersonalWorkspaceOwner(
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const workspaceRef = db
    .collection(WORKSPACES_COLLECTION)
    .doc(workspaceId) as DocumentReference<WorkspaceDocument>;
  const workspaceDoc = await workspaceRef.get();

  if (!workspaceDoc.exists) {
    throw new HttpsError(
      "not-found",
      "Рабочее пространство не найдено."
    );
  }
  const wsData = workspaceDoc.data();
  if (!wsData || !wsData.isPersonal || wsData.ownerUid !== userId) {
    throw new HttpsError(
      "permission-denied",
      "Действие запрещено для этого рабочего пространства."
    );
  }
  return true;
}
