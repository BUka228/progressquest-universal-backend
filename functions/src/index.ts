import {initializeApp} from "firebase-admin/app";
import {setGlobalOptions} from "firebase-functions/v2";
import {commonRuntimeOpts} from "./config";

initializeApp();
setGlobalOptions(commonRuntimeOpts);

export * from "./features/user";
export * from "./features/workspace";
export * from "./features/task";
export * from "./features/gamification";
export * from "./features/pomodoro";
export * from "./features/statistics";


console.log(
  `[Index] Functions initialized with region: ${commonRuntimeOpts.region}`
);
