export * from "./redis.constants";
export * from "./redis.module";
export * from "./redis.service";

export type * from "./redis.options";

/**
 * @privateRemarks This needs to explicitly be `string` so it is not typed as a "const string" that gets injected by esbuild.
 */
export const version = "[VI]{{inject}}[/VI]" as string;
