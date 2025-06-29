import {
  ChallengeScopeType,
  ChallengeRewardType,
  GamificationHistoryEventType,
} from "./firestore.types";
import {BaseEvent} from "../../user/types/events.types";

// --- 6. Gamification Events (Топик: gamification-events, если нужен) ---
export interface PointsAwardedEventData {
    userId: string;
    xpAmount?: number;
    coinsAmount?: number;
    reason: GamificationHistoryEventType;
    relatedEntityId?: string | null;
    relatedEntityType?: string | null;
  }
export interface PointsAwardedEvent extends BaseEvent {
    eventType: "POINTS_AWARDED";
    data: PointsAwardedEventData;
  }

export interface LevelUpEventData {
    userId: string;
    newLevel: number;
    oldLevel: number;
  }
export interface LevelUpEvent extends BaseEvent {
    eventType: "LEVEL_UP";
    data: LevelUpEventData;
  }

export interface BadgeEarnedEventData {
    userId: string;
    badgeDefinitionId: string;
    badgeName: string;
  }
export interface BadgeEarnedEvent extends BaseEvent {
    eventType: "BADGE_EARNED";
    data: BadgeEarnedEventData;
  }

export interface ChallengeProgressUpdateData {
    challengeDefinitionId: string;
    progress: {[key: string]: number} | number;
    isCompleted: boolean;
  }
export interface ChallengeProgressUpdatedEventData {
    userId: string;
    challenge: ChallengeProgressUpdateData;
    scope: ChallengeScopeType;
    targetEntityId?: string | null;
  }
export interface ChallengeProgressUpdatedEvent extends BaseEvent {
    eventType: "CHALLENGE_PROGRESS_UPDATED";
    data: ChallengeProgressUpdatedEventData;
  }

export interface ChallengeCompletedEventData {
    userId: string;
    challengeDefinitionId: string;
    challengeName: string;
    scope: ChallengeScopeType;
    targetEntityId?: string | null;
    rewardApplied?: {type: ChallengeRewardType; value: string};
  }
export interface ChallengeCompletedEvent extends BaseEvent {
    eventType: "CHALLENGE_COMPLETED";
    data: ChallengeCompletedEventData;
  }

export interface PlantGrownStageUpEventData {
    userId: string;
    plantInstanceId: string;
    newStage: number;
    plantType: string;
  }
export interface PlantGrownStageUpEvent extends BaseEvent {
    eventType: "PLANT_GROWN_STAGE_UP";
    data: PlantGrownStageUpEventData;
  }
