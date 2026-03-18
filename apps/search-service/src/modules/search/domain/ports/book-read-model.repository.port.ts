export interface FindBookReadModelsByIdsPayload {
	bookIds: bigint[];
}

export interface BookSearchReadModel {
	bookId: bigint;
	title: string;
	description: string | null;
	authors: string[];
	coverObjectKey: string | null;
}

export interface SetCoverObjectKeyPayload {
	bookId: bigint;
	coverObjectKey: string;
}

export interface SaveBookReadModelPayload {
	bookId: bigint;
	title: string;
	description: string | null;
	authors: string[];
	coverObjectKey: string | null;
	createdAt: Date;
}

export abstract class BookSearchReadModelRepositoryPort {
	public abstract findByIds(
		payload: FindBookReadModelsByIdsPayload,
	): Promise<BookSearchReadModel[]>;

	public abstract setCoverObjectKey(payload: SetCoverObjectKeyPayload): Promise<void>;

	public abstract save(payload: SaveBookReadModelPayload): Promise<void>;
}
