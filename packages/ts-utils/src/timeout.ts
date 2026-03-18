import { setTimeout, clearTimeout } from "node:timers";

export const withTimeout = async <T>(
	promise: Promise<T>,
	timeoutMs: number,
	message: string,
): Promise<T> => {
	let timeout: ReturnType<typeof setTimeout> | undefined;

	try {
		return await Promise.race([
			promise,
			new Promise<never>((_, reject) => {
				timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
			}),
		]);
	} finally {
		if (timeout) {
			clearTimeout(timeout);
		}
	}
};
