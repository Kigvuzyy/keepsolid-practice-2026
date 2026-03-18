import type { KafkaPosition } from "@/kafka/types";
import type { KafkaContext } from "@nestjs/microservices";

export function getPosition(context: KafkaContext): KafkaPosition {
	const message = context.getMessage();

	return {
		topic: context.getTopic(),
		partition: context.getPartition(),
		offset: message.offset,
	};
}
