export * from "@/constants";
export * from "@/contracts";
export * from "@/idempotency.module";

export type * from "@/idempotency.options";

/**
 * @privateRemarks This needs to explicitly be `string` so it is not typed as a "const string" that gets injected by esbuild.
 */
export const version = "[VI]{{inject}}[/VI]" as string;
