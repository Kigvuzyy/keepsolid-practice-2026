import { ServerKafka } from "@nestjs/microservices";

import type { KafkaOptions } from "@nestjs/microservices";

export class KafkaCustomTransport extends ServerKafka {
	public constructor(config: Required<KafkaOptions>["options"], trasportId: symbol) {
		super(config);
		this.setTransportId(trasportId);
	}
}
