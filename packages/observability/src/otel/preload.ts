import { register } from "node:module";

import { readOtelEnv } from "#env";
import { initOtel } from "./init.js";

register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);

initOtel({ env: readOtelEnv() });
