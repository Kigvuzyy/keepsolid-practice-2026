import type { Book } from "@/modules/books/domain/entities";

export abstract class BookRepositoryPort {
	public abstract create(book: Book): Promise<{ id: bigint }>;

	public abstract assignCover(params: {
		bookId: bigint;
		bucket: string;
		objectKey: string;
	}): Promise<void>;
}
