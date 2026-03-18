import { Buffer } from "node:buffer";

import type { HeaderLike, RawHeaders } from "@/kafka/types";

export function normalizeHeaders(headers: RawHeaders): Record<string, Buffer> {
	const out: Record<string, Buffer> = {};
	if (!headers) return out;

	for (const [k, v] of Object.entries(headers)) {
		const buf = toHeaderBuffer(v as HeaderLike);
		if (buf) out[k] = buf;
	}

	return out;
}

export function toHeaderBuffer(v: HeaderLike): Buffer | null {
	if (v == null) return null;
	if (Buffer.isBuffer(v)) return v;
	if (v instanceof Uint8Array) return Buffer.from(v);
	if (v instanceof ArrayBuffer) return Buffer.from(new Uint8Array(v));

	if (Array.isArray(v)) {
		for (const x of v) {
			const b = toHeaderBuffer(x);
			if (b) return b;
		}

		return null;
	}

	// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
	switch (typeof v) {
		case "string":
			return Buffer.from(v);
		case "number":
			return Number.isFinite(v) ? Buffer.from(String(v)) : null;
		case "bigint":
			return Buffer.from(v.toString());
		case "boolean":
			return Buffer.from(v ? "true" : "false");
		case "object":
			if (v instanceof Date) return Buffer.from(v.toISOString());
			return null;
		default:
			return null;
	}
}

export function parseAttempt(buf?: Buffer): number {
	if (!buf) return 0;
	const n = Number(buf.toString());
	return Number.isFinite(n) && n >= 0 ? n : 0;
}
