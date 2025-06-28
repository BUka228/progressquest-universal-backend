import {HttpsError, CallableRequest} from "firebase-functions/v2/https";
import {
  getFirestore,
  DocumentReference,
  Firestore,
} from "firebase-admin/firestore";
import {
  WORKSPACES_COLLECTION,
  TEAMS_COLLECTION,
} from "../config";
import {
  WorkspaceDocument,
  WorkspaceMemberDocument,
  TeamMemberDocument,
} from "../types/firestore.types";

const db: Firestore = getFirestore();

/**
 * Проверяет, аутентифицирован ли пользователь в CallableFunction.
 * @param {object|undefined} auth - Объект auth из запроса Firebase Functions.
 * @return {string} UID аутентифицированного пользователя.
 * @throws {HttpsError} Код "unauthenticated", если не аутентифицирован.
 */
export function assertAuthenticated(
  auth: CallableRequest["auth"] | undefined
): string {
  if (!auth || !auth.uid) {
    console.warn(
      "[AuthUtil] Authentication check failed: No auth context or UID."
    );
    throw new HttpsError(
      "unauthenticated",
      "Запрос требует аутентификации пользователя."
    );
  }
  return auth.uid;
}

/**
 * Получает роль пользователя в указанном рабочем пространстве.
 * @param {string} workspaceId - ID рабочего пространства.
 * @param {string} userId - ID пользователя.
 * @return {Promise<string | null>} Роль пользователя или null.
 */
export async function getUserRoleInWorkspace(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMemberDocument["workspaceRole"] | null> {
  if (!workspaceId || !userId) {
    console.warn(
      "[AuthUtil] getUserRoleInWorkspace: workspaceId or userId is empty."
    );
    return null;
  }
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
    console.log(
      "[AuthUtil] User " + // Исправлено на двойные кавычки
        userId +
        " not found in members of workspace " +
        workspaceId +
        "."
    );
    return null;
  } catch (error) {
    console.error(
      "[AuthUtil] Error fetching role for user " + // Исправлено
        userId +
        " in ws " +
        workspaceId +
        ":",
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
 * @return {Promise<string>} Роль пользователя, если проверка пройдена.
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
      "[AuthUtil] Permission denied for user " + // Исправлено
        userId +
        " in ws " +
        workspaceId +
        ". Required: " +
        requiredRoles.join("|") +
        ", Has: " +
        (userRole || "none") +
        "."
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
 * @param {string} userId - ID текущего аутентифицированного пользователя.
 * @return {Promise<void>} Завершается успешно, если проверка пройдена.
 * @throws {HttpsError} Если Workspace не найден или доступ запрещен.
 */
export async function assertPersonalWorkspaceOwner(
  workspaceId: string,
  userId: string
): Promise<void> {
  if (!workspaceId || !userId) {
    throw new HttpsError(
      "invalid-argument",
      "WorkspaceId и UserId обязательны."
    );
  }
  const workspaceRef = db
    .collection(WORKSPACES_COLLECTION)
    .doc(workspaceId) as DocumentReference<WorkspaceDocument>;
  try {
    const workspaceDoc = await workspaceRef.get();
    if (!workspaceDoc.exists) {
      console.warn(
        "[AuthUtil] Workspace " + workspaceId + " not found." // Исправлено
      );
      throw new HttpsError(
        "not-found",
        "Рабочее пространство не найдено."
      );
    }
    const wsData = workspaceDoc.data();
    if (!wsData || !wsData.isPersonal || wsData.ownerUid !== userId) {
      console.warn(
        "[AuthUtil] Permission denied for user " + // Исправлено
          userId +
          " on personal ws " +
          workspaceId +
          ". IsPersonal: " +
          wsData?.isPersonal +
          ", Owner: " +
          wsData?.ownerUid +
          "."
      );
      throw new HttpsError(
        "permission-denied",
        "Действие запрещено для этого рабочего пространства."
      );
    }
  } catch (error) {
    console.error(
      "[AuthUtil] Error in assertPersonalWorkspaceOwner for ws " + // Исправлено
        workspaceId +
        ":",
      error
    );
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      "Ошибка проверки прав на пространство."
    );
  }
}

/**
 * Получает роль пользователя в указанной команде.
 * @param {string} teamId - ID команды.
 * @param {string} userId - ID пользователя.
 * @return {Promise<string | null>} Роль пользователя или null.
 */
export async function getUserRoleInTeam(
  teamId: string,
  userId: string
): Promise<TeamMemberDocument["role"] | null> {
  if (!teamId || !userId) {
    console.warn("[AuthUtil] getUserRoleInTeam: teamId or userId is empty.");
    return null;
  }
  try {
    const memberRef = db
      .collection(TEAMS_COLLECTION)
      .doc(teamId)
      .collection("members")
      .doc(userId) as DocumentReference<TeamMemberDocument>;
    const memberDoc = await memberRef.get();
    if (memberDoc.exists) {
      return memberDoc.data()?.role || null;
    }
    console.log(
      "[AuthUtil] User " + // Исправлено
        userId +
        " not found in members of team " +
        teamId +
        "."
    );
    return null;
  } catch (error) {
    console.error(
      "[AuthUtil] Error fetching role for user " + // Исправлено
        userId +
        " in team " +
        teamId +
        ":",
      error
    );
    return null;
  }
}

/**
 * Проверяет роль пользователя в команде.
 * @param {string} teamId - ID команды.
 * @param {string} userId - ID пользователя.
 * @param {Array<string>} requiredRoles - Массив допустимых ролей.
 * @return {Promise<string>} Роль пользователя, если проверка пройдена.
 * @throws {HttpsError} Если права отсутствуют.
 */
export async function assertTeamRole(
  teamId: string,
  userId: string,
  requiredRoles: Array<TeamMemberDocument["role"]>
): Promise<TeamMemberDocument["role"]> {
  const userRole = await getUserRoleInTeam(teamId, userId);
  if (!userRole || !requiredRoles.includes(userRole)) {
    // ИСПРАВЛЕНИЕ ЗДЕСЬ (строка, которая была примерно 153-й)
    console.warn(
      "[AuthUtil] Permission denied for user " +
        userId +
        " in team " +
        teamId +
        ". Required: " +
        requiredRoles.join("|") +
        ", Has: " +
        (userRole || "none") +
        "."
    );
    throw new HttpsError(
      "permission-denied",
      "У вас недостаточно прав для выполнения этого действия в команде."
    );
  }
  return userRole;
}

/**
 * Проверяет доступ пользователя к рабочему пространству.
 * @param {string} workspaceId - ID рабочего пространства.
 * @param {string} userId - ID пользователя.
 * @return {Promise<WorkspaceDocument>} Данные рабочего пространства.
 * @throws {HttpsError} Если доступ запрещен.
 */
export const assertWorkspaceAccess = async (
  workspaceId: string,
  userId: string
): Promise<WorkspaceDocument> => {
  const wsRef = db.collection(WORKSPACES_COLLECTION).doc(workspaceId);
  const wsDoc = await wsRef.get();
  if (!wsDoc.exists) {
    throw new HttpsError(
      "not-found",
      `Рабочее пространство с ID ${workspaceId} не найдено.`
    );
  }
  const wsData = wsDoc.data() as WorkspaceDocument;

  if (wsData.isPersonal) {
    // Для личного - проверяем владение
    if (wsData.ownerUid !== userId) {
      throw new HttpsError(
        "permission-denied",
        "У вас нет доступа к этому личному пространству."
      );
    }
  } else {
    // Для командного - проверяем членство
    const userRole = await getUserRoleInWorkspace(workspaceId, userId);
    if (!userRole) {
      throw new HttpsError(
        "permission-denied",
        "Вы не являетесь участником этого рабочего пространства."
      );
    }
  }
  return wsData;
};
