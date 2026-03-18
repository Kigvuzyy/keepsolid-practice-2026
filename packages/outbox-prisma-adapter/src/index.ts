export * from "@/cls.port";
export * from "@/prisma-outbox.adapter";
export * from "@/prisma-outbox.factory";

export type * from "@/prisma-outbox.options";

/**
 * @privateRemarks This needs to explicitly be `string` so it is not typed as a "const string" that gets injected by esbuild.
 */
export const version = "[VI]{{inject}}[/VI]" as string;
