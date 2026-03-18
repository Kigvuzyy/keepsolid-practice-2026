import { esbuildPluginVersionInjector } from "esbuild-plugin-version-injector";

import { createTsupConfig } from "../../tsup.config";

export default createTsupConfig({
	entry: ["src/index.ts", "src/openai/index.ts"],
	esbuildPlugins: [esbuildPluginVersionInjector()],
});
