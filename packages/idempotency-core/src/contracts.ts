export abstract class IdempotencyPort<TTransactionContext = unknown> {
	public abstract isProcessed(eventId: string, tx?: TTransactionContext): Promise<boolean>;

	public abstract markProcessed(eventId: string, tx?: TTransactionContext): Promise<void>;
}

export abstract class IdempotencyAdapterFactory<TOptions, TTransactionContext = unknown> {
	public abstract create(options: TOptions): IdempotencyPort<TTransactionContext>;
}
