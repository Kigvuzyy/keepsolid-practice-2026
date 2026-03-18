import { Inject, Injectable } from "@nestjs/common";

import type { QdrantBookChunkPayload } from "@/modules/search/infrastructure/schemas/qdrant-book-chunk-payload.schema";
import type {
	SearchBookItem,
	SearchBookMatch,
} from "@/modules/search/domain/ports/book-search.port";
import type { SearchQueryFeatures } from "@/modules/search/domain/services/search-ranking-policy";

import { SearchRankingPolicy } from "@/modules/search/domain/services/search-ranking-policy";
import { qdrantBookChunkPayloadSchema } from "@/modules/search/infrastructure/schemas/qdrant-book-chunk-payload.schema";

export interface QdrantGroupedBookResult {
	id?: unknown;
	hits?: QdrantGroupedBookHit[];
}

interface QdrantGroupedBookHit {
	id?: unknown;
	score?: unknown;
	payload?: unknown;
}

@Injectable()
export class QdrantBookSearchMapper {
	public constructor(
		@Inject(SearchRankingPolicy)
		private readonly rankingPolicy: SearchRankingPolicy,
	) {}

	public mapGroupedBooksToItems(
		groups: QdrantGroupedBookResult[],
		queryFeatures: SearchQueryFeatures,
	): SearchBookItem[] {
		return groups
			.map((group) => this.selectRepresentativeBookItem(group, queryFeatures))
			.filter((item): item is SearchBookItem => item !== null);
	}

	private selectRepresentativeBookItem(
		group: QdrantGroupedBookResult,
		queryFeatures: SearchQueryFeatures,
	): SearchBookItem | null {
		const candidates = (group.hits ?? [])
			.map((point) => this.mapQdrantHitToBookItem(group.id, point))
			.filter((item): item is SearchBookItem => item !== null)
			.sort(
				(left, right) =>
					this.rankingPolicy.scoreRepresentativeMatch(
						queryFeatures,
						right.score,
						right.match,
					) -
					this.rankingPolicy.scoreRepresentativeMatch(
						queryFeatures,
						left.score,
						left.match,
					),
			);

		return candidates[0] ?? null;
	}

	private mapQdrantHitToBookItem(
		groupId: unknown,
		point: QdrantGroupedBookHit,
	): SearchBookItem | null {
		const payload = this.parseQdrantBookChunkPayload(point.payload);
		const pointId = this.readPointId(point.id);
		const bookId = this.readBookId(groupId, payload);

		if (!payload || !pointId || !bookId) {
			return null;
		}

		return {
			bookId,
			score: this.readPointScore(point.score),
			coverS3FilePath: payload.coverS3FilePath,
			match: this.mapPayloadToMatch(pointId, payload),
		};
	}

	private mapPayloadToMatch(pointId: string, payload: QdrantBookChunkPayload): SearchBookMatch {
		return {
			id: pointId,
			chapterId: payload.chapterId,
			chapterIndex: payload.chapterIndex,
			chapterTitle: payload.chapterTitle,
			chunkIndex: payload.chunkIndex,
			text: payload.text,
			sourceStartChar: payload.sourceStartChar ?? null,
			sourceEndChar: payload.sourceEndChar ?? null,
		};
	}

	private parseQdrantBookChunkPayload(payload: unknown): QdrantBookChunkPayload | null {
		const parsedPayload = qdrantBookChunkPayloadSchema.safeParse(payload);

		return parsedPayload.success ? parsedPayload.data : null;
	}

	private readBookId(groupId: unknown, payload: QdrantBookChunkPayload | null): string | null {
		return typeof groupId === "string" ? groupId : (payload?.bookId ?? null);
	}

	private readPointScore(value: unknown): number {
		return typeof value === "number" ? value : 0;
	}

	private readPointId(value: unknown): string | null {
		if (typeof value === "string") {
			return value;
		}

		if (typeof value === "number" || typeof value === "bigint") {
			return String(value);
		}

		return null;
	}
}
