export * from "@/schemas";
export * from "@/constants";
export * from "@/utils";

export type * from "@/types";

/**
 * @privateRemarks This needs to explicitly be `string` so it is not typed as a "const string" that gets injected by esbuild.
 */
export const version = "[VI]{{inject}}[/VI]" as string;
