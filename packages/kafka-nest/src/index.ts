export * from "@/constants";
export * from "@/kafka.module";
export * from "@/utils/topic-of";
export * from "@/utils/event-router";
export * from "@/config/defaults";
export * from "@/config/merge-options";
export * from "@/pipes/spec-validate.pipe";
export * from "@/pipes/spec-union-validate.pipe";
export * from "@/decorators/debezium-event.decorator";
export * from "@/transport/kafka-custom-transport";

export type * from "@/config/types";

/**
 * @privateRemarks This needs to explicitly be `string` so it is not typed as a "const string" that gets injected by esbuild.
 */
export const version = "[VI]{{inject}}[/VI]" as string;
