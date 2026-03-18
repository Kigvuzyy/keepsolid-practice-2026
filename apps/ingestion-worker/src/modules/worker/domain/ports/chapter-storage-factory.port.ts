import type { ChapterStoragePort } from "@/modules/worker/domain/ports/chapter-storage.port";
import type { ChapterBatchPolicy } from "@/modules/worker/domain/services/chapter-batch-policy";

export interface ChapterStorageFactoryInput {
	targetBucket: string;
	targetPrefix: string;
	batchPolicy: ChapterBatchPolicy;
}

export abstract class ChapterStorageFactoryPort {
	public abstract create(input: ChapterStorageFactoryInput): ChapterStoragePort;
}
