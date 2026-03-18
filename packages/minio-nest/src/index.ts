export * from "./minio.module";
export * from "./minio.service";
export * from "./minio.constants";

export type * from "./minio.options";

/**
 * @privateRemarks This needs to explicitly be `string` so it is not typed as a "const string" that gets injected by esbuild.
 */
export const version = "[VI]{{inject}}[/VI]" as string;
