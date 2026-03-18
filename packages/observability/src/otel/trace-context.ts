import { context, propagation } from "@opentelemetry/api";

const TRACE_CONTEXT_SETTER = {
	set(carrier: Record<string, string>, key: string, value: string) {
		carrier[key] = value;
	},
};

export interface ActiveTraceContext {
	traceParent: string | null;
	traceState: string | null;
}

export function getActiveTraceContext(): ActiveTraceContext {
	const carrier: Record<string, string> = {};

	propagation.inject(context.active(), carrier, TRACE_CONTEXT_SETTER);

	return {
		traceParent: carrier.traceparent ?? null,
		traceState: carrier.tracestate ?? null,
	};
}
