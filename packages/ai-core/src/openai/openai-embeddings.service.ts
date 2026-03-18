import { Inject, Injectable } from "@nestjs/common";
import { runInSpan } from "@kigvuzyy/observability/span";

import type OpenAI from "openai";

import { OPENAI_CLIENT, OPENAI_EMBEDDING_MODEL } from "@/openai/openai.constants";

@Injectable()
export class OpenAIEmbeddingsService {
	public constructor(
		@Inject(OPENAI_CLIENT)
		private readonly openai: OpenAI,
	) {}

	public async createEmbedding(text: string): Promise<number[]> {
		return runInSpan(
			"openai.embeddings.create",
			{
				"gen_ai.system": "openai",
				"gen_ai.operation.name": "embeddings",
				"gen_ai.request.model": OPENAI_EMBEDDING_MODEL,
				"openai.input_count": 1,
				"openai.input_chars": text.length,
			},
			async () => {
				const response = await this.openai.embeddings.create({
					model: OPENAI_EMBEDDING_MODEL,
					input: text,
				});

				const embedding = response.data.at(0)?.embedding;

				if (!embedding) {
					throw new Error("OpenAI embedding response does not contain a vector.");
				}

				return embedding;
			},
		);
	}

	public async createEmbeddings(texts: string[]): Promise<number[][]> {
		if (texts.length === 0) {
			return Promise.resolve([]);
		}

		const totalChars = texts.reduce((sum, text) => sum + text.length, 0);

		return runInSpan(
			"openai.embeddings.create",
			{
				"gen_ai.system": "openai",
				"gen_ai.operation.name": "embeddings",
				"gen_ai.request.model": OPENAI_EMBEDDING_MODEL,
				"openai.input_count": texts.length,
				"openai.input_chars_total": totalChars,
			},
			async () => {
				const response = await this.openai.embeddings.create({
					model: OPENAI_EMBEDDING_MODEL,
					input: texts,
				});

				return response.data.map((item) => item.embedding);
			},
		);
	}
}
