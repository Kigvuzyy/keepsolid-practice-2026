import type { ZodType } from "zod";
import type { AnyTopic } from "@kigvuzyy/kafka-topics";
import type { Envelope, OutboxEnvelope } from "@kigvuzyy/kafka-envelope";

export interface EventDef<P, T extends AnyTopic = AnyTopic> {
	readonly version: number;
	readonly topic: T;
	readonly aggregateType: string;
	aggregateId(payload: P): string;
	readonly schema: ZodType<P>;
}

export interface EventSpec<E extends string, P, T extends AnyTopic = AnyTopic>
	extends EventDef<P, T> {
	readonly name: E;
}

export type InferEventName<S> = S extends EventSpec<infer E, unknown, AnyTopic> ? E : never;
export type InferPayload<S> = S extends EventSpec<string, infer P, AnyTopic> ? P : never;
export type InferTopic<S> = S extends EventSpec<string, unknown, infer T> ? T : never;
export type InferTopicName<S> = InferTopic<S>["name"];

export type SpecEnvelope<S> = Envelope<InferEventName<S>, InferPayload<S>>;
export type SpecOutboxEnvelope<S> = OutboxEnvelope<InferEventName<S>, InferPayload<S>>;

export type AnySpec = EventSpec<string, unknown, AnyTopic>;
