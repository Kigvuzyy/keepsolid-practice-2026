export const SearchSuggestionKind = {
	BOOK_TITLE: "BOOK_TITLE",
	AUTHOR: "AUTHOR",
} as const;

export type SearchSuggestionKindValue =
	(typeof SearchSuggestionKind)[keyof typeof SearchSuggestionKind];

export interface SyncBookSearchSuggestionsInput {
	id: bigint;
	bookId: bigint;
	title: string;
	authors: readonly string[];
}

export interface FindBookSearchSuggestionsInput {
	query: string;
	limit: number;
}

export interface BookSearchSuggestionItem {
	bookId: string;
	kind: SearchSuggestionKindValue;
	value: string;
}

export abstract class BookSearchSuggestionRepositoryPort {
	public abstract syncBookSuggestions(input: SyncBookSearchSuggestionsInput): Promise<void>;

	public abstract findSuggestions(
		input: FindBookSearchSuggestionsInput,
	): Promise<BookSearchSuggestionItem[]>;
}
