import {
  getFirestore,
  FieldValue,
  Transaction,
  Timestamp,
  PartialWithFieldValue,
} from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import {
  CHALLENGE_DEFINITIONS_COLLECTION,
  CHALLENGE_PROGRESS_SUBCOLLECTION,
  GAMIFICATION_PROFILES_COLLECTION,
  EARNED_BADGES_SUBCOLLECTION,
} from "../config";
import {
  ChallengeDefinitionDocument,
  ChallengeProgressDocument,
  ChallengeEventType,
  EarnedBadgeDocument,
} from "../features/gamification/types/firestore.types";

const db = getFirestore();
const logger = functions.logger;

interface UpdateChallengeProgressParams {
  transaction: Transaction;
  userId: string;
  eventType: ChallengeEventType;
  eventValue?: number;
  eventTimestamp: Date;
  eventContext?: Record<string, any>;
}

/**
 * Обновляет прогресс по челленджам пользователя на основе события.
 * @param {UpdateChallengeProgressParams} params - Параметры для обновления.
 */
export async function updateChallengeProgress(
  params: UpdateChallengeProgressParams
): Promise<void> {
  const {transaction, userId, eventType, eventValue = 1} = params;
  logger.debug(
    `[ChallengeProcessor] Updating progress for user ${userId}, ` +
    `event: ${eventType}`
  );

  const personalChallengesQuery = db
    .collection(CHALLENGE_DEFINITIONS_COLLECTION)
    .where("creatorUid", "==", userId)
    .where("type", "==", eventType);
  const systemChallengesQuery = db
    .collection(CHALLENGE_DEFINITIONS_COLLECTION)
    .where("isActiveSystemChallenge", "==", true)
    .where("type", "==", eventType);

  const [personalSnapshot, systemSnapshot] = await Promise.all([
    transaction.get(personalChallengesQuery),
    transaction.get(systemChallengesQuery),
  ]);

  const allRelevantChallenges = [
    ...personalSnapshot.docs,
    ...systemSnapshot.docs,
  ];

  if (allRelevantChallenges.length === 0) {
    logger.debug(
      "[ChallengeProcessor] No active challenges found for event type: " +
      eventType
    );
    return;
  }

  for (const challengeDoc of allRelevantChallenges) {
    const challengeId = challengeDoc.id;
    const challengeData = challengeDoc.data() as ChallengeDefinitionDocument;
    const progressRef = db
      .collection(GAMIFICATION_PROFILES_COLLECTION)
      .doc(userId)
      .collection(CHALLENGE_PROGRESS_SUBCOLLECTION)
      .doc(challengeId);

    const progressDoc = await transaction.get(progressRef);
    let currentProgress = 0;

    if (progressDoc.exists) {
      const progressData = progressDoc.data() as ChallengeProgressDocument;
      if (progressData.isCompleted && challengeData.period === "ONCE") {
        continue; // error: Strings must use doublequote - исправлено на "ONCE"
      }
      currentProgress = (progressData.progress as number) || 0;
    }

    const newProgress = currentProgress + eventValue;
    const isCompletedNow = newProgress >= challengeData.targetValue;

    const progressUpdate: PartialWithFieldValue<ChallengeProgressDocument> = {
      progress: newProgress,
      isCompleted: isCompletedNow,
      lastUpdated: FieldValue.serverTimestamp(),
    };

    if (
      isCompletedNow &&
      (!progressDoc.exists ||
        !(progressDoc.data() as ChallengeProgressDocument).isCompleted)
    ) {
      progressUpdate.completedAt = FieldValue.serverTimestamp();
      logger.info(
        `[ChallengeProcessor] Challenge "${challengeData.name}" completed ` +
        `for user ${userId}. Applying reward...`
      );
      await applyReward(transaction, userId, challengeData);
    }
    transaction.set(progressRef, progressUpdate, {merge: true});
  }
}

/**
 * Применяет награду за выполненный челлендж.
 * @param {Transaction} transaction - Текущая транзакция Firestore.
 * @param {string} userId - ID пользователя.
 * @param {ChallengeDefinitionDocument} challenge - Определение челленджа.
 */
async function applyReward(
  transaction: Transaction,
  userId: string,
  challenge: ChallengeDefinitionDocument
) {
  const reward = challenge.reward;
  const profileRef = db
    .collection(GAMIFICATION_PROFILES_COLLECTION)
    .doc(userId);

  switch (reward.type) {
  case "XP":
    transaction.update(profileRef, {
      experience: FieldValue.increment(Number(reward.value)),
    });
    break;
  case "COINS":
    transaction.update(profileRef, {
      coins: FieldValue.increment(Number(reward.value)),
    });
    break;
  case "BADGE_ID": {
    const earnedBadgeRef = profileRef
      .collection(EARNED_BADGES_SUBCOLLECTION)
      .doc(reward.value);

    if (!reward.badgeName || !reward.badgeImageUrl) {
      logger.warn(
        "[ChallengeProcessor] Badge reward for challenge " +
        `${challenge.name} is missing denormalized name/imageUrl.`
      );
      break;
    }

    const newEarnedBadge: EarnedBadgeDocument = {
      badgeDefinitionId: reward.value,
      earnedAt: Timestamp.now(),
      name: reward.badgeName,
      imageUrl: reward.badgeImageUrl,
      criteria: challenge.description,
    };
    transaction.set(earnedBadgeRef, newEarnedBadge);
    break;
  }
  case "TEXT":
    // Никаких действий на сервере
    break;
  }
}
