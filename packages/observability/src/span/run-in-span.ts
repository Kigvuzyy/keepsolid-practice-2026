import { SpanStatusCode, trace } from "@opentelemetry/api";

import type { Exception, Span } from "@opentelemetry/api";

export type SpanAttrs = Readonly<Record<string, boolean | number | string>>;

function handleSpanError(span: Span, error: unknown): void {
	span.recordException(error as Exception);
	span.setStatus({ code: SpanStatusCode.ERROR });
}

function isPromise<T>(value: unknown): value is Promise<T> {
	return !!value && typeof (value as Promise<T>).then === "function";
}

export function runInSpan<T>(name: string, fn: () => T): T;
export function runInSpan<T>(name: string, attrs: SpanAttrs | undefined, fn: () => T): T;
export function runInSpan<T>(
	name: string,
	attrsOrFn: SpanAttrs | (() => T) | undefined,
	maybeFn?: () => T,
): T {
	const attrs = typeof attrsOrFn === "function" ? undefined : attrsOrFn;
	const fn = typeof attrsOrFn === "function" ? attrsOrFn : maybeFn;

	if (!fn) {
		throw new Error("runInSpan: missing function argument");
	}

	const tracer = trace.getTracer("app");

	return tracer.startActiveSpan(name, (span) => {
		if (attrs) {
			span.setAttributes(attrs);
		}

		try {
			const result = fn();

			if (isPromise(result)) {
				return result.then(
					(val) => {
						span.end();
						return val;
					},
					(err) => {
						handleSpanError(span, err);
						span.end();
						throw err;
					},
				) as T;
			}

			span.end();
			return result;
		} catch (err) {
			handleSpanError(span, err);
			span.end();
			throw err;
		}
	});
}
