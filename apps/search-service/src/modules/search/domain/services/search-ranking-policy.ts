import { Injectable } from "@nestjs/common";

import type {
	SearchBookItem,
	SearchBookMatch,
} from "@/modules/search/domain/ports/book-search.port";

const WORD_PATTERN = /[\p{L}\p{N}]+/gu;

const QUERY_STOP_WORDS = new Set([
	"a",
	"about",
	"an",
	"and",
	"book",
	"books",
	"for",
	"in",
	"of",
	"on",
	"the",
	"with",
	"без",
	"в",
	"для",
	"и",
	"книга",
	"книге",
	"книги",
	"книгу",
	"о",
	"об",
	"про",
	"с",
]);

const FRONTMATTER_PREFIXES = [
	"annotation",
	"foreword",
	"introduction",
	"preface",
	"аннотация",
	"благодарности",
	"введение",
	"вступление",
	"предисловие",
];

const STRUCTURAL_QUERY_TERMS = new Set(FRONTMATTER_PREFIXES);

const GENERIC_CHAPTER_TITLES = [/^chapter \d+$/i, /^глава \d+$/i, /^part \d+$/i, /^часть \d+$/i];

export interface SearchQueryFeatures {
	terms: string[];
	demoteFrontmatter: boolean;
}

@Injectable()
export class SearchRankingPolicy {
	public normalizeQuery(query: string): string {
		return this.normalizeSearchText(query).replaceAll(/\s+/g, " ").trim();
	}

	public buildQueryFeatures(query: string): SearchQueryFeatures {
		const tokens = this.tokenize(query);
		const terms = [...new Set(tokens.filter((token) => this.shouldKeepQueryToken(token)))];
		const hasStructuralIntent = tokens.some((token) => STRUCTURAL_QUERY_TERMS.has(token));

		return {
			terms,
			demoteFrontmatter: !hasStructuralIntent && terms.length > 0,
		};
	}

	public scoreRepresentativeMatch(
		query: SearchQueryFeatures,
		pointScore: number,
		match: SearchBookMatch,
	): number {
		const overlap = this.countMeaningfulTermMatches(query, match);
		const frontmatterPenalty =
			query.demoteFrontmatter && overlap === 0 && this.isLikelyFrontmatter(match) ? 1.5 : 0;

		return pointScore + overlap * 2 + (overlap > 0 ? 1 : 0) - frontmatterPenalty;
	}

	public compareRankedBooks(
		query: SearchQueryFeatures,
		left: SearchBookItem,
		right: SearchBookItem,
	): number {
		const scoreDifference =
			this.scoreRankedBook(query, right) - this.scoreRankedBook(query, left);

		if (scoreDifference !== 0) {
			return scoreDifference;
		}

		return right.score - left.score;
	}

	private scoreRankedBook(query: SearchQueryFeatures, item: SearchBookItem): number {
		const overlap = this.countMeaningfulTermMatches(query, item.match);
		const rerankScore = item.rerankScore ?? item.score;
		const overlapBoost = overlap > 0 ? 1 + overlap * 0.35 : 0;
		const frontmatterPenalty =
			query.demoteFrontmatter && overlap === 0 && this.isLikelyFrontmatter(item.match)
				? 0.8
				: 0;

		return rerankScore + overlapBoost - frontmatterPenalty + item.score * 0.05;
	}

	private countMeaningfulTermMatches(
		query: SearchQueryFeatures,
		match: Pick<SearchBookMatch, "chapterTitle" | "text">,
	): number {
		if (query.terms.length === 0) {
			return 0;
		}

		const haystack = this.normalizeSearchText(`${match.chapterTitle}\n${match.text}`);

		return query.terms.reduce((count, token) => count + (haystack.includes(token) ? 1 : 0), 0);
	}

	private isLikelyFrontmatter(
		match: Pick<SearchBookMatch, "chapterTitle" | "sourceStartChar" | "text">,
	): boolean {
		const normalizedTitle = this.normalizeSearchText(match.chapterTitle);
		const normalizedText = this.normalizeSearchText(match.text).trimStart();
		const hasFrontmatterPrefix = FRONTMATTER_PREFIXES.some((prefix) =>
			normalizedText.startsWith(prefix),
		);

		if (hasFrontmatterPrefix) {
			return true;
		}

		return (
			match.sourceStartChar === 0 &&
			GENERIC_CHAPTER_TITLES.some((pattern) => pattern.test(normalizedTitle))
		);
	}

	private shouldKeepQueryToken(token: string): boolean {
		return token.length >= 3 && !QUERY_STOP_WORDS.has(token);
	}

	private tokenize(value: string): string[] {
		return this.normalizeSearchText(value).match(WORD_PATTERN) ?? [];
	}

	private normalizeSearchText(value: string): string {
		return value.toLowerCase().normalize("NFKC").replaceAll("ё", "е");
	}
}
