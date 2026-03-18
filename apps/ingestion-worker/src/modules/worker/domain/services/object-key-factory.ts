import path from "node:path";

import { Injectable } from "@nestjs/common";

@Injectable()
export class ObjectKeyFactory {
	public resolveTargetPrefix(sourceEpub: string, targetPrefix?: string): string {
		if (targetPrefix && targetPrefix.trim().length > 0) {
			return this.normalizePrefix(targetPrefix);
		}

		const baseName = path.basename(sourceEpub, path.extname(sourceEpub));

		return this.normalizePrefix(`books/${this.sanitizePart(baseName)}`);
	}

	public buildChapterObjectName(
		targetPrefix: string,
		chapterIndex: number,
		chapterId: string,
	): string {
		const safeId = this.sanitizePart(chapterId);
		const indexPart = String(chapterIndex).padStart(6, "0");

		return `${targetPrefix}/chapters/${indexPart}-${safeId}.json`;
	}

	public buildBatchObjectName(targetPrefix: string, batchIndex: number): string {
		const indexPart = String(batchIndex).padStart(6, "0");
		return `${targetPrefix}/chapter-batches/batch-${indexPart}.json`;
	}

	public buildCoverObjectName(targetPrefix: string, extension: string): string {
		return `${targetPrefix}/cover/original.${this.sanitizeExtension(extension)}`;
	}

	private normalizePrefix(prefix: string): string {
		return this.normalizeArchivePath(prefix).replace(/\/+$/, "");
	}

	private normalizeArchivePath(value: string): string {
		return path.posix.normalize(value.replaceAll("\\", "/").trim()).replace(/^\/+/, "");
	}

	private sanitizePart(value: string): string {
		const normalized = value
			.toLowerCase()
			.replace(/[^a-z0-9._-]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 96);

		return normalized.length > 0 ? normalized : "chapter";
	}

	private sanitizeExtension(extension: string): string {
		const normalized = extension.replace(/^\.+/, "").toLowerCase();

		if (/^[a-z0-9]+$/.test(normalized)) {
			return normalized;
		}

		return "bin";
	}
}
