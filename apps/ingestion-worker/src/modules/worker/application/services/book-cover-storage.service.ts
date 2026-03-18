import { Inject, Injectable } from "@nestjs/common";

import type { BookCoverAsset } from "@/modules/worker/domain/ports/epub-chapter-reader.port";

import { ObjectStoragePort } from "@/modules/worker/domain/ports/object-storage.port";
import { ObjectKeyFactory } from "@/modules/worker/domain/services/object-key-factory";

export interface StoredBookCover {
	bucket: string;
	objectName: string;
	contentType: string;
}

@Injectable()
export class BookCoverStorageService {
	public constructor(
		@Inject(ObjectStoragePort)
		private readonly objectStorage: ObjectStoragePort,

		@Inject(ObjectKeyFactory)
		private readonly objectKeyFactory: ObjectKeyFactory,
	) {}

	public async persistCover(params: {
		targetBucket: string;
		targetPrefix: string;
		coverAsset: BookCoverAsset;
	}): Promise<StoredBookCover> {
		const objectName = this.objectKeyFactory.buildCoverObjectName(
			params.targetPrefix,
			params.coverAsset.fileExtension,
		);

		await this.objectStorage.putObject({
			bucket: params.targetBucket,
			objectName,
			data: params.coverAsset.bytes,
			size: params.coverAsset.bytes.length,
			metaData: {
				"Content-Type": params.coverAsset.mediaType,
			},
		});

		return {
			bucket: params.targetBucket,
			objectName,
			contentType: params.coverAsset.mediaType,
		};
	}
}
