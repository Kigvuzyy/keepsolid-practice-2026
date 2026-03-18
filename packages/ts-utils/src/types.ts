export type JsonPrimitive = boolean | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type BivariantMethod<TArgs> = {
	bivarianceHack(args: TArgs): PromiseLike<unknown>;
}["bivarianceHack"];
