export * from "./qdrant.constants";
export * from "./qdrant.module";
export * from "./qdrant.service";

export type * from "./qdrant.options";

/**
 * @privateRemarks This needs to explicitly be `string` so it is not typed as a "const string" that gets injected by esbuild.
 */
export const version = "[VI]{{inject}}[/VI]" as string;
