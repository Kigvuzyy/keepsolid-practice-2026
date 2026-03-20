import { createTsupConfig } from "../../tsup.config";

const { esbuildPluginVersionInjector } = await import("esbuild-plugin-version-injector");

export default createTsupConfig({
	esbuildPlugins: [esbuildPluginVersionInjector()],
});
