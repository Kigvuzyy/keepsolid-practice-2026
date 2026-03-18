import { createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { formatSnowflakeId } from "@kigvuzyy/snowflake-id";
import {
	QDRANT_BM25_MODEL,
	QDRANT_DENSE_VECTOR_NAME,
	QDRANT_SPARSE_VECTOR_NAME,
	QdrantService,
} from "@kigvuzyy/qdrant-nest";

import type {
	ChapterVectorStorePort,
	DeleteChapterVectorsInput,
	SetBookSearchableInput,
	UpsertChapterVectorsInput,
} from "@/modules/worker/domain/ports/chapter-vector-store.port";

const UPSERT_BATCH_SIZE = 128;

@Injectable()
export class QdrantChapterVectorStoreAdapter implements ChapterVectorStorePort {
	public constructor(
		@Inject(QdrantService)
		private readonly qdrant: QdrantService,
	) {}

	public async deleteChapterVectors(input: DeleteChapterVectorsInput): Promise<void> {
		const collectionName = this.qdrant.getBookChunksCollection();

		await this.qdrant.delete(collectionName, {
			wait: true,
			filter: {
				must: [
					{
						key: "bookId",
						match: {
							value: formatSnowflakeId(input.bookId),
						},
					},
					{
						key: "chapterId",
						match: {
							value: input.chapterId,
						},
					},
				],
			},
		});
	}

	public async upsertChapterVectors(input: UpsertChapterVectorsInput): Promise<void> {
		if (input.chunks.length === 0) {
			return;
		}

		const collectionName = this.qdrant.getBookChunksCollection();

		const points = input.chunks.map(({ chunk, vector }) => ({
			id: this.buildPointId(input.bookId, input.chapterId, chunk.chunkIndex),
			vector: {
				[QDRANT_DENSE_VECTOR_NAME]: vector,
				[QDRANT_SPARSE_VECTOR_NAME]: {
					text: chunk.text,
					model: QDRANT_BM25_MODEL,
				},
			},
			payload: {
				bookId: formatSnowflakeId(input.bookId),
				chapterId: input.chapterId,
				chapterIndex: input.chapterIndex,
				chapterTitle: input.chapterTitle,
				chunkIndex: chunk.chunkIndex,
				text: chunk.text,
				charCount: chunk.charCount,
				contextChars: chunk.contextChars,
				sourceStartChar: chunk.sourceStartChar,
				sourceEndChar: chunk.sourceEndChar,
				s3FilePath: input.s3FilePath,
				coverS3FilePath: input.coverS3FilePath,
				isSearchable: false,
			},
		}));

		for (let index = 0; index < points.length; index += UPSERT_BATCH_SIZE) {
			await this.qdrant.upsert(collectionName, {
				wait: true,
				points: points.slice(index, index + UPSERT_BATCH_SIZE),
			});
		}
	}

	public async setBookSearchable(input: SetBookSearchableInput): Promise<void> {
		const collectionName = this.qdrant.getBookChunksCollection();

		await this.qdrant.setPayload(collectionName, {
			wait: true,
			payload: {
				isSearchable: input.isSearchable,
			},
			filter: {
				must: [
					{
						key: "bookId",
						match: {
							value: formatSnowflakeId(input.bookId),
						},
					},
				],
			},
		});
	}

	private buildPointId(bookId: bigint, chapterId: string, chunkIndex: number): string {
		const seed = `${bookId.toString()}:${chapterId}:${chunkIndex}`;
		const hash = createHash("sha1").update(seed).digest("hex").slice(0, 32).split("");

		hash[12] = "5";
		hash[16] = ["8", "9", "a", "b"][parseInt(hash[16]!, 16) % 4]!;

		return [
			hash.slice(0, 8).join(""),
			hash.slice(8, 12).join(""),
			hash.slice(12, 16).join(""),
			hash.slice(16, 20).join(""),
			hash.slice(20, 32).join(""),
		].join("-");
	}
}
