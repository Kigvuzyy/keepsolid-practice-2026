import { z } from "zod";

export const RawTopics = [
	"book.catalog",
	"book.uploads",
	"book.chapters.extracted",
	"book.chapters.vectorized",
	"book.vectorization",
	"book.assets.extracted",
] as const;
export type RawTopic = (typeof RawTopics)[number];

export const TopicVersionSchema = z
	.string()
	.regex(/^v[1-9]\d*$/, "Topic version must have format v1, v2, v3, ...");
export type TopicVersion = z.infer<typeof TopicVersionSchema>;

export type TopicName<V extends string = TopicVersion, T extends string = RawTopic> = `${V}.${T}`;

export interface TopicConfig<V extends TopicVersion = TopicVersion, T extends RawTopic = RawTopic> {
	readonly raw: T;
	readonly name: TopicName<V, T>;
}
