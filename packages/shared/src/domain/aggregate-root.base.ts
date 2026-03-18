type DefaultId = number | null;

export interface BaseEntityProps<TId = DefaultId> {
	id: TId;
	createdAt?: Date;
	updatedAt?: Date;
	version?: number;
}

export abstract class AggregateRoot<T extends BaseEntityProps<TId>, TId = DefaultId> {
	protected readonly _id: TId;

	protected readonly _createdAt: Date;

	protected _updatedAt: Date;

	protected readonly _version: number;

	private readonly _domainEvents: unknown[] = [];

	protected constructor(props: T) {
		this._id = props.id;
		this._createdAt = props.createdAt ?? new Date();
		this._updatedAt = props.updatedAt ?? new Date();
		this._version = props.version ?? 1;
	}

	public get id(): TId {
		return this._id;
	}

	public get createdAt(): Date {
		return this._createdAt;
	}

	public get updatedAt(): Date {
		return this._updatedAt;
	}

	public get version(): number {
		return this._version;
	}

	public get domainEvents(): unknown[] {
		return this._domainEvents;
	}

	protected addEvent(domainEvent: unknown): void {
		this._domainEvents.push(domainEvent);
	}

	public clearEvents(): void {
		this._domainEvents.length = 0;
	}

	protected touch(): void {
		this._updatedAt = new Date();
	}
}
