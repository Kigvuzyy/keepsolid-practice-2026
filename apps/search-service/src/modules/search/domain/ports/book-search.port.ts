export interface SearchBooksInput {
	query: string;
	queryVector: number[];
	offset: number;
	limit: number;
}

export interface SearchBookMatch {
	id: string;
	chapterId: string;
	chapterIndex: number;
	chapterTitle: string;
	chunkIndex: number;
	text: string;
	sourceStartChar: number | null;
	sourceEndChar: number | null;
}

export interface SearchBookItem {
	bookId: string;
	score: number;
	rerankScore?: number;
	coverS3FilePath: string | null;
	match: SearchBookMatch;
}

export interface SearchBooksResult {
	items: SearchBookItem[];
	offset: number;
	limit: number;
	nextOffset: number | null;
}

export abstract class BookSearchPort {
	public abstract searchHybrid(input: SearchBooksInput): Promise<SearchBooksResult>;
}
