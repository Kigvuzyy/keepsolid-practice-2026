import { z } from "zod";

import { HEADER } from "@/constants";

const dateSchema = z.preprocess((arg) => {
	if (arg instanceof Date) return arg;

	if (typeof arg === "number") return new Date(arg);

	if (typeof arg === "string") {
		if (/^\d+$/.test(arg)) return new Date(Number(arg));
		return new Date(arg);
	}

	return null;
}, z.date());

export const InfraHeadersSchema = z.object({
	[HEADER.ID]: z.string(),

	[HEADER.TYPE]: z.string({ error: "Event Type is missing" }).min(1),

	[HEADER.SPEC_VERSION]: z.coerce.number().int().min(1).default(1),

	[HEADER.SOURCE]: z.string().default("unknown"),
	[HEADER.INSTANCE_ID]: z.string(),
	[HEADER.APP_VERSION]: z.string(),

	[HEADER.AGGREGATE_ID]: z.string(),
	[HEADER.AGGREGATE_TYPE]: z.string(),

	[HEADER.CORRELATION_ID]: z.uuid().nullish().default(null),
	[HEADER.CAUSATION_ID]: z.uuid().nullish().default(null),
	[HEADER.TRACE_PARENT]: z.string().nullish().default(null),
	[HEADER.TRACE_STATE]: z.string().nullish().default(null),

	[HEADER.OCCURRED_AT]: dateSchema,
});

export const BaseEnvelopeSchema = z.object({
	id: z.string(),
	type: z.string(),
	version: z.number(),
	payload: z.unknown(),

	source: z.string(),
	instance: z.string(),
	serviceVersion: z.string(),

	aggregateId: z.string(),
	aggregateType: z.string(),

	correlationId: z.uuid().nullish().default(null),
	causationId: z.uuid().nullish().default(null),
	traceParent: z.string().nullish().default(null),
	traceState: z.string().nullish().default(null),

	occurredAt: dateSchema,
});

export const OutboxEnvelopeSchema = BaseEnvelopeSchema.extend({
	topic: z.string().min(1),
	partitionKey: z.string().optional(),
});
