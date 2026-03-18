import os from "node:os";
import process from "node:process";

import { createEnvelope } from "@kigvuzyy/kafka-envelope";

import type { z } from "zod";
import type { AnySpec, InferEventName, InferPayload, SpecOutboxEnvelope } from "@/types";

type ProvidedFields =
	| "aggregateId"
	| "aggregateType"
	| "id"
	| "instance"
	| "occurredAt"
	| "payload"
	| "producer"
	| "serviceVersion"
	| "source"
	| "topic"
	| "type"
	| "version";

type EventMeta<S extends AnySpec> = Omit<SpecOutboxEnvelope<S>, ProvidedFields> & {
	tracingSpanContext?: string | null;
};

export const makeEvent = <S extends AnySpec>(
	spec: S,
	payload: InferPayload<S>,
	meta: EventMeta<S> = {
		correlationId: null,
		causationId: null,
		traceParent: null,
		traceState: null,
	},
): SpecOutboxEnvelope<S> => {
	const parsed = (spec.schema as z.ZodType<InferPayload<S>>).safeParse(payload);

	if (!parsed.success) {
		const msg = `Invalid payload for ${spec.name} v${spec.version}: ${parsed.error.message}`;
		throw new Error(msg);
	}

	return createEnvelope<InferEventName<S>, InferPayload<S>>({
		...meta,

		type: spec.name as InferEventName<S>,
		topic: spec.topic.name,
		version: spec.version,

		aggregateType: spec.aggregateType,
		aggregateId: spec.aggregateId(parsed.data),

		payload: parsed.data,

		source: process.env.SERVICE_NAME ?? process.env.npm_package_name ?? "app",
		instance: process.env.HOSTNAME ?? os.hostname(),
		serviceVersion: process.env.APP_VERSION ?? process.env.npm_package_version ?? "0.0.0",
	});
};
