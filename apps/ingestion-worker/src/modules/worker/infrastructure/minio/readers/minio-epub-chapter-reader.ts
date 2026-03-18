import { Inject, Injectable } from "@nestjs/common";

import type {
	EpubChapterReaderPort,
	EpubChapterReadSessionPort,
	ReaderOpenInput,
} from "@/modules/worker/domain/ports/epub-chapter-reader.port";

import { MinioZipSourceService } from "@/modules/worker/infrastructure/minio/services/minio-zip-source.service";
import { EpubReadPreparationService } from "@/modules/worker/infrastructure/epub/services/epub-read-preparation.service";
import { EpubChapterReadSessionFactory } from "@/modules/worker/infrastructure/epub/pipeline/epub-chapter-read-session.factory";

@Injectable()
export class MinioEpubChapterReader implements EpubChapterReaderPort {
	public constructor(
		@Inject(MinioZipSourceService)
		private readonly minioZipSourceService: MinioZipSourceService,

		@Inject(EpubReadPreparationService)
		private readonly readPreparation: EpubReadPreparationService,

		@Inject(EpubChapterReadSessionFactory)
		private readonly readSessionFactory: EpubChapterReadSessionFactory,
	) {}

	public async open(input: ReaderOpenInput): Promise<EpubChapterReadSessionPort> {
		const openedZip = await this.minioZipSourceService.openZip(
			input.sourceObjectName,
			input.sourceBucket,
		);

		const prepared = await this.readPreparation.prepare({
			sourceBucket: input.sourceBucket,
			sourceObjectName: input.sourceObjectName,
			openedZip,
		});

		return this.readSessionFactory.create(prepared);
	}
}
