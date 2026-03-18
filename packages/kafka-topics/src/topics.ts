import process from "node:process";

import type { RawTopic, TopicVersion, TopicConfig } from "@/types";

import { TopicNameBuilder } from "@/naming";
import { TopicVersionSchema } from "@/types";

export const TOPIC_VERSION: TopicVersion = TopicVersionSchema.parse(
	process.env.KAFKA_TOPIC_VERSION ?? "v1",
);

export class KafkaTopicsRegistry<V extends TopicVersion = TopicVersion> {
	public readonly bookCatalog: TopicConfig<V, "book.catalog">;

	public readonly bookUploads: TopicConfig<V, "book.uploads">;

	public readonly bookChaptersExtracted: TopicConfig<V, "book.chapters.extracted">;

	public readonly bookChaptersVectorized: TopicConfig<V, "book.chapters.vectorized">;

	public readonly bookVectorization: TopicConfig<V, "book.vectorization">;

	public readonly bookAssetsExtracted: TopicConfig<V, "book.assets.extracted">;

	public constructor(version: V) {
		const naming = new TopicNameBuilder(version);

		this.bookCatalog = this.createTopicConfig(naming, "book.catalog");
		this.bookUploads = this.createTopicConfig(naming, "book.uploads");
		this.bookChaptersExtracted = this.createTopicConfig(naming, "book.chapters.extracted");
		this.bookChaptersVectorized = this.createTopicConfig(naming, "book.chapters.vectorized");
		this.bookVectorization = this.createTopicConfig(naming, "book.vectorization");
		this.bookAssetsExtracted = this.createTopicConfig(naming, "book.assets.extracted");
	}

	private createTopicConfig<T extends RawTopic>(
		naming: TopicNameBuilder<V>,
		raw: T,
	): TopicConfig<V, T> {
		return {
			raw,
			name: naming.join(raw),
		};
	}
}

export const Topics = new KafkaTopicsRegistry(TOPIC_VERSION);

export type AnyTopic = (typeof Topics)[keyof typeof Topics];
export type AnyTopicName = AnyTopic["name"];
