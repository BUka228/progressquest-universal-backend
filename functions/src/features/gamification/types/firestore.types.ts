import {FieldValue, Timestamp} from "firebase-admin/firestore";

/**
 * Основной профиль геймификации пользователя.
 * Путь: /gamificationProfiles/{userUID}
 */
export interface GamificationProfileDocument {
  level: number;
  experience: number;
  coins: number;
  maxExperienceForLevel: number;
  currentStreak: number;
  lastClaimedDate: Timestamp;
  maxStreak: number;
  selectedPlantInstanceId: string | null; // Комментарий изменен
  lastPomodoroCompletionTime: Timestamp | null;
  lastTaskCompletionTime: Timestamp | null;
}

/**
 * Определение значка.
 * Путь: /badgeDefinitions/{badgeDefId}
 */
export interface BadgeDefinitionDocument {
    name: string;
    description: string;
    imageUrl: string;
    criteriaText: string;
    rewardXp: number;
    rewardCoins: number;
    isHidden: boolean;
}

/**
 * Документ о получении значка пользователем.
 * Путь: /gamificationProfiles/{userUID}/earnedBadges/{badgeDefId}
 */
export interface EarnedBadgeDocument {
  badgeDefinitionId: string;
  earnedAt: Timestamp;
  name: string;
  imageUrl: string;
  criteria: string;
}

// Первое определение ChallengeDefinitionDocument удалено

/**
 * Прогресс пользователя по челленджу.
 * Путь: /gamificationProfiles/{userUID}/challengeProgress/{challengeDefId}
 */
export interface ChallengeProgressDocument {
  challengeDefinitionId: string;
  progress: {[key: string]: number} | number;
  isCompleted: boolean;
  lastUpdated: Timestamp | FieldValue;
  completedAt: Timestamp | null;
}

/**
 * Документ экземпляра растения в саду пользователя.
 * Путь: /gamificationProfiles/{userUID}/virtualGarden/{plantInstanceId}
 */
export interface VirtualPlantDocument {
  plantType: string;
  growthStage: number;
  growthPoints: number;
  lastWateredAt: Timestamp;
  createdAt: Timestamp | FieldValue;
}

/**
 * Определение предмета в магазине.
 * Путь: /storeItems/{itemId}
 */
export interface StoreItemDocument {
    name: string;
    description: string;
    costInCoins: number;
    category: "PLANT_SEED" | "PLANT_FOOD" | "COSMETIC";
    itemValue: string;
    imageUrl: string;
    isAvailable: boolean;
}

export type GamificationHistoryEventType =
  | "TASK_COMPLETED" | "POMODORO_FOCUS_PHASE" | "DAILY_REWARD_CLAIMED"
  | "CHALLENGE_COMPLETED" | "BADGE_EARNED" | "PLANT_WATERED" | "LEVEL_UP"
  | "CUSTOM_CHALLENGE_COMPLETED";

export interface GamificationHistoryEntryDocument {
  userId: string;
  timestamp: Timestamp | FieldValue;
  eventType: GamificationHistoryEventType;
  xpChange: number;
  coinsChange: number;
  relatedEntityId: string | null;
  relatedEntityType: "task" | "challenge" | "badge" | "plant" | null;
  description: string | null;
}

export type ChallengeScopeType = "personal" | "team" | "workspace";
export type ChallengeRewardType = "XP" | "COINS" | "BADGE_ID" | "TEXT";
export type ChallengePeriodType = "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY";
export type ChallengeEventType =
  | "TASK_COMPLETION_COUNT" | "POMODORO_FOCUS_MINUTES" | "LOGIN_STREAK"
  | "POMODORO_SESSION_COUNT"
  | "CUSTOM_EVENT" | "BADGE_COUNT" | "PLANT_MAX_STAGE"
  | "LEVEL_REACHED" | "RESOURCE_ACCUMULATED";

/**
 * Определение челленджа.
 * Путь: /challengeDefinitions/{challengeDefId}
 */
export interface ChallengeDefinitionDocument { // Это определение остается
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
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}
