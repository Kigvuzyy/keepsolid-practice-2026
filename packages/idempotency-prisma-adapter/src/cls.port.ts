export abstract class ClsServicePort {
	public abstract get<TValue = unknown>(key: string): TValue | undefined;
}
