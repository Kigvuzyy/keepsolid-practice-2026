import { MinioService } from "@kigvuzyy/minio-nest";
import { Inject, Injectable } from "@nestjs/common";

import type {
	ChapterStorageFactoryInput,
	ChapterStorageFactoryPort,
} from "@/modules/worker/domain/ports/chapter-storage-factory.port";

import { ObjectKeyFactory } from "@/modules/worker/domain/services/object-key-factory";
import { MinioChapterStorage } from "@/modules/worker/infrastructure/minio/storage/minio-chapter-storage";

@Injectable()
export class MinioChapterStorageFactory implements ChapterStorageFactoryPort {
	public constructor(
		@Inject(MinioService)
		private readonly minioClient: MinioService,

		@Inject(ObjectKeyFactory)
		private readonly keyFactory: ObjectKeyFactory,
	) {}

	public create(input: ChapterStorageFactoryInput): MinioChapterStorage {
		return new MinioChapterStorage(this.minioClient, this.keyFactory, {
			targetBucket: input.targetBucket,
			targetPrefix: input.targetPrefix,
			batchPolicy: input.batchPolicy,
		});
	}
}
