import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";

import type { JsonValue } from "@kigvuzyy/ts-utils";
import type { AnyEnvelope, CreateEnvelopeArgs, OutboxEnvelope } from "@/types";

import { HEADER } from "@/constants";
import { BaseEnvelopeSchema, InfraHeadersSchema } from "@/schemas";

const tryParsePayload = (payload: unknown): JsonValue => {
	if (payload === null || payload === undefined) return {};

	if (Buffer.isBuffer(payload)) {
		return JSON.parse(payload.toString("utf-8"));
	}

	if (typeof payload === "string") {
		return JSON.parse(payload);
	}

	if (typeof payload === "object") {
		return { ...payload };
	}

	return {};
};

export const parseEnvelope = (
	rawHeaders: Record<string, unknown>,
	rawKey: Buffer | string | null | undefined,
	rawPayload: unknown,
): AnyEnvelope => {
	const normalized: Record<string, unknown> = {};

	for (const [key, val] of Object.entries(rawHeaders)) {
		if (Buffer.isBuffer(val)) normalized[key] = val.toString();
		else normalized[key] = val;
	}

	if (!normalized[HEADER.ID] && rawKey) {
		normalized[HEADER.ID] = rawKey.toString();
	}

	const h = InfraHeadersSchema.parse(normalized);

	const parsedPayload = tryParsePayload(rawPayload);

	const envelopeCandidate = {
		id: h[HEADER.ID] ?? randomUUID(),
		type: h[HEADER.TYPE],
		version: h[HEADER.SPEC_VERSION],
		payload: parsedPayload,

		source: h[HEADER.SOURCE],
		instance: h[HEADER.INSTANCE_ID],
		serviceVersion: h[HEADER.APP_VERSION],

		aggregateId: h[HEADER.AGGREGATE_ID],
		aggregateType: h[HEADER.AGGREGATE_TYPE],

		correlationId: h[HEADER.CORRELATION_ID],
		causationId: h[HEADER.CAUSATION_ID],
		traceParent: h[HEADER.TRACE_PARENT],
		traceState: h[HEADER.TRACE_STATE],

		occurredAt: h[HEADER.OCCURRED_AT],
	};

	return BaseEnvelopeSchema.parse(envelopeCandidate);
};

export const createEnvelope = <E extends string, P>(
	args: CreateEnvelopeArgs<E, P>,
): OutboxEnvelope<E, P> => {
	return {
		id: args.id ?? randomUUID(),

		topic: args.topic,
		type: args.type,
		version: args.version,
		payload: args.payload,

		source: args.source,
		instance: args.instance,
		serviceVersion: args.serviceVersion,

		aggregateId: args.aggregateId,
		aggregateType: args.aggregateType,

		correlationId: args.correlationId,
		causationId: args.causationId,
		traceParent: args.traceParent ?? null,
		traceState: args.traceState ?? null,
		occurredAt: args.occurredAt ? new Date(args.occurredAt) : new Date(),
	};
};
