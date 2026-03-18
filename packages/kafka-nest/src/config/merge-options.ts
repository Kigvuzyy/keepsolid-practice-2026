import type { ResolvedKafkaOptions, KafkaOptionsOverride } from "@/config/types";

function mergeSection<T>(base: T, override?: Partial<T>): T {
	return override ? { ...base, ...override } : base;
}

export function mergeOptions(
	base: ResolvedKafkaOptions,
	override?: KafkaOptionsOverride,
): ResolvedKafkaOptions {
	if (!override) return base;

	const client = mergeSection(base.client, override.client);
	const consumer = mergeSection(base.consumer, override.consumer);
	const subscribe = mergeSection(base.subscribe, override.subscribe);
	const run = mergeSection(base.run, override.run);

	return {
		client,
		consumer,
		subscribe,
		run,
		...(override.producer !== undefined ? { producer: override.producer } : {}),
		...(override.serializer !== undefined ? { serializer: override.serializer } : {}),
		...(override.deserializer !== undefined ? { deserializer: override.deserializer } : {}),
	};
}
