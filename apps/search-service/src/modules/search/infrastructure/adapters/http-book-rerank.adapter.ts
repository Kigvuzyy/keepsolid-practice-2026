import { URL } from "node:url";
import { performance } from "node:perf_hooks";

import { Inject, Injectable } from "@nestjs/common";
import { runInSpan } from "@kigvuzyy/observability/span";
import { getMeter } from "@kigvuzyy/observability/metrics";

import type { SearchBookItem } from "@/modules/search/domain/ports/book-search.port";
import type {
	BookRerankPort,
	RerankBooksInput,
} from "@/modules/search/domain/ports/book-rerank.port";

import { ConfigService } from "@/infrastructure/config/config.service";
import { rerankResponseSchema } from "@/modules/search/infrastructure/schemas/book-rerank-response.schema";

const meter = getMeter("search-service");

const rerankRequestCounter = meter.createCounter("search.rerank.requests", {
	description: "Total rerank requests issued by search-service.",
});

const rerankFailureCounter = meter.createCounter("search.rerank.failures", {
	description: "Total rerank request failures in search-service.",
});

const rerankDurationHistogram = meter.createHistogram("search.rerank.duration", {
	description: "Duration of rerank requests from search-service.",
	unit: "ms",
});

const rerankCandidateHistogram = meter.createHistogram("search.rerank.candidates", {
	description: "Number of candidates sent to rerank-service.",
	unit: "{candidate}",
});

const rerankReturnedHistogram = meter.createHistogram("search.rerank.returned", {
	description: "Number of candidates returned by rerank-service.",
	unit: "{candidate}",
});

@Injectable()
export class HttpBookRerankAdapter implements BookRerankPort {
	public constructor(
		@Inject(ConfigService)
		private readonly config: ConfigService,
	) {}

	public async rerank(input: RerankBooksInput): Promise<SearchBookItem[]> {
		if (input.items.length === 0) {
			return input.items;
		}

		const rerankUrl = this.getRerankUrl();
		const metricAttrs = this.buildMetricAttrs(rerankUrl);
		const startedAt = performance.now();

		rerankRequestCounter.add(1, metricAttrs);
		rerankCandidateHistogram.record(input.items.length, metricAttrs);

		return runInSpan(
			"search.rerank.request",
			this.buildSpanAttrs(input, rerankUrl),
			async () => {
				try {
					const response = await fetch(rerankUrl.href, {
						method: "POST",
						headers: {
							accept: "application/json",
							"content-type": "application/json",
						},
						body: JSON.stringify({
							query: input.query,
							top_k: input.limit,
							candidates: input.items.map((item) => ({
								id: item.bookId,
								text: this.toCandidateText(item),
								metadata: {
									bookId: item.bookId,
									chapterId: item.match.chapterId,
									chapterTitle: item.match.chapterTitle,
								},
								retrieval_score: item.score,
							})),
						}),
						signal: AbortSignal.timeout(this.config.get("RERANK_TIMEOUT_MS")),
					});

					if (!response.ok) {
						throw new Error(await this.readErrorMessage(response));
					}

					const payload = rerankResponseSchema.parse(await response.json());
					const itemsById = new Map(input.items.map((item) => [item.bookId, item]));
					const result = payload.items.map((rankedItem) => {
						const item = itemsById.get(rankedItem.id);

						if (!item) {
							throw new Error(
								`Rerank service returned unknown item id "${rankedItem.id}"`,
							);
						}

						return {
							...item,
							rerankScore: rankedItem.rerank_score,
						};
					});

					const successAttrs = {
						...metricAttrs,
						"http.response.status_code": response.status,
						"search.rerank.model": payload.model_name,
						"search.rerank.outcome": "success",
					};

					rerankReturnedHistogram.record(result.length, successAttrs);
					rerankDurationHistogram.record(performance.now() - startedAt, successAttrs);

					return result;
				} catch (error: unknown) {
					const failureAttrs = {
						...metricAttrs,
						"error.type": this.getErrorType(error),
						"search.rerank.outcome": "failure",
					};

					rerankFailureCounter.add(1, failureAttrs);
					rerankDurationHistogram.record(performance.now() - startedAt, failureAttrs);

					throw error;
				}
			},
		);
	}

	private getRerankUrl(): URL {
		const baseUrl = this.config.get("RERANK_SERVICE_URL");
		return new URL("/rerank", baseUrl);
	}

	private toCandidateText(item: SearchBookItem): string {
		return [item.match.chapterTitle.trim(), item.match.text.trim()]
			.filter((part) => part.length > 0)
			.join("\n\n");
	}

	private buildMetricAttrs(rerankUrl: URL): Record<string, string> {
		return {
			"search.rerank.endpoint": rerankUrl.pathname,
			"search.rerank.provider": "rerank-service-py",
		};
	}

	private buildSpanAttrs(
		input: RerankBooksInput,
		rerankUrl: URL,
	): Record<string, boolean | number | string> {
		return {
			"http.request.method": "POST",
			"search.rerank.candidates_count": input.items.length,
			"search.rerank.provider": "rerank-service-py",
			"search.rerank.top_k": input.limit,
			"server.address": rerankUrl.hostname,
			"server.port": this.getServerPort(rerankUrl),
			"url.path": rerankUrl.pathname,
			"url.scheme": rerankUrl.protocol.replace(":", ""),
		};
	}

	private async readErrorMessage(response: Response): Promise<string> {
		const body = (await response.text()).trim();
		const statusLine = `Rerank service responded with ${response.status} ${response.statusText}`;

		return body.length > 0 ? `${statusLine}: ${body}` : statusLine;
	}

	private getErrorType(error: unknown): string {
		if (error instanceof Error && error.name.length > 0) {
			return error.name;
		}

		return "UnknownError";
	}

	private getServerPort(rerankUrl: URL): number {
		if (rerankUrl.port.length > 0) {
			return Number(rerankUrl.port);
		}

		return rerankUrl.protocol === "https:" ? 443 : 80;
	}
}
