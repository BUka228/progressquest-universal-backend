import {onMessagePublished} from "firebase-functions/v2/pubsub";
import {
  USER_EVENTS_TOPIC,
  runtimeOptsV2,
} from "../config";
import {
  UserCreatedEvent,
} from "../types/events.types";

export const onUserCreatedProcessDefaults = onMessagePublished(
  {topic: USER_EVENTS_TOPIC, ...runtimeOptsV2},
  async (event) => {
    if (!event.data.message?.json) {
      console.warn(
        `[${USER_EVENTS_TOPIC}] Missing JSON in message. ID:`,
        event.id
      );
      return;
    }
    const userEvent = event.data.message.json as UserCreatedEvent;

    if (userEvent.eventType !== "USER_CREATED") {
      console.log(
        `[${USER_EVENTS_TOPIC}] Skipping event type: ${userEvent.eventType}`
      );
      return;
    }

    console.log(
      `[${USER_EVENTS_TOPIC}] Processing USER_CREATED event for userId:`,
      userEvent.userId
    );

    console.log(
      `[${USER_EVENTS_TOPIC}] Finished processing USER_CREATED for ${userEvent.userId}`
    );
  }
);
