import { OutboxAdapterFactory } from "@kigvuzyy/outbox-core";
import { Inject, Injectable, Optional } from "@nestjs/common";

import type { OutboxPort } from "@kigvuzyy/outbox-core";
import type { PrismaOutboxAdapterOptions } from "@/prisma-outbox.options";
import type { PrismaResolve, PrismaOutboxDelegateLike } from "@/prisma-outbox.adapter";

import { ClsServicePort } from "@/cls.port";
import { PrismaOutboxAdapter } from "@/prisma-outbox.adapter";

@Injectable()
export class PrismaOutboxAdapterFactory<TTransactionContext = unknown> extends OutboxAdapterFactory<
	PrismaOutboxAdapterOptions<TTransactionContext>,
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
		options: PrismaOutboxAdapterOptions<TTransactionContext>,
	): OutboxPort<TTransactionContext> {
		if (options.cls !== undefined && options.resolve === undefined) {
			throw new Error(
				"`PrismaOutboxAdapterOptions.resolve` is required when CLS transaction lookup is configured.",
			);
		}

		return new PrismaOutboxAdapter<TTransactionContext>(
			options.model,
			this.createResolver(options),
		);
	}

	private createResolver(
		options: PrismaOutboxAdapterOptions<TTransactionContext>,
	): PrismaResolve<TTransactionContext> {
		const resolveWithTx = options.resolve;

		if (resolveWithTx === undefined) {
			return () => options.model;
		}

		return (tx?: TTransactionContext): PrismaOutboxDelegateLike => {
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
		options: PrismaOutboxAdapterOptions<TTransactionContext>,
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
