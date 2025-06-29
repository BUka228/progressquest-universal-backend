import {
  ChallengeScopeType,
  ChallengeRewardType,
  ChallengePeriodType,
  ChallengeEventType,
} from "./firestore.types";
import {SuccessResponse} from "../../../core/types/api.types";

// --- 7.7. Геймификация и Статистика ---
export interface GamificationProfileClientDto {
    level: number;
    experience: number;
    coins: number;
    maxExperienceForLevel: number;
    currentStreak: number;
    lastClaimedDate: string;
    maxStreak: number;
    selectedPlantId: string | null;
    lastPomodoroCompletionTime: string | null;
    lastTaskCompletionTime: string | null;
  }
export interface GetGamificationProfileResponse {
    profile: GamificationProfileClientDto;
  }

export interface RewardClientDto {
    type: ChallengeRewardType;
    value: string;
    badgeName?: string | null;
    badgeImageUrl?: string | null;
  }

// --- Значки ---
export interface BadgeDefinitionClientDto {
      id: string;
      name: string;
      description: string;
      imageUrl: string;
      criteria: string;
      rewardXp?: number;
      rewardCoins?: number;
      isHidden?: boolean;
  }

export interface GetAllBadgeDefinitionsResponseDto {
      badges: BadgeDefinitionClientDto[];
  }

export interface EarnedBadgeClientDto {
    badgeDefinitionId: string;
    earnedAt: string; // ISO
    name: string;
    imageUrl: string;
    criteria: string;
  }
export interface GetBadgesResponse {
    badges: EarnedBadgeClientDto[];
  }

export interface CreateCustomChallengePayload {
    name: string;
    description: string;
    period: ChallengePeriodType;
    type: ChallengeEventType;
    targetValue: number;
    reward: {
      type: ChallengeRewardType;
      value: string;
      badgeName?: string | null;
      badgeImageUrl?: string | null;
    };
    conditionJson?: string | null;
  }
export interface ChallengeDefinitionClientDto {
    id: string;
    name: string;
    description: string;
    creatorUid: string | "system";
    scope: ChallengeScopeType;
    targetEntityId: string | null;
    isPublicTemplate: boolean;
    reward: {
      type: ChallengeRewardType;
      value: string;
      badgeName?: string | null;
      badgeImageUrl?: string | null;
    };
    period: ChallengePeriodType;
    type: ChallengeEventType;
    targetValue: number;
    conditionJson: string | null;
    isActiveSystemChallenge?: boolean;
    createdAt: string;
    updatedAt: string;
    currentUserProgress?: {
      progress: {[key: string]: number} | number;
      isCompleted: boolean;
    };
  }

export interface CreateChallengeResponse {
    challenge: ChallengeDefinitionClientDto;
  }

export interface GetChallengesResponse {
    challenges: ChallengeDefinitionClientDto[];
  }

export interface UpdateCustomChallengePayload
    extends Partial<Omit<CreateCustomChallengePayload, "type">> {
    challengeDefId: string;
  }

export interface DeleteChallengePayload {
    challengeDefId: string;
  }

// Новые DTO для сада и ежедневной награды
export interface ClaimDailyRewardResponseDto extends SuccessResponse {
    rewardReceived: RewardClientDto;
    newStreak: number;
    newXp: number;
    newCoins: number;
  }

// --- Виртуальный сад ---
export interface VirtualPlantClientDto {
      id: string;
      plantType: string;
      growthStage: number;
      growthPoints: number;
      lastWateredAt: string; // ISO
      createdAt: string; // ISO
  }

export interface GetVirtualGardenResponse {
      plants: VirtualPlantClientDto[];
      selectedPlantId: string | null;
  }

export interface SelectPlantRequestPayload {
      plantInstanceId: string;
  }

export interface WaterPlantRequestPayload {
    plantInstanceId?: string | null;
  }

export interface WaterPlantResponseDto extends SuccessResponse {
    updatedPlants: VirtualPlantClientDto[];
    growthPointsAdded?: { [plantInstanceId: string]: number };
  }

// --- Магазин ---
export interface StoreItemClientDto {
      id: string;
      name: string;
      description: string;
      costInCoins: number;
      category: string;
      itemValue: string;
      imageUrl: string;
      isAvailable: boolean;
  }

export interface GetStoreItemsResponse {
      items: StoreItemClientDto[];
  }

export interface PurchaseStoreItemPayload {
      itemId: string;
  }

export interface PurchaseStoreItemResponse extends SuccessResponse {
    remainingCoins: number;
    itemReceived: StoreItemClientDto;
  }
