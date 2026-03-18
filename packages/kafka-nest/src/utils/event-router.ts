import type { AnySpec, SpecEnvelope, InferEventName } from "@kigvuzyy/kafka-contracts";

type Names<S extends readonly AnySpec[]> = InferEventName<S[number]>;
type EnvOf<S extends readonly AnySpec[], K extends Names<S>> = SpecEnvelope<
	Extract<S[number], { name: K }>
>;

type HandlerMap<S extends readonly AnySpec[]> = {
	[K in Names<S>]?: (env: EnvOf<S, K>) => Promise<unknown> | unknown;
} & {
	default?(env: SpecEnvelope<S[number]>): Promise<unknown> | unknown;
};

export function createEventRouter<const S extends readonly AnySpec[]>(...specs: S) {
	const supported = new Set<string>(specs.map((s) => String(s.name)));

	return async function route(
		env: SpecEnvelope<S[number]>,
		handlers: HandlerMap<S>,
	): Promise<boolean> {
		const type = String(env.type);

		if (!supported.has(type)) {
			return false;
		}

		const key = env.type as Names<S>;
		const h = handlers[key] as
			| ((e: EnvOf<S, typeof key>) => Promise<unknown> | unknown)
			| undefined;

		if (h) {
			await h(env as EnvOf<S, typeof key>);
			return true;
		}

		if (handlers.default) {
			await handlers.default(env);
			return true;
		}

		return false;
	};
}
