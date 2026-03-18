import path from "node:path";

import { Injectable } from "@nestjs/common";

import type { ParsedArchive } from "@/modules/worker/infrastructure/epub/types";

@Injectable()
export class EpubBookMetadataResolver {
	public resolveBookTitle(parsedArchive: ParsedArchive, sourceEpub: string): string {
		if (
			typeof parsedArchive.metadata.title === "string" &&
			parsedArchive.metadata.title.trim().length > 0
		) {
			return parsedArchive.metadata.title.trim();
		}

		return path.basename(sourceEpub, path.extname(sourceEpub));
	}

	public resolveBookAuthor(parsedArchive: ParsedArchive): string | null {
		if (
			typeof parsedArchive.metadata.creator === "string" &&
			parsedArchive.metadata.creator.trim().length > 0
		) {
			return parsedArchive.metadata.creator.trim();
		}

		return null;
	}

	public resolveCoverId(parsedArchive: ParsedArchive): string | null {
		if (
			typeof parsedArchive.metadata.cover === "string" &&
			parsedArchive.metadata.cover.trim().length > 0
		) {
			return parsedArchive.metadata.cover.trim();
		}

		return null;
	}
}
