import type { TextChunk } from "@/modules/worker/domain/ports/html-chunking.port";

export interface ChapterChunkVector {
	chunk: TextChunk;
	vector: number[];
}

export interface DeleteChapterVectorsInput {
	bookId: bigint;
	chapterId: string;
}

export interface UpsertChapterVectorsInput {
	bookId: bigint;
	chapterId: string;
	chapterIndex: number;
	chapterTitle: string;
	s3FilePath: string;
	coverS3FilePath: string | null;
	chunks: ChapterChunkVector[];
}

export interface SetBookSearchableInput {
	bookId: bigint;
	isSearchable: boolean;
}

export abstract class ChapterVectorStorePort {
	public abstract deleteChapterVectors(input: DeleteChapterVectorsInput): Promise<void>;

	public abstract upsertChapterVectors(input: UpsertChapterVectorsInput): Promise<void>;

	public abstract setBookSearchable(input: SetBookSearchableInput): Promise<void>;
}
