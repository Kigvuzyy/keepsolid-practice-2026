import type { IdempotencyPort } from "@kigvuzyy/idempotency-core";

interface FindUniqueArgsLike {
	where: { eventId: string };
	select?: { eventId?: boolean };
}

interface CreateArgsLike {
	data: { eventId: string };
}

interface CreateManyArgsLike {
	data: { eventId: string }[];
	skipDuplicates?: boolean;
}

interface CreateManyResultLike {
	count: number;
}

export interface PrismaIdempotencyDelegateLike {
	findUnique(args: FindUniqueArgsLike): Promise<{ eventId: string } | null>;
	create(args: CreateArgsLike): Promise<unknown>;
	createMany?(args: CreateManyArgsLike): Promise<CreateManyResultLike>;
}

export type PrismaResolve<TTransactionContext> = (
	tx?: TTransactionContext,
) => PrismaIdempotencyDelegateLike;

export class PrismaIdempotencyAdapter<TTransactionContext = unknown>
	implements IdempotencyPort<TTransactionContext>
{
	public constructor(
		private readonly model: PrismaIdempotencyDelegateLike,
		private readonly resolve: PrismaResolve<TTransactionContext> = () => this.model,
	) {}

	public async isProcessed(eventId: string, tx?: TTransactionContext): Promise<boolean> {
		const client = this.resolve(tx);
		const found = await client.findUnique({
			where: { eventId },
			select: { eventId: true },
		});

		return found !== null;
	}

	public async markProcessed(eventId: string, tx?: TTransactionContext): Promise<void> {
		const client = this.resolve(tx);

		if (client.createMany !== undefined) {
			await client.createMany({
				data: [{ eventId }],
				skipDuplicates: true,
			});
			return;
		}

		await client.create({
			data: { eventId },
		});
	}
}
