export const HEADER = {
	ID: "id",
	TYPE: "x-event-type",
	SPEC_VERSION: "x-spec-version",

	SOURCE: "x-source",
	INSTANCE_ID: "x-instance-id",
	APP_VERSION: "x-app-version",

	AGGREGATE_ID: "x-aggregate-id",
	AGGREGATE_TYPE: "x-aggregate-type",

	CORRELATION_ID: "x-correlation-id",
	CAUSATION_ID: "x-causation-id",
	TRACE_PARENT: "traceparent",
	TRACE_STATE: "tracestate",

	OCCURRED_AT: "x-occurred-at",
	TIMESTAMP: "x-timestamp",
} as const;
