import type { EventDef, EventSpec } from "@/types";
import type { AnyTopic } from "@kigvuzyy/kafka-topics";

export const defineEvent = <E extends string, P, T extends AnyTopic>(
	name: E,
	init: EventDef<P, T>,
): EventSpec<E, P, T> => {
	return { name, ...init };
};
