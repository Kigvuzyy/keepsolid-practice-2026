export * from "./snowflake-id";
export * from "./snowflake-id.utils";
export * from "./snowflake-id.constants";
export * from "./snowflake-id.module";
export * from "./snowflake-id.service";

export type * from "./snowflake-id.options";

/**
 * @privateRemarks This needs to explicitly be `string` so it is not typed as a "const string" that gets injected by esbuild.
 */
export const version = "[VI]{{inject}}[/VI]" as string;
