import type { PrismaIdempotencyDelegateLike, PrismaResolve } from "@/prisma-idempotency.adapter";

export interface PrismaIdempotencyClsOptions<TTransactionContext> {
	transactionKey: string;
	mapTransaction?(value: unknown): TTransactionContext | undefined;
}

export interface PrismaIdempotencyAdapterOptions<TTransactionContext = unknown> {
	model: PrismaIdempotencyDelegateLike;
	resolve?: PrismaResolve<TTransactionContext>;
	cls?: PrismaIdempotencyClsOptions<TTransactionContext>;
}
