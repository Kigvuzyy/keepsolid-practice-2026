import type { Prisma } from "database/client";
import type { UpsertBookVectorizedChapterInput } from "@/modules/books/domain/ports/book-vectorization-projection.repository.port";

export class PrismaBookVectorizedChapterMapper {
	public static toCreatePersistence(
		input: UpsertBookVectorizedChapterInput,
	): Prisma.BookVectorizedChapterUncheckedCreateInput {
		return {
			id: input.id,
			bookId: input.bookId,
			externalChapterId: input.externalChapterId,
			chunksCount: input.chunksCount,
		};
	}

	public static toUpdatePersistence(
		input: UpsertBookVectorizedChapterInput,
	): Prisma.BookVectorizedChapterUncheckedUpdateInput {
		return {
			chunksCount: input.chunksCount,
			vectorizedAt: new Date(),
		};
	}
}
