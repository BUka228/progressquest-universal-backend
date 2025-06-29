import {UserDocument} from "./firestore.types";

export interface BaseEvent {
  eventType: string;
  eventTimestamp: string;
  traceId?: string; // Опционально, для сквозной трассировки
}

// --- 1. User Events (Топик: user-events) ---
export interface UserCreatedEventData {
  userId: string;
  email?: string | null;
  displayName?: string | null;
}
export interface UserCreatedEvent extends BaseEvent {
  eventType: "USER_CREATED";
  data: UserCreatedEventData;
}

export interface UserProfileUpdatedEventData {
  userId: string;
  updatedFields: Array<keyof UserDocument>;
}
export interface UserProfileUpdatedEvent extends BaseEvent {
  eventType: "USER_PROFILE_UPDATED";
  data: UserProfileUpdatedEventData;
}

export interface UserDeletedEventData {
  userId: string;
}
export interface UserDeletedEvent extends BaseEvent {
  eventType: "USER_DELETED";
  data: UserDeletedEventData;
}
