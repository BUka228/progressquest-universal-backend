import {onMessagePublished} from "firebase-functions/v2/pubsub";
import {
  USER_EVENTS_TOPIC,
  commonRuntimeOpts,
} from "../config";
import {
  UserCreatedEventData,
} from "../types/events.types";

export const onUserCreatedProcessWelcome = onMessagePublished(
  {topic: USER_EVENTS_TOPIC, ...commonRuntimeOpts},
  async (event) => {
    if (!event.data.message?.json) {
      console.warn( // 6 пробелов от начала строки функции
        "[UserEventHandler] PubSub message for topic " +
        USER_EVENTS_TOPIC +
        " missing JSON payload. Event ID:",
        event.id
      );
      return; // 6 пробелов
    }

    const genericEventData = event.data.message.json as {eventType: string};

    switch (genericEventData.eventType) { // 4 пробела
    case "USER_CREATED": { // 6 пробелов для case, { на той же строке
      const userEventData = event.data.message // 8 пробелов
        .json as UserCreatedEventData;
      console.log( // 8 пробелов
        "[UserEventHandler] Processing USER_CREATED event for userId: " +
            userEventData.userId
      );

      console.log( // 8 пробелов
        "[UserEventHandler] Finished processing USER_CREATED for " +
            userEventData.userId +
            ". No additional actions configured for MVP."
      );
      break; // 8 пробелов
    } // 6 пробелов для закрывающей скобки case
    default: // 6 пробелов
      console.warn( // 8 пробелов
        "[UserEventHandler] Received unhandled eventType: " +
            genericEventData.eventType +
            " in topic " +
            USER_EVENTS_TOPIC +
            "."
      );
        // break; // Необязательно для default, если он последний
    }
  }
);
