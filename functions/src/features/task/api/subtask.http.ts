import {
  HttpsError,
  onCall,
  CallableRequest,
} from "firebase-functions/v2/https";
import {
  getFirestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import {
  commonRuntimeOpts,
  TASKS_COLLECTION,
  SUBTASKS_COLLECTION,
} from "../../../config";
import {
  assertAuthenticated,
  assertPersonalWorkspaceOwner,
} from "../../../core/utils/auth.utils";
import {
  SubtaskDocument,
  TaskDocument,
} from "../types/firestore.types";
import {SuccessResponse} from "../../../core/types/api.types";
import {
  CreateSubtaskPayload,
  SubtaskClientDto,
  DeleteSubtaskPayload,
} from "../types/api.types";

const db = getFirestore();

export const addSubtask = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<CreateSubtaskPayload>
  ): Promise<SubtaskClientDto> => {
    const uid = assertAuthenticated(request.auth);
    const {parentTaskId, title} = request.data;
    if (!parentTaskId || !title) {
      throw new HttpsError(
        "invalid-argument",
        "Parent taskId and title are required."
      );
    }

    const parentTaskRef = db.collection(TASKS_COLLECTION).doc(parentTaskId);
    const subtaskRef = parentTaskRef.collection(SUBTASKS_COLLECTION).doc();

    try {
      const parentTaskDoc = await parentTaskRef.get();
      if (!parentTaskDoc.exists) {
        throw new HttpsError("not-found", "Parent task not found.");
      }
      await assertPersonalWorkspaceOwner(
        (parentTaskDoc.data() as TaskDocument).workspaceId,
        uid
      );

      const newSubtask: SubtaskDocument = {
        title: title.trim(),
        completed: false,
        order: 0, // Логику порядка лучше делать на клиенте или при запросе
        createdAt: FieldValue.serverTimestamp(),
      };

      // Запускаем в транзакции, чтобы обновить и родительскую задачу
      await db.runTransaction(async (t) => {
        t.set(subtaskRef, newSubtask);
        // Важно! Обновляем updatedAt у родителя
        t.update(parentTaskRef, {updatedAt: FieldValue.serverTimestamp()});
      });

      const createdDoc = await subtaskRef.get();
      const createdData = createdDoc.data() as SubtaskDocument;
      return {
        id: createdDoc.id,
        ...createdData,
        createdAt: (
          createdData.createdAt as Timestamp
        ).toDate().toISOString(),
      };
    } catch (e) {
      console.error(
        `[Subtask] Error adding subtask to task ${parentTaskId}`,
        e
      );
      if (e instanceof HttpsError) {
        throw e;
      }
      throw new HttpsError("internal", "Не удалось добавить подзадачу.");
    }
  }
);

// === НОВАЯ ФУНКЦИЯ: deleteSubtask ===
export const deleteSubtask = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<DeleteSubtaskPayload>
  ): Promise<SuccessResponse> => {
    const uid = assertAuthenticated(request.auth);
    const {parentTaskId, subtaskId} = request.data;

    if (!parentTaskId || !subtaskId) {
      throw new HttpsError(
        "invalid-argument",
        "Parent taskId and subtaskId are required."
      );
    }

    const parentTaskRef = db.collection(TASKS_COLLECTION).doc(parentTaskId);
    const subtaskRef = parentTaskRef
      .collection(SUBTASKS_COLLECTION)
      .doc(subtaskId);

    try {
      await db.runTransaction(async (t) => {
        const parentTaskDoc = await t.get(parentTaskRef);
        if (!parentTaskDoc.exists) {
          // Если родительской задачи нет, то и подзадачи нет.
          // Просто выходим.
          console.warn(
            `[Subtask] Parent task ${parentTaskId} not found ` +
            "during subtask deletion. Skipping."
          );
          return;
        }
        // Проверяем права на родительскую задачу
        await assertPersonalWorkspaceOwner(
          (parentTaskDoc.data() as TaskDocument).workspaceId,
          uid
        );

        const subtaskDoc = await t.get(subtaskRef);
        if (subtaskDoc.exists) {
          t.delete(subtaskRef);
          // КЛЮЧЕВОЙ МОМЕНТ: Обновляем updatedAt у родителя
          t.update(parentTaskRef, {updatedAt: FieldValue.serverTimestamp()});
        }
      });

      console.info(
        `[Subtask] Subtask ${subtaskId} of task ${parentTaskId} was deleted.`
      );

      return {success: true, message: "Подзадача удалена."};
    } catch (e) {
      console.error(
        `[Subtask] Error deleting subtask ${subtaskId} for task ` +
        parentTaskId,
        e
      );
      if (e instanceof HttpsError) {
        throw e;
      }
      throw new HttpsError("internal", "Не удалось удалить подзадачу.");
    }
  }
);
