import { Injectable } from "@nestjs/common";
import { InjectTransaction } from "@nestjs-cls/transactional";

import type { Transaction } from "@nestjs-cls/transactional";
import type { UploadIntent } from "@/modules/books/domain/entities";
import type { PrismaService } from "@/infrastructure/persistence/prisma/prisma.service";
import type { TransactionalAdapterPrisma } from "@nestjs-cls/transactional-adapter-prisma";
import type { UploadIntentRepositoryPort } from "@/modules/books/domain/ports/upload-intent.repository.port";

import { PrismaUploadIntentMapper } from "@/modules/books/infrastructure/mappers/prisma-upload-intent.mapper";

@Injectable()
export class PrismaUploadIntentRepository implements UploadIntentRepositoryPort {
	public constructor(
		@InjectTransaction()
		private readonly prisma: Transaction<TransactionalAdapterPrisma<PrismaService>>,
	) {}

	public async findByIdAndUserId(params: {
		id: bigint;
		userId: bigint;
	}): Promise<UploadIntent | null> {
		const row = await this.prisma.uploadIntent.findFirst({
			where: {
				id: params.id,
				userId: params.userId,
			},
		});

		if (!row) {
			return null;
		}

		return PrismaUploadIntentMapper.toDomain(row);
	}

	public async create(intent: UploadIntent): Promise<{ id: bigint }> {
		const data = PrismaUploadIntentMapper.toPersistence(intent);

		return this.prisma.uploadIntent.create({
			data,
			select: {
				id: true,
			},
		});
	}

	public async save(intent: UploadIntent): Promise<void> {
		if (intent.id === null) {
			throw new Error("Cannot save UploadIntent without id");
		}

		const data = PrismaUploadIntentMapper.toUpdatePersistence(intent);

		await this.prisma.uploadIntent.update({
			where: {
				id: intent.id,
			},
			data,
		});
	}
}
