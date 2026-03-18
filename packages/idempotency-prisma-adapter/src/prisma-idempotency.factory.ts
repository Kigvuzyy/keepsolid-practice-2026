import { IdempotencyAdapterFactory } from "@kigvuzyy/idempotency-core";
import { Inject, Injectable, Optional } from "@nestjs/common";

import type { IdempotencyPort } from "@kigvuzyy/idempotency-core";
import type { PrismaIdempotencyAdapterOptions } from "@/prisma-idempotency.options";
import type {
	PrismaResolve,
	PrismaIdempotencyDelegateLike,
} from "@/prisma-idempotency.adapter";

import { ClsServicePort } from "@/cls.port";
import { PrismaIdempotencyAdapter } from "@/prisma-idempotency.adapter";

@Injectable()
export class PrismaIdempotencyAdapterFactory<
	TTransactionContext = unknown,
> extends IdempotencyAdapterFactory<
	PrismaIdempotencyAdapterOptions<TTransactionContext>,
	TTransactionContext
> {
	public constructor(
		@Optional()
		@Inject(ClsServicePort)
		private readonly clsService?: ClsServicePort,
	) {
		super();
	}

	public create(
		options: PrismaIdempotencyAdapterOptions<TTransactionContext>,
	): IdempotencyPort<TTransactionContext> {
		if (options.cls !== undefined && options.resolve === undefined) {
			throw new Error(
				"`PrismaIdempotencyAdapterOptions.resolve` is required when CLS transaction lookup is configured.",
			);
		}

		return new PrismaIdempotencyAdapter<TTransactionContext>(
			options.model,
			this.createResolver(options),
		);
	}

	private createResolver(
		options: PrismaIdempotencyAdapterOptions<TTransactionContext>,
	): PrismaResolve<TTransactionContext> {
		const resolveWithTx = options.resolve;

		if (resolveWithTx === undefined) {
			return () => options.model;
		}

		return (tx?: TTransactionContext): PrismaIdempotencyDelegateLike => {
			if (tx !== undefined) {
				return resolveWithTx(tx);
			}

			const clsTx = this.resolveTransactionFromCls(options);
			if (clsTx !== undefined) {
				return resolveWithTx(clsTx);
			}

			return options.model;
		};
	}

	private resolveTransactionFromCls(
		options: PrismaIdempotencyAdapterOptions<TTransactionContext>,
	): TTransactionContext | undefined {
		const clsOptions = options.cls;

		if (clsOptions === undefined || this.clsService === undefined) {
			return undefined;
		}

		const rawValue = this.clsService.get<TTransactionContext | undefined>(
			clsOptions.transactionKey,
		);

		if (clsOptions.mapTransaction !== undefined) {
			return clsOptions.mapTransaction(rawValue);
		}

		return rawValue;
	}
}
