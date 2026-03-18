export interface ErrorMeta {
	context?: Record<string, unknown>;
	field?: string;
	[key: string]: unknown;
}
