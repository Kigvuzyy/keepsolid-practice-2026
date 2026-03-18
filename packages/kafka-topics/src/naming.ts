import type { RawTopic, TopicName, TopicVersion } from "@/types";

export class TopicNameBuilder<V extends TopicVersion = TopicVersion> {
	public constructor(private readonly version: V) {}

	public join<T extends RawTopic>(raw: T): TopicName<V, T> {
		return `${this.version}.${raw}`;
	}
}
