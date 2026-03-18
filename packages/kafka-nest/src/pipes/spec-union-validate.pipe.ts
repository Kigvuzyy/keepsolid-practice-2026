import { BadRequestException, Injectable } from "@nestjs/common";

import type { PipeTransform } from "@nestjs/common";
import type { Envelope } from "@kigvuzyy/kafka-envelope";
import type { SpecEnvelope, AnySpec } from "@kigvuzyy/kafka-contracts";

type SpecTuple = readonly AnySpec[];
type SpecUnion<S extends SpecTuple> = S[number];
type EnvUnion<S extends SpecTuple> = SpecEnvelope<SpecUnion<S>>;

@Injectable()
export class SpecUnionValidatePipe<S extends SpecTuple>
	implements PipeTransform<Envelope<string, unknown>, Promise<EnvUnion<S>>>
{
	public constructor(private readonly specs: S) {}

	public async transform(env: Envelope<string, unknown>): Promise<EnvUnion<S>> {
		const spec = this.specs.find((s) => s.name === env.type && s.version === env.version);

		if (!spec) {
			throw new BadRequestException(`Unexpected event: ${env.type} v${env.version}`);
		}

		const parsed = await spec.schema.safeParseAsync(env.payload);

		if (!parsed.success) {
			throw new BadRequestException(parsed.error.message);
		}

		const { payload, ...rest } = env;

		return {
			...rest,
			type: spec.name,
			version: spec.version,
			payload: parsed.data,
		} as EnvUnion<S>;
	}
}

export const specUnionValidatePipe = <const S extends SpecTuple>(...specs: S) =>
	new SpecUnionValidatePipe(specs);
