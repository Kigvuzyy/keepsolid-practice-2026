import { Inject, Injectable } from "@nestjs/common";
import { BookStatus, Prisma } from "database/client";
import { InjectTransaction } from "@nestjs-cls/transactional";

import { PrismaService } from "@/infrastructure/persistence/prisma/prisma.service";

import type { Transaction } from "@nestjs-cls/transactional";
import type { TransactionalAdapterPrisma } from "@nestjs-cls/transactional-adapter-prisma";
import type {
	BookSearchSuggestionItem,
	BookSearchSuggestionRepositoryPort,
	FindBookSearchSuggestionsInput,
	SyncBookSearchSuggestionsInput,
} from "@/modules/books/domain/ports/book-search-suggestion.repository.port";

import { SearchSuggestionKind } from "@/modules/books/domain/ports/book-search-suggestion.repository.port";
import { PrismaBookSearchSuggestionMapper } from "@/modules/books/infrastructure/mappers/prisma-book-search-suggestion.mapper";

const SIMILARITY_THRESHOLD = 0.18;
const WORD_SIMILARITY_THRESHOLD = 0.28;

interface SuggestionCandidate {
	bookId: bigint;
	kind: string;
	value: string;
	normalizedValue: string;
	rank: number;
	score: number;
}

@Injectable()
export class PrismaBookSearchSuggestionRepository implements BookSearchSuggestionRepositoryPort {
	public constructor(
		@Inject(PrismaService)
		private readonly prisma: PrismaService,

		@InjectTransaction()
		private readonly tx: Transaction<TransactionalAdapterPrisma<PrismaService>>,
	) {}

	public async syncBookSuggestions(input: SyncBookSearchSuggestionsInput): Promise<void> {
		const rows = PrismaBookSearchSuggestionMapper.toBookPersistence(input);

		await this.tx.bookSearchSuggestion.deleteMany({
			where: {
				bookId: input.bookId,
				kind: {
					in: [SearchSuggestionKind.BOOK_TITLE, SearchSuggestionKind.AUTHOR],
				},
			},
		});

		if (rows.length === 0) {
			return;
		}

		await this.tx.bookSearchSuggestion.createMany({
			data: rows.map((row) => ({
				...row,
			})),
			skipDuplicates: true,
		});
	}

	public async findSuggestions(
		input: FindBookSearchSuggestionsInput,
	): Promise<BookSearchSuggestionItem[]> {
		const normalizedQuery = PrismaBookSearchSuggestionMapper.normalize(input.query);

		if (normalizedQuery.length === 0) {
			return [];
		}

		const candidatesLimit = Math.max(input.limit * 8, 24);
		const candidates = await this.fetchCandidates(normalizedQuery, candidatesLimit);

		return this.rankCandidates(candidates, input.limit).map((candidate) =>
			PrismaBookSearchSuggestionMapper.toDomain(candidate),
		);
	}

	private async fetchCandidates(
		normalizedQuery: string,
		candidatesLimit: number,
	): Promise<SuggestionCandidate[]> {
		const prefixPattern = `${normalizedQuery}%`;
		const wordPrefixPattern = `% ${normalizedQuery}%`;
		const isShortQuery = normalizedQuery.length < 3;

		if (isShortQuery) {
			return this.prisma.$queryRaw<SuggestionCandidate[]>(Prisma.sql`
				WITH ranked AS (
					SELECT
						bss."book_id" AS "bookId",
						bss."kind"::text AS "kind",
						bss."value" AS "value",
						bss."normalized_value" AS "normalizedValue",
						bss."rank" AS "rank",
						(
							CASE WHEN bss."normalized_value" = ${normalizedQuery} THEN 1000 ELSE 0 END +
							CASE WHEN bss."normalized_value" LIKE ${prefixPattern} THEN 700 ELSE 0 END +
							CASE WHEN bss."normalized_value" LIKE ${wordPrefixPattern} THEN 500 ELSE 0 END +
							CASE WHEN strpos(bss."normalized_value", ${normalizedQuery}) > 0 THEN 100 ELSE 0 END
						) AS "score"
					FROM "book_search_suggestions" AS bss
					INNER JOIN "books" AS b ON b."id" = bss."book_id"
					WHERE b."status" <> ${BookStatus.DELETED}::"BookStatus"
						AND (
							bss."normalized_value" LIKE ${prefixPattern}
							OR bss."normalized_value" LIKE ${wordPrefixPattern}
						)
				)
				SELECT
					"bookId",
					"kind",
					"value",
					"normalizedValue",
					"rank",
					"score"
				FROM ranked
				ORDER BY "score" DESC, "rank" DESC, char_length("value") ASC
				LIMIT ${candidatesLimit}
			`);
		}

		return this.prisma.$queryRaw<SuggestionCandidate[]>(Prisma.sql`
			WITH ranked AS (
				SELECT
					bss."book_id" AS "bookId",
					bss."kind"::text AS "kind",
					bss."value" AS "value",
					bss."normalized_value" AS "normalizedValue",
					bss."rank" AS "rank",
					(
						CASE WHEN bss."normalized_value" = ${normalizedQuery} THEN 1000 ELSE 0 END +
						CASE WHEN bss."normalized_value" LIKE ${prefixPattern} THEN 700 ELSE 0 END +
						CASE WHEN bss."normalized_value" LIKE ${wordPrefixPattern} THEN 500 ELSE 0 END +
						CASE WHEN strpos(bss."normalized_value", ${normalizedQuery}) > 0 THEN 100 ELSE 0 END +
						CAST(
							GREATEST(
								similarity(bss."normalized_value", ${normalizedQuery}),
								word_similarity(${normalizedQuery}, bss."normalized_value")
							) * 100 AS INTEGER
						)
					) AS "score"
				FROM "book_search_suggestions" AS bss
				INNER JOIN "books" AS b ON b."id" = bss."book_id"
				WHERE b."status" <> ${BookStatus.DELETED}::"BookStatus"
					AND (
						bss."normalized_value" LIKE ${prefixPattern}
						OR bss."normalized_value" LIKE ${wordPrefixPattern}
						OR similarity(bss."normalized_value", ${normalizedQuery}) >= ${SIMILARITY_THRESHOLD}
						OR word_similarity(${normalizedQuery}, bss."normalized_value") >= ${WORD_SIMILARITY_THRESHOLD}
					)
			)
			SELECT
				"bookId",
				"kind",
				"value",
				"normalizedValue",
				"rank",
				"score"
			FROM ranked
			ORDER BY "score" DESC, "rank" DESC, char_length("value") ASC
			LIMIT ${candidatesLimit}
		`);
	}

	private rankCandidates(
		candidates: SuggestionCandidate[],
		limit: number,
	): SuggestionCandidate[] {
		const deduped = new Map<string, SuggestionCandidate>();

		for (const candidate of candidates) {
			const key = candidate.normalizedValue;
			const existing = deduped.get(key);

			if (!existing || candidate.score > existing.score) {
				deduped.set(key, candidate);
			}
		}

		return [...deduped.values()]
			.sort((left, right) => right.score - left.score)
			.slice(0, limit);
	}
}
