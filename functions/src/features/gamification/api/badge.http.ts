import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import * as functions from "firebase-functions";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {
  commonRuntimeOpts,
  GAMIFICATION_PROFILES_COLLECTION,
  BADGE_DEFINITIONS_COLLECTION,
  EARNED_BADGES_SUBCOLLECTION,
} from "../../../config";
import {assertAuthenticated} from "../../../core/utils/auth.utils";
import {
  BadgeDefinitionDocument,
  EarnedBadgeDocument,
} from "../types/firestore.types";
import {
  GetBadgesResponse,
  BadgeDefinitionClientDto,
  EarnedBadgeClientDto,
  GetAllBadgeDefinitionsResponseDto,
} from "../types/api.types";

const db = getFirestore();
const logger = functions.logger;

export const getAllBadgeDefinitions = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest
  ): Promise<GetAllBadgeDefinitionsResponseDto> => {
    assertAuthenticated(request.auth);
    try {
      const snapshot = await db.collection(BADGE_DEFINITIONS_COLLECTION).get();
      const badges: BadgeDefinitionClientDto[] = snapshot.docs.map((doc) => {
        const data = doc.data() as BadgeDefinitionDocument;
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          imageUrl: data.imageUrl,
          criteria: data.criteriaText,
          rewardXp: data.rewardXp,
          rewardCoins: data.rewardCoins,
          isHidden: data.isHidden,
        };
      });
      return {badges: badges};
    } catch (error) {
      logger.error("[Gamification] Error fetching all badge def:", error);
      throw new HttpsError("internal", "Не удалось загрузить список.");
    }
  }
);

export const getEarnedBadges = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request: CallableRequest): Promise<GetBadgesResponse> => {
    const uid = assertAuthenticated(request.auth);
    try {
      const badgesRef = db
        .collection(GAMIFICATION_PROFILES_COLLECTION)
        .doc(uid)
        .collection(EARNED_BADGES_SUBCOLLECTION);
      const snapshot = await badgesRef.orderBy("earnedAt", "desc").get();
      const earnedBadges: EarnedBadgeClientDto[] = snapshot.docs.map((doc) => {
        const data = doc.data() as EarnedBadgeDocument;
        return {
          badgeDefinitionId: doc.id,
          earnedAt: (data.earnedAt as Timestamp).toDate().toISOString(),
          name: data.name,
          imageUrl: data.imageUrl,
          criteria: data.criteria,
        };
      });
      return {badges: earnedBadges};
    } catch (error) {
      logger.error(
        `[Gamification] Error fetching earned badges for user ${uid}:`,
        error
      );
      throw new HttpsError(
        "internal", "Не удалось загрузить ваши достижения."
      );
    }
  }
);
