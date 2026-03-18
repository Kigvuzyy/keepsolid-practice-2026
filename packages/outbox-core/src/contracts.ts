import type { AnyOutboxEnvelope } from "@kigvuzyy/kafka-envelope";

export abstract class OutboxPort<TTransactionContext = unknown> {
	public abstract append<Envelope extends AnyOutboxEnvelope>(
		env: Envelope,
		tx?: TTransactionContext,
	): Promise<void>;

	public abstract appendMany<Envelope extends AnyOutboxEnvelope>(
		envs: readonly Envelope[],
		tx?: TTransactionContext,
	): Promise<void>;
}

export abstract class OutboxAdapterFactory<TOptions, TTransactionContext = unknown> {
	public abstract create(options: TOptions): OutboxPort<TTransactionContext>;
}
