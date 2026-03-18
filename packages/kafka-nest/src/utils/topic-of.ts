import type { AnyTopic } from "@kigvuzyy/kafka-topics";
import type { EventSpec, InferTopicName } from "@kigvuzyy/kafka-contracts";

export const topicOf = <S extends EventSpec<string, unknown, AnyTopic>>(
	spec: S,
): InferTopicName<S> => {
	return spec.topic.name;
};
