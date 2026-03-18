import type { BookReadModel } from "database/client";
import type { BookSearchReadModel } from "@/modules/search/domain/ports/book-read-model.repository.port";

export class PrismaBookReadModelMapper {
	public static toSearchDto(rows: BookReadModel[]): BookSearchReadModel[] {
		return rows.map<BookSearchReadModel>((row) => ({
			bookId: row.bookId,
			title: row.title,
			description: row.description,
			authors: row.authors,
			coverObjectKey: row.coverObjectKey,
		}));
	}
}
