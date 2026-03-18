export class PoisonMessageError extends Error {
	public constructor(public readonly reason: string) {
		super(reason);
		this.name = "PoisonMessageError";
	}
}
