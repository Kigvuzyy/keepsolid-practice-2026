import type { PrismaOutboxDelegateLike, PrismaResolve } from "@/prisma-outbox.adapter";

export interface PrismaOutboxClsOptions<TTransactionContext> {
	transactionKey: string;
	mapTransaction?(value: unknown): TTransactionContext | undefined;
}

export interface PrismaOutboxAdapterOptions<TTransactionContext = unknown> {
	model: PrismaOutboxDelegateLike;
	resolve?: PrismaResolve<TTransactionContext>;
	cls?: PrismaOutboxClsOptions<TTransactionContext>;
}
