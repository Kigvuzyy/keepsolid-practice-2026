import type { BookChapter } from "@/modules/books/domain/entities";

export abstract class BookChapterRepositoryPort {
	public abstract upsert(chapter: BookChapter): Promise<{ id: bigint }>;
}
