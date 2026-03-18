import type { LoggerService } from "@nestjs/common";
import type { KafkaContext } from "@nestjs/microservices";
import type { KafkaConsumerHelperOptions, KafkaMessageMeta } from "@/kafka/types";

import { keyToId } from "@/kafka/utils/key-utils";
import { nextOffset } from "@/kafka/utils/offset-utils";
import { getPosition } from "@/kafka/utils/context-utils";
import { PoisonMessageError } from "@/kafka/utils/errors";
import { normalizeHeaders, parseAttempt } from "@/kafka/utils/header-utils";
import { DEFAULT_EVENT_ID_HEADER, DEFAULT_RETRY_ATTEMPT_HEADER } from "@/kafka/constants";

export class KafkaConsumerHelper {
	private readonly allowKeyFallback: boolean;

	private readonly eventIdHeader: string;

	private readonly retryAttemptHeader: string;

	private readonly strictEventId: boolean;

	public constructor(
		private readonly logger: LoggerService,
		opts: KafkaConsumerHelperOptions = {},
	) {
		this.allowKeyFallback = opts.allowKeyFallback ?? true;
		this.eventIdHeader = opts.eventIdHeader ?? DEFAULT_EVENT_ID_HEADER;
		this.retryAttemptHeader = opts.retryAttemptHeader ?? DEFAULT_RETRY_ATTEMPT_HEADER;
		this.strictEventId = opts.strictEventId ?? true;
	}

	public getMeta(context: KafkaContext): KafkaMessageMeta | null {
		const message = context.getMessage();
		const topic = context.getTopic();
		const partition = context.getPartition();

		if (!message) {
			this.logger.warn(`(${topic}/${partition}) Empty Kafka message object`);
			return null;
		}

		const { offset, headers = {}, key, value, timestamp } = message;

		if (value === null || value === undefined) {
			this.logger.warn(`(${topic}/${partition}@${offset}) Tombstone message. Skipping.`);
			return null;
		}

		const normalized = normalizeHeaders(headers);
		const headerId = normalized[this.eventIdHeader]?.toString();
		const keyId = this.allowKeyFallback ? keyToId(key) : null;
		const eventId = headerId ?? keyId;

		if (!eventId && this.strictEventId) {
			throw new PoisonMessageError(
				this.allowKeyFallback
					? `Message without '${this.eventIdHeader}' header and without key (topic=${topic}, partition=${partition}, offset=${offset})`
					: `Message without required '${this.eventIdHeader}' header (topic=${topic}, partition=${partition}, offset=${offset})`,
			);
		}

		const attempt = parseAttempt(normalized[this.retryAttemptHeader]);

		return {
			topic,
			partition,
			offset,
			nextOffset: nextOffset(offset),
			key,
			headers: normalized,
			timestamp: timestamp ?? Date.now().toString(),
			eventId: eventId ?? "",
			attempt,
		};
	}

	public async commit(context: KafkaContext): Promise<void> {
		const { topic, partition, offset } = getPosition(context);
		const to = nextOffset(offset);

		try {
			await context.getConsumer().commitOffsets([{ topic, partition, offset: to }]);
			this.logger.debug?.(`Committed ${topic}/${partition} -> ${to}`);
		} catch (error) {
			this.logger.error(`Commit failed for ${topic}/${partition}@${offset} -> ${to}`, error);
			throw error;
		}
	}

	public pause(context: KafkaContext): void {
		const { topic, partition } = getPosition(context);
		context.getConsumer().pause([{ topic, partitions: [partition] }]);
		this.logger.debug?.(`Paused ${topic}/${partition}`);
	}

	public seekSameMessage(context: KafkaContext): void {
		const { topic, partition, offset } = getPosition(context);
		context.getConsumer().seek({ topic, partition, offset });
		this.logger.debug?.(`Seek to ${topic}/${partition}@${offset}`);
	}

	public resume(context: KafkaContext): void {
		const { topic, partition } = getPosition(context);
		context.getConsumer().resume([{ topic, partitions: [partition] }]);
		this.logger.debug?.(`Resumed ${topic}/${partition}`);
	}
}
