import type { z } from "zod";
import type { BaseEnvelopeSchema, OutboxEnvelopeSchema, InfraHeadersSchema } from "@/schemas";

export type InfraHeaders = z.infer<typeof InfraHeadersSchema>;

export type AnyEnvelope = z.infer<typeof BaseEnvelopeSchema>;

export interface Envelope<E extends string, P> extends Omit<AnyEnvelope, "payload" | "type"> {
	type: E;
	payload: P;
}

export type AnyOutboxEnvelope = z.infer<typeof OutboxEnvelopeSchema>;

export interface OutboxEnvelope<E extends string, P>
	extends Omit<AnyOutboxEnvelope, "payload" | "type"> {
	type: E;
	payload: P;
}

export interface CreateEnvelopeArgs<E extends string, P> {
	id?: string;

	topic: string;
	type: E;
	version: number;
	payload: P;

	source: string;
	instance: string;
	serviceVersion: string;

	aggregateId: string;
	aggregateType: string;

	correlationId: string | null;
	causationId: string | null;
	traceParent?: string | null;
	traceState?: string | null;

	occurredAt?: Date | string;
}
