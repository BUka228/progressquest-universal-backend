import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import * as functions from "firebase-functions";
import {getFirestore, FieldValue, Timestamp} from "firebase-admin/firestore";
import {
  commonRuntimeOpts,
  CHALLENGE_DEFINITIONS_COLLECTION,
  GAMIFICATION_PROFILES_COLLECTION,
  CHALLENGE_PROGRESS_SUBCOLLECTION,
} from "../../../config";
import {assertAuthenticated} from "../../../core/utils/auth.utils";
import {
  ChallengeDefinitionDocument,
} from "../types/firestore.types";
import {SuccessResponse} from "../../../core/types/api.types";
import {
  GetChallengesResponse,
  ChallengeDefinitionClientDto,
  CreateCustomChallengePayload,
  CreateChallengeResponse,
  DeleteChallengePayload,
} from "../types/api.types";

const db = getFirestore();
const logger = functions.logger;

export const getActiveChallenges = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    _request: CallableRequest
  ): Promise<GetChallengesResponse> => {
    logger.warn(
      "[Gamification] getActiveChallenges is not fully implemented " +
      "and returns a placeholder."
    );
    return {challenges: []};
  }
);

export const createCustomChallenge = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<CreateCustomChallengePayload>
  ): Promise<CreateChallengeResponse> => {
    const uid = assertAuthenticated(request.auth);
    const data = request.data;
    if (
      !data.name ||
      !data.type ||
      !data.period ||
      !data.reward ||
      !data.targetValue
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Не все обязательные поля для челленджа были предоставлены."
      );
    }

    const newChallengeRef = db
      .collection(CHALLENGE_DEFINITIONS_COLLECTION)
      .doc();
    const newChallengeData: Omit<ChallengeDefinitionDocument, "id"> = {
      name: data.name,
      description: data.description,
      creatorUid: uid,
      scope: "personal",
      targetEntityId: null,
      isPublicTemplate: false,
      reward: data.reward,
      period: data.period,
      type: data.type,
      targetValue: data.targetValue,
      conditionJson: data.conditionJson || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    try {
      await newChallengeRef.set(newChallengeData);
      const createdDoc = await newChallengeRef.get();
      const createdData = createdDoc.data() as ChallengeDefinitionDocument;
      const responseChallenge: ChallengeDefinitionClientDto = {
        ...createdData,
        id: createdDoc.id,
        createdAt: (
          createdData.createdAt as Timestamp
        ).toDate().toISOString(),
        updatedAt: (
          createdData.updatedAt as Timestamp
        ).toDate().toISOString(),
      };
      logger.log(
        `[Gamification] Custom challenge '${data.name}' created ` +
        `by user ${uid}.`
      );
      return {challenge: responseChallenge};
    } catch (error) {
      logger.error(
        `[Gamification] Error creating custom challenge for user ${uid}:`,
        error
      );
      throw new HttpsError("internal", "Не удалось создать испытание.");
    }
  }
);

export const deleteCustomChallenge = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<DeleteChallengePayload>
  ): Promise<SuccessResponse> => {
    const uid = assertAuthenticated(request.auth);
    const {challengeDefId} = request.data;
    if (!challengeDefId) {
      throw new HttpsError(
        "invalid-argument",
        "Необходим ID испытания для удаления."
      );
    }

    const challengeRef = db
      .collection(CHALLENGE_DEFINITIONS_COLLECTION)
      .doc(challengeDefId);
    const progressRef = db
      .collection(GAMIFICATION_PROFILES_COLLECTION)
      .doc(uid)
      .collection(CHALLENGE_PROGRESS_SUBCOLLECTION)
      .doc(challengeDefId);

    try {
      await db.runTransaction(async (t) => {
        const challengeDoc = await t.get(challengeRef);
        if (!challengeDoc.exists) {
          throw new HttpsError("not-found", "Испытание не найдено.");
        }
        const challengeData =
          challengeDoc.data() as ChallengeDefinitionDocument;
        if (challengeData.creatorUid !== uid) {
          throw new HttpsError(
            "permission-denied",
            "Вы не можете удалить это испытание."
          );
        }
        t.delete(challengeRef);
        t.delete(progressRef);
      });

      logger.log(
        `[Gamification] Custom challenge ${challengeDefId} deleted ` +
        `by user ${uid}.`
      );
      return {success: true};
    } catch (error) {
      logger.error(
        `[Gamification] Error deleting custom challenge ${challengeDefId} ` +
        `for user ${uid}:`,
        error
      );
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Не удалось удалить испытание.");
    }
  }
);
