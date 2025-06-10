import {initializeApp} from "firebase-admin/app";
import {setGlobalOptions} from "firebase-functions/v2";
import {commonRuntimeOpts} from "./config";

initializeApp();
setGlobalOptions(commonRuntimeOpts);
export * from "./auth";
export * from "./http";
export * from "./pubsub";

console.log(
  `[Index] Functions initialized with region: ${commonRuntimeOpts.region}`
);
