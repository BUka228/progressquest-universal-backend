import {initializeApp} from "firebase-admin/app";
initializeApp();

import {setGlobalOptions} from "firebase-functions/v2";
import {runtimeOptsV2} from "./config";
setGlobalOptions(runtimeOptsV2);

export * from "./auth";
export * from "./http";
export * from "./pubsub";
