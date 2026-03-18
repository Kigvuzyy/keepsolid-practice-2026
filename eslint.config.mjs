import unicorn from "eslint-plugin-unicorn";
import stylistic from "@stylistic/eslint-plugin-ts";
import common from "eslint-config-neon/common";
import node from "eslint-config-neon/node";
import prettier from "eslint-config-neon/prettier";
import typescript from "eslint-config-neon/typescript";
import merge from "lodash.merge";
import tseslint from "typescript-eslint";

const commonFiles = "{js,mjs,cjs,ts,mts,cts,jsx,tsx}";

const commonRuleset = merge(...common, { files: [`*/**${commonFiles}`] });

const nodeRuleset = merge(...node, { files: [`**/*${commonFiles}`] });

const typescriptRuleset = merge(...typescript, {
	files: [`**/*${commonFiles}`],
	languageOptions: {
		parserOptions: {
			warnOnUnsupportedTypeScriptVersion: false,
			allowAutomaticSingleRunInference: true,
			project: [
				"tsconfig.eslint.json",
				"apps/*/tsconfig.eslint.json",
				"packages/*/tsconfig.eslint.json",
			],
		},
	},
	rules: {
		"typescript-sort-keys/interface": "off",
		"typescript-sort-keys/string-enum": "off",
		"@typescript-eslint/consistent-type-definitions": [2, "interface"],
	},
	settings: {
		"import/resolver": {
			typescript: {
				project: [
					"tsconfig.eslint.json",
					"apps/*/tsconfig.eslint.json",
					"packages/*/tsconfig.eslint.json",
				],
			},
		},
	},
});

const prettierRuleset = merge(...prettier, { files: [`**/*${commonFiles}`] });

export default tseslint.config(
	{
		plugins: {
			unicorn,
			"@stylistic/ts": stylistic,
		},
		ignores: ["**/*.ejs", "**/node_modules", ".git/", "**/build/", "**/coverage"],
	},
	commonRuleset,
	nodeRuleset,
	typescriptRuleset,
	{
		files: ["**/*{ts,mts,cts,tsx}"],
		rules: {
			"jsdoc/no-undefined-types": 0,
		},
	},
	{
		files: ["**/*{js,mjs,cjs,jsx}"],
		rules: { "tsdoc/syntax": 0 },
	},
	prettierRuleset,
);
