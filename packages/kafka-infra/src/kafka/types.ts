import type { Buffer } from "node:buffer";
import type { IHeaders } from "@nestjs/microservices/external/kafka.interface";

export type HeaderLike =
	| (Buffer | Uint8Array | string)[]
	| ArrayBuffer
	| Buffer
	| Date
	| Uint8Array
	| bigint
	| boolean
	| number
	| string
	| null
	| undefined;

export interface KafkaPosition {
	offset: string;
	partition: number;
	topic: string;
}

export interface KafkaConsumerHelperOptions {
	allowKeyFallback?: boolean;
	eventIdHeader?: string;
	retryAttemptHeader?: string;
	strictEventId?: boolean;
}

export interface KafkaMessageMeta {
	attempt: number;
	eventId: string;
	headers: Record<string, Buffer>;
	key: Buffer | null;
	nextOffset: string;
	offset: string;
	partition: number;
	timestamp: string;
	topic: string;
}

export type RawHeaders = IHeaders | null | undefined;
