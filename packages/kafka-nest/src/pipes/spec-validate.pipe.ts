import { BadRequestException, Injectable } from "@nestjs/common";

import type { PipeTransform } from "@nestjs/common";
import type { AnyTopic } from "@kigvuzyy/kafka-topics";
import type { Envelope } from "@kigvuzyy/kafka-envelope";
import type { EventSpec } from "@kigvuzyy/kafka-contracts";

@Injectable()
export class SpecValidatePipe<E extends string, P, T extends AnyTopic>
	implements PipeTransform<Envelope<string, unknown>, Envelope<E, P>>
{
	public constructor(private readonly spec: EventSpec<E, P, T>) {}

	public transform(env: Envelope<string, unknown>): Envelope<E, P> {
		if (env.type !== this.spec.name) {
			throw new BadRequestException(
				`Unexpected event type: got "${env.type}", expected "${this.spec.name}"`,
			);
		}

		if (env.version !== this.spec.version) {
			throw new BadRequestException(
				`Unexpected version for ${this.spec.name}: got ${env.version}, expected ${this.spec.version}`,
			);
		}

		const parsed = this.spec.schema.safeParse(env.payload);

		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}

		const { payload, type, version, ...rest } = env;

		return {
			type: this.spec.name,
			version: this.spec.version,
			payload: parsed.data,
			...rest,
		};
	}
}

export const specValidatePipe = <E extends string, P, T extends AnyTopic>(
	spec: EventSpec<E, P, T>,
) => new SpecValidatePipe<E, P, T>(spec);
