export * from "@/kafka/constants";
export * from "@/kafka/consumer-helper";

export type * from "@/kafka/types";

/**
 * @privateRemarks This needs to explicitly be `string` so it is not typed as a "const string" that gets injected by esbuild.
 */
export const version = "[VI]{{inject}}[/VI]" as string;
