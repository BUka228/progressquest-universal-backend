import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import * as functions from "firebase-functions";
import {getFirestore, Timestamp, FieldValue} from "firebase-admin/firestore";
import {
  commonRuntimeOpts,
  GAMIFICATION_PROFILES_COLLECTION,
  CHALLENGE_PROGRESS_SUBCOLLECTION,
  BADGE_DEFINITIONS_COLLECTION,
  EARNED_BADGES_SUBCOLLECTION,
  VIRTUAL_GARDEN_SUBCOLLECTION,
  STORE_ITEMS_COLLECTION,
  CHALLENGE_DEFINITIONS_COLLECTION,
} from "../config";
import {assertAuthenticated} from "../utils";
import {
  GamificationProfileDocument,
  ChallengeDefinitionDocument,
  BadgeDefinitionDocument,
  EarnedBadgeDocument,
  VirtualPlantDocument,
  StoreItemDocument,
} from "../types/firestore.types";
import {
  GetGamificationProfileResponse,
  GamificationProfileClientDto,
  ClaimDailyRewardResponseDto,
  ChallengeDefinitionClientDto,
  CreateCustomChallengePayload,
  CreateChallengeResponse,
  DeleteChallengePayload,
  SuccessResponse,
  GetBadgesResponse,
  BadgeDefinitionClientDto,
  EarnedBadgeClientDto,
  GetVirtualGardenResponse,
  VirtualPlantClientDto,
  SelectPlantRequestPayload,
  GetStoreItemsResponse,
  StoreItemClientDto,
  PurchaseStoreItemPayload,
  PurchaseStoreItemResponse,
  GetChallengesResponse,
  GetAllBadgeDefinitionsResponseDto,
  RewardClientDto,
  WaterPlantRequestPayload,
  WaterPlantResponseDto,
} from "../types/api.types";

const db = getFirestore();
const logger = functions.logger;

// --- ПОЛУЧЕНИЕ ДАННЫХ ---

export const getGamificationProfile = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest // warning: no-unused-vars - оставляем
  ): Promise<GetGamificationProfileResponse> => {
    const uid = assertAuthenticated(request.auth);
    const profileRef = db.collection(GAMIFICATION_PROFILES_COLLECTION).doc(uid);

    try {
      const profileDoc = await profileRef.get();
      if (!profileDoc.exists) {
        logger.error(
          `[Gamification] Profile not found for user: ${uid}. ` +
          "Possible onUserCreate trigger issue."
        );
        throw new HttpsError(
          "not-found",
          "Профиль геймификации не найден."
        );
      }
      const profileData = profileDoc.data() as GamificationProfileDocument;
      const clientProfile: GamificationProfileClientDto = {
        level: profileData.level,
        experience: profileData.experience,
        coins: profileData.coins,
        maxExperienceForLevel: profileData.maxExperienceForLevel,
        currentStreak: profileData.currentStreak,
        lastClaimedDate: (
          profileData.lastClaimedDate as Timestamp
        ).toDate().toISOString(),
        maxStreak: profileData.maxStreak,
        selectedPlantId: profileData.selectedPlantInstanceId,
        lastPomodoroCompletionTime: profileData.lastPomodoroCompletionTime ?
          (
            profileData.lastPomodoroCompletionTime as Timestamp
          ).toDate().toISOString() :
          null,
        lastTaskCompletionTime: profileData.lastTaskCompletionTime ?
          (
            profileData.lastTaskCompletionTime as Timestamp
          ).toDate().toISOString() :
          null,
      };
      return {profile: clientProfile};
    } catch (error: unknown) {
      logger.error(
        `[Gamification] Error fetching profile for user ${uid}:`, error
      );
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal", "Не удалось загрузить профиль геймификации."
      );
    }
  }
);

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

export const getActiveChallenges = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest // warning: no-unused-vars - оставляем
  ): Promise<GetChallengesResponse> => {
    logger.warn(
      "[Gamification] getActiveChallenges is not fully implemented " +
      "and returns a placeholder."
    );
    return {challenges: []};
  }
);

export const getVirtualGarden = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request: CallableRequest): Promise<GetVirtualGardenResponse> => {
    const uid = assertAuthenticated(request.auth);
    try {
      const [profileDoc, gardenSnapshot] = await Promise.all([
        db.collection(GAMIFICATION_PROFILES_COLLECTION).doc(uid).get(),
        db
          .collection(GAMIFICATION_PROFILES_COLLECTION)
          .doc(uid)
          .collection(VIRTUAL_GARDEN_SUBCOLLECTION)
          .get(),
      ]);

      const selectedPlantId =
        profileDoc.data()?.selectedPlantInstanceId || null;
      const plants: VirtualPlantClientDto[] = gardenSnapshot.docs.map((doc) => {
        const data = doc.data() as VirtualPlantDocument;
        return {
          id: doc.id,
          plantType: data.plantType,
          growthStage: data.growthStage,
          growthPoints: data.growthPoints,
          lastWateredAt: (
            data.lastWateredAt as Timestamp
          ).toDate().toISOString(),
          createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        };
      });
      return {plants: plants, selectedPlantId: selectedPlantId};
    } catch (error) {
      logger.error(
        `[Gamification] Error fetching virtual garden for user ${uid}:`, error
      );
      throw new HttpsError("internal", "Не удалось загрузить сад.");
    }
  }
);

export const getStoreItems = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request: CallableRequest): Promise<GetStoreItemsResponse> => {
    assertAuthenticated(request.auth);
    try {
      const snapshot = await db
        .collection(STORE_ITEMS_COLLECTION)
        .where("isAvailable", "==", true)
        .orderBy("category")
        .orderBy("costInCoins")
        .get();

      const items: StoreItemClientDto[] = snapshot.docs.map((doc) => {
        const data = doc.data() as StoreItemDocument;
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          costInCoins: data.costInCoins,
          category: data.category,
          itemValue: data.itemValue,
          imageUrl: data.imageUrl,
          isAvailable: data.isAvailable,
        };
      });

      return {items};
    } catch (error) {
      logger.error("[Gamification] Error fetching store items:", error);
      throw new HttpsError("internal", "Не удалось загрузить предметы.");
    }
  }
);

// --- ДЕЙСТВИЯ ПОЛЬЗОВАТЕЛЯ ---

export const claimDailyReward = onCall(
  {...commonRuntimeOpts, cors: true},
  async (request: CallableRequest): Promise<ClaimDailyRewardResponseDto> => {
    const uid = assertAuthenticated(request.auth);
    const profileRef = db.collection(GAMIFICATION_PROFILES_COLLECTION).doc(uid);

    try {
      let response: ClaimDailyRewardResponseDto | null = null;
      await db.runTransaction(async (t) => {
        const profileDoc = await t.get(profileRef);
        if (!profileDoc.exists) {
          throw new HttpsError("not-found", "Профиль не найден.");
        }

        const profileData = profileDoc.data() as GamificationProfileDocument;
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const lastClaimedDate = (
          profileData.lastClaimedDate as Timestamp
        ).toDate();
        lastClaimedDate.setUTCHours(0, 0, 0, 0);

        if (today.getTime() <= lastClaimedDate.getTime()) {
          throw new HttpsError(
            "failed-precondition",
            "Ежедневная награда уже получена сегодня." // max-len: 284 -> OK
          );
        }

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const newStreak =
          lastClaimedDate.getTime() === yesterday.getTime() ?
            profileData.currentStreak + 1 :
            1;

        // Здесь должна быть логика получения награды для `newStreak` дня
        // Для примера, заглушка:
        const rewardValue = 10 + newStreak * 2;
        const reward: RewardClientDto = {
          type: "COINS",
          value: rewardValue.toString(),
        };
        const coinsGained = Number(reward.value);

        t.update(profileRef, {
          currentStreak: newStreak,
          maxStreak: Math.max(profileData.maxStreak, newStreak),
          lastClaimedDate: Timestamp.fromDate(today),
          coins: FieldValue.increment(coinsGained),
        });

        response = {
          success: true,
          message: `Награда за ${newStreak}-й день получена!`,
          rewardReceived: reward,
          newStreak: newStreak,
          newXp: 0, // В этом примере XP не дается
          newCoins: coinsGained,
        };
      });

      if (response === null) {
        throw new HttpsError(
          "internal",
          "Транзакция не вернула результат." // max-len: 288 -> OK
        );
      }
      return response;
    } catch (error: unknown) {
      logger.error(
        `[Gamification] Error claiming daily reward for user ${uid}:`,
        error
      );
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Не удалось получить награду." // max-len: 293 -> OK
      );
    }
  }
);


export const selectPlantInGarden = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<SelectPlantRequestPayload>
  ): Promise<SuccessResponse> => {
    const uid = assertAuthenticated(request.auth);
    const {plantInstanceId} = request.data;
    if (!plantInstanceId) {
      throw new HttpsError(
        "invalid-argument",
        "Необходим ID растения." // max-len: 326 -> OK
      );
    }

    try {
      const profileRef = db
        .collection(GAMIFICATION_PROFILES_COLLECTION)
        .doc(uid);
      await profileRef.update({selectedPlantInstanceId: plantInstanceId});
      return {success: true};
    } catch (error) {
      logger.error(
        `[Gamification] Error selecting plant ${plantInstanceId} ` +
        `for user ${uid}:`,
        error
      );
      throw new HttpsError(
        "internal",
        "Не удалось выбрать растение." // max-len: 365 -> OK
      );
    }
  }
);

export const waterPlantInGarden = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<WaterPlantRequestPayload>
  ): Promise<WaterPlantResponseDto> => {
    const uid = assertAuthenticated(request.auth);
    // const {plantInstanceId} = request.data; // Пока не используется

    const gardenRef = db
      .collection(GAMIFICATION_PROFILES_COLLECTION)
      .doc(uid)
      .collection(VIRTUAL_GARDEN_SUBCOLLECTION);
    const now = Timestamp.now();

    try {
      const allPlantsSnapshot = await gardenRef.get();
      if (allPlantsSnapshot.empty) {
        throw new HttpsError(
          "not-found",
          "У вас нет растений для полива."
        );
      }

      const batch = db.batch();
      const updatedPlantsDto: VirtualPlantClientDto[] = [];

      allPlantsSnapshot.forEach((doc) => {
        batch.update(doc.ref, {lastWateredAt: now});
        const data = doc.data() as VirtualPlantDocument;
        updatedPlantsDto.push({
          id: doc.id,
          ...data,
          lastWateredAt: now.toDate().toISOString(),
          createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        });
      });

      await batch.commit();

      logger.info(`[Gamification] Watered all plants for user ${uid}.`);
      return {
        success: true,
        message: "Все растения политы!",
        updatedPlants: updatedPlantsDto,
      };
    } catch (error) {
      logger.error(
        `[Gamification] Error watering plants for user ${uid}:`,
        error
      );
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Не удалось полить растения."
      );
    }
  }
);

export const purchaseStoreItem = onCall(
  {...commonRuntimeOpts, cors: true},
  async (
    request: CallableRequest<PurchaseStoreItemPayload>
  ): Promise<PurchaseStoreItemResponse> => {
    const uid = assertAuthenticated(request.auth);
    const {itemId} = request.data;
    if (!itemId) {
      throw new HttpsError(
        "invalid-argument",
        "Необходим ID предмета."
      );
    }

    const profileRef = db.collection(GAMIFICATION_PROFILES_COLLECTION).doc(uid);
    const itemRef = db.collection(STORE_ITEMS_COLLECTION).doc(itemId);

    try {
      let purchaseResponse: PurchaseStoreItemResponse | null = null;
      await db.runTransaction(async (t) => {
        const [profileDoc, itemDoc] = await t.getAll(profileRef, itemRef);
        if (!profileDoc.exists) {
          throw new HttpsError("not-found", "Профиль не найден.");
        }
        if (!itemDoc.exists) {
          throw new HttpsError("not-found", "Предмет не найден.");
        }

        const profile = profileDoc.data() as GamificationProfileDocument;
        const item = itemDoc.data() as StoreItemDocument;
        if (profile.coins < item.costInCoins) {
          throw new HttpsError(
            "failed-precondition",
            "Недостаточно монет." // max-len: 456 -> OK
          );
        }

        t.update(profileRef, {
          coins: FieldValue.increment(-item.costInCoins),
        });

        if (item.category === "PLANT_SEED") {
          const newPlantRef = profileRef
            .collection(VIRTUAL_GARDEN_SUBCOLLECTION)
            .doc();
          const newPlant: VirtualPlantDocument = {
            plantType: item.itemValue,
            growthStage: 0,
            growthPoints: 0,
            createdAt: FieldValue.serverTimestamp(),
            lastWateredAt: Timestamp.fromDate(new Date(0)),
          };
          t.set(newPlantRef, newPlant);
        }

        const remainingCoins = profile.coins - item.costInCoins;
        const itemDto: StoreItemClientDto = {id: itemDoc.id, ...item};

        purchaseResponse = {
          success: true,
          message: `Предмет "${item.name}" успешно куплен!`,
          remainingCoins: remainingCoins,
          itemReceived: itemDto,
        };
      });

      if (!purchaseResponse) {
        throw new HttpsError("internal", "Ошибка транзакции.");
      }
      return purchaseResponse;
    } catch (error) {
      logger.error(
        `[Gamification] Error purchasing item ${itemId} for user ${uid}:`,
        error
      );
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Не удалось совершить покупку."
      );
    }
  }
);

// --- УПРАВЛЕНИЕ ЧЕЛЛЕНДЖАМИ ---

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
