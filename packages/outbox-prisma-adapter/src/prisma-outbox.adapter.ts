import type { OutboxPort } from "@kigvuzyy/outbox-core";
import type { AnyOutboxEnvelope } from "@kigvuzyy/kafka-envelope";
import type { BivariantMethod, JsonValue } from "@kigvuzyy/ts-utils";

interface OutboxCreate {
	id: string;

	topic: string;

	type: string;
	specVersion: number;
	payload: JsonValue;

	aggregateId: string;
	aggregateType: string;

	source: string;
	instance: string;
	serviceVersion: string | null;

	correlationId: string | null;
	causationId: string | null;
	traceParent: string | null;
	traceState: string | null;

	occurredAt: Date;
}

interface CreateArgsLike {
	data: OutboxCreate;
}

interface CreateManyArgsLike {
	data: OutboxCreate[];
}

export interface PrismaOutboxDelegateLike {
	create: BivariantMethod<CreateArgsLike>;
	createMany: BivariantMethod<CreateManyArgsLike>;
}

export type PrismaResolve<TTransactionContext> = (
	tx?: TTransactionContext,
) => PrismaOutboxDelegateLike;

export class PrismaOutboxAdapter<TTransactionContext> implements OutboxPort<TTransactionContext> {
	public constructor(
		private readonly model: PrismaOutboxDelegateLike,
		private readonly resolve: PrismaResolve<TTransactionContext> = () => this.model,
	) {}

	private static toCreate(env: AnyOutboxEnvelope): OutboxCreate {
		return {
			id: env.id,

			topic: env.topic,

			type: env.type,
			specVersion: env.version,
			payload: env.payload as JsonValue,

			aggregateId: env.aggregateId,
			aggregateType: env.aggregateType,

			source: env.source,
			instance: env.instance,
			serviceVersion: env.serviceVersion,

			correlationId: env.correlationId,
			causationId: env.causationId,
			traceParent: env.traceParent,
			traceState: env.traceState,

			occurredAt: new Date(env.occurredAt),
		};
	}

	public async append<Envelope extends AnyOutboxEnvelope>(
		env: Envelope,
		tx?: TTransactionContext,
	): Promise<void> {
		const client = this.resolve(tx);
		await client.create({ data: PrismaOutboxAdapter.toCreate(env) });
	}

	public async appendMany<Envelope extends AnyOutboxEnvelope>(
		envs: readonly Envelope[],
		tx?: TTransactionContext,
	): Promise<void> {
		if (envs.length === 0) return;

		const client = this.resolve(tx);

		const data: CreateManyArgsLike["data"] = envs.map((env) =>
			PrismaOutboxAdapter.toCreate(env),
		);

		await client.createMany({ data });
	}
}
