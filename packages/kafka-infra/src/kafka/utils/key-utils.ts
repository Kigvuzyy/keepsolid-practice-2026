import { Buffer } from "node:buffer";

export type KeyLike = Buffer | Uint8Array | string | null | undefined;

export function keyToId(key: KeyLike, enc: BufferEncoding = "utf8"): string | undefined {
	if (key == null) return undefined;
	if (typeof key === "string") return key;
	if (Buffer.isBuffer(key)) return key.toString(enc);
	if (key instanceof Uint8Array) return Buffer.from(key).toString(enc);
	return String(key);
}
