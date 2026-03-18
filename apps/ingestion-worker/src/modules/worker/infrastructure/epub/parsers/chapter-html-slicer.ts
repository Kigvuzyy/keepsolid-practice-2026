import { Inject, Injectable } from "@nestjs/common";

import { EpubPathUtils } from "@/modules/worker/infrastructure/epub/utils/epub-path-utils";

@Injectable()
export class ChapterHtmlSlicer {
	public constructor(
		@Inject(EpubPathUtils)
		private readonly pathUtils: EpubPathUtils,
	) {}

	public sliceByAnchors(
		chapterHtml: string,
		startAnchor: string | null,
		endAnchor: string | null,
	): string {
		if (!startAnchor && !endAnchor) {
			return chapterHtml;
		}

		const startIndex = startAnchor ? this.findAnchorStartIndex(chapterHtml, startAnchor) : 0;
		const endIndex = endAnchor
			? this.findAnchorStartIndex(chapterHtml, endAnchor)
			: chapterHtml.length;

		const safeStart = startIndex >= 0 ? startIndex : 0;
		const safeEnd = endIndex >= 0 && endIndex > safeStart ? endIndex : chapterHtml.length;

		const fragment = chapterHtml.slice(safeStart, safeEnd).trim();

		if (fragment.length === 0) {
			return chapterHtml;
		}

		if (fragment.includes("<html")) {
			return fragment;
		}

		return `<!doctype html><html><body>${fragment}</body></html>`;
	}

	private findAnchorStartIndex(chapterHtml: string, anchor: string): number {
		const escapedAnchor = this.pathUtils.escapeRegExp(anchor);

		const idPattern = new RegExp(`<[^>]+\\bid\\s*=\\s*["']${escapedAnchor}["'][^>]*>`, "i");
		const idMatch = idPattern.exec(chapterHtml);

		if (idMatch && typeof idMatch.index === "number") {
			return idMatch.index;
		}

		const namePattern = new RegExp(
			`<a[^>]+\\bname\\s*=\\s*["']${escapedAnchor}["'][^>]*>`,
			"i",
		);

		const nameMatch = namePattern.exec(chapterHtml);

		if (nameMatch && typeof nameMatch.index === "number") {
			return nameMatch.index;
		}

		return -1;
	}
}
