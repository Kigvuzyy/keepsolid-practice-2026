import type { ResolvedKafkaOptions } from "@/config/types";

export const buildDefaultOptions = (env: NodeJS.ProcessEnv): ResolvedKafkaOptions => {
	const clientId = env.KAFKA_CLIENT_ID ?? "app";
	const brokers = (env.KAFKA_BROKERS ?? "localhost:9092").split(",");

	const consumer = {
		groupId: env.KAFKA_GROUP_ID ?? "app-group",
		allowAutoTopicCreation: false,
	} as const;

	const subscribe = { fromBeginning: false } as const;
	const run = { autoCommit: false, eachBatchAutoResolve: true } as const;

	return {
		client: { clientId, brokers },
		consumer,
		subscribe,
		run,
	};
};
