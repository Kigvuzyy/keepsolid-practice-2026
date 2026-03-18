import type { UploadIntent } from "@/modules/books/domain/entities";

export abstract class UploadIntentRepositoryPort {
	public abstract findByIdAndUserId(params: {
		id: bigint;
		userId: bigint;
	}): Promise<UploadIntent | null>;

	public abstract create(intent: UploadIntent): Promise<{ id: bigint }>;

	public abstract save(intent: UploadIntent): Promise<void>;
}
