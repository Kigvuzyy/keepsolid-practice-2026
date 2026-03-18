import { esbuildPluginVersionInjector } from "esbuild-plugin-version-injector";

import { createTsupConfig } from "../../tsup.config";

export default createTsupConfig({
	entry: [
		"src/index.ts",
		"src/env/index.ts",
		"src/otel/index.ts",
		"src/otel/preload.ts",
		"src/metrics/index.ts",
		"src/logger/index.ts",
		"src/logger/winston/index.ts",
		"src/logger/nest/index.ts",
		"src/span/index.ts",
	],
	esbuildPlugins: [esbuildPluginVersionInjector()],
});
