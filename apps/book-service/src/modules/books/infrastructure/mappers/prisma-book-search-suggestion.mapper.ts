import { formatSnowflakeId } from "@kigvuzyy/snowflake-id";

import type { BookSearchSuggestionItem } from "@/modules/books/domain/ports/book-search-suggestion.repository.port";

import { SearchSuggestionKind } from "@/modules/books/domain/ports/book-search-suggestion.repository.port";

export interface BookSearchSuggestionPersistenceRow {
	id: bigint;
	bookId: bigint;
	kind: BookSearchSuggestionItem["kind"];
	sourceKey: string;
	value: string;
	normalizedValue: string;
	rank: number;
}

export class PrismaBookSearchSuggestionMapper {
	public static normalize(value: string): string {
		return value.toLowerCase().trim().replace(/\s+/g, " ");
	}

	public static toBookPersistence(input: {
		id: bigint;
		bookId: bigint;
		title: string;
		authors: readonly string[];
	}): BookSearchSuggestionPersistenceRow[] {
		const rows: BookSearchSuggestionPersistenceRow[] = [];
		const normalizedTitle = this.normalize(input.title);

		if (normalizedTitle.length > 0) {
			rows.push({
				id: input.id,
				bookId: input.bookId,
				kind: SearchSuggestionKind.BOOK_TITLE,
				sourceKey: "book:title",
				value: input.title.trim(),
				normalizedValue: normalizedTitle,
				rank: 100,
			});
		}

		const uniqueAuthors = new Map<string, string>();

		for (const author of input.authors) {
			const trimmed = author.trim();
			const normalized = this.normalize(trimmed);

			if (normalized.length === 0 || uniqueAuthors.has(normalized)) {
				continue;
			}

			uniqueAuthors.set(normalized, trimmed);
		}

		for (const [normalizedValue, value] of uniqueAuthors.entries()) {
			rows.push({
				id: input.id,
				bookId: input.bookId,
				kind: SearchSuggestionKind.AUTHOR,
				sourceKey: `book:author:${normalizedValue}`,
				value,
				normalizedValue,
				rank: 80,
			});
		}

		return rows;
	}

	public static toDomain(row: {
		bookId: bigint;
		kind: string;
		value: string;
	}): BookSearchSuggestionItem {
		return {
			bookId: formatSnowflakeId(row.bookId),
			kind: row.kind as BookSearchSuggestionItem["kind"],
			value: row.value,
		};
	}
}
