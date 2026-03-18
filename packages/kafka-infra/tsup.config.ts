import { esbuildPluginVersionInjector } from "esbuild-plugin-version-injector";

import { createTsupConfig } from "../../tsup.config";

export default createTsupConfig({
	esbuildPlugins: [esbuildPluginVersionInjector()],
});
