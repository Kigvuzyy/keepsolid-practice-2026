import { Query } from "@nestjs/cqrs";

import type { GetPresignedUploadUrlResponseDto } from "@/modules/books/application/dtos";

export interface GetPresignedUploadUrlPayload {
	userId: bigint;
	fileName: string;
	contentType: string;
	contentLength: number;
}

export class GetPresignedUploadUrlQuery extends Query<GetPresignedUploadUrlResponseDto> {
	public constructor(public readonly payload: GetPresignedUploadUrlPayload) {
		super();
	}
}
