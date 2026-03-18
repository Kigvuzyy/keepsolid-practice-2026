import { Inject, Injectable } from "@nestjs/common";

import { EpubTextUtils } from "@/modules/worker/infrastructure/epub/utils/epub-text-utils";

@Injectable()
export class LeanChapterTitleResolver {
	public constructor(
		@Inject(EpubTextUtils)
		private readonly textUtils: EpubTextUtils,
	) {}

	public resolve(baseTitle: string, chapterIndex: number, titleHint: string | null): string {
		const normalizedBase = baseTitle.trim();

		if (!this.isGenericChapterTitle(normalizedBase)) {
			return normalizedBase;
		}

		if (titleHint) {
			return this.textUtils.normalizeFlatText(titleHint).slice(0, 120);
		}

		return `Chapter ${chapterIndex}`;
	}

	private isGenericChapterTitle(title: string): boolean {
		return /^chapter\s+\d+$/i.test(title);
	}
}
