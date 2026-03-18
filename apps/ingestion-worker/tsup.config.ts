import { createTsupConfig } from "../../tsup.config";

export default createTsupConfig({
	entry: {
		main: "src/main.ts",
	},
	format: "esm",
	dts: false,
});
