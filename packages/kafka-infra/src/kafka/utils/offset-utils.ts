export function nextOffset(current: string): string {
	try {
		return (BigInt(current) + 1n).toString();
	} catch {
		const n = Number(current);
		return Number.isFinite(n) ? String(n + 1) : current;
	}
}
