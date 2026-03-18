import { Inject, Injectable } from "@nestjs/common";
import { OpenAIEmbeddingsService } from "@kigvuzyy/ai-core/openai";

import type { TextChunk } from "@/modules/worker/domain/ports/html-chunking.port";

import { ConfigService } from "@/infrastructure/config/config.service";
import { HtmlChunkingPort } from "@/modules/worker/domain/ports/html-chunking.port";
import { ChapterVectorStorePort } from "@/modules/worker/domain/ports/chapter-vector-store.port";
import { BookVectorizationProgressService } from "@/modules/worker/application/services/book-vectorization-progress.service";

export interface VectorizeStoredChapterInput {
	bookId: bigint;
	chapterId: string;
	chapterIndex: number;
	chapterTitle: string;
	html: string;
	s3FilePath: string;
	coverS3FilePath: string | null;
}

@Injectable()
export class ChapterVectorizationService {
	public constructor(
		@Inject(ConfigService)
		private readonly config: ConfigService,

		@Inject(OpenAIEmbeddingsService)
		private readonly embedding: OpenAIEmbeddingsService,

		@Inject(HtmlChunkingPort)
		private readonly chunking: HtmlChunkingPort,

		@Inject(ChapterVectorStorePort)
		private readonly vectorStore: ChapterVectorStorePort,

		@Inject(BookVectorizationProgressService)
		private readonly vectorizationProgress: BookVectorizationProgressService,
	) {}

	public async vectorizeChapter(input: VectorizeStoredChapterInput): Promise<number> {
		const chunked = await this.chunking.chunk({ html: input.html });
		const indexableChunks = chunked.chunks.filter((chunk) => this.isIndexableChunk(chunk));

		await this.vectorStore.deleteChapterVectors({
			bookId: input.bookId,
			chapterId: input.chapterId,
		});

		if (indexableChunks.length === 0) {
			await this.vectorizationProgress.recordChapterVectorized({
				bookId: input.bookId,
				chapterId: input.chapterId,
				chapterIndex: input.chapterIndex,
				chunksCount: 0,
			});

			return 0;
		}

		const vectors = await this.embedding.createEmbeddings(
			indexableChunks.map((chunk) => chunk.text),
		);

		if (vectors.length !== indexableChunks.length) {
			throw new Error("Embeddings count does not match chunk count");
		}

		await this.vectorStore.upsertChapterVectors({
			bookId: input.bookId,
			chapterId: input.chapterId,
			chapterIndex: input.chapterIndex,
			chapterTitle: input.chapterTitle,
			s3FilePath: input.s3FilePath,
			coverS3FilePath: input.coverS3FilePath,
			chunks: indexableChunks.map((chunk, index) => ({
				chunk,
				vector: vectors[index]!,
			})),
		});

		await this.vectorizationProgress.recordChapterVectorized({
			bookId: input.bookId,
			chapterId: input.chapterId,
			chapterIndex: input.chapterIndex,
			chunksCount: indexableChunks.length,
		});

		return indexableChunks.length;
	}

	private isIndexableChunk(chunk: TextChunk): boolean {
		return chunk.text.trim().length >= this.config.get("VECTORIZATION_MIN_CHUNK_CHARS");
	}
}
