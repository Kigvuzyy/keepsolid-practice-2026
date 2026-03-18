import { load } from "cheerio";
import { Inject, Injectable } from "@nestjs/common";

import { EpubTextUtils } from "@/modules/worker/infrastructure/epub/utils/epub-text-utils";

const LINE_BREAK_TAG_PATTERN = /<br\s*\/?>/gi;
const STRUCTURAL_TAG_END_PATTERN =
	/<\/(article|aside|blockquote|dd|div|figcaption|figure|h[1-6]|header|li|p|section|table|td|th|tr|ul|ol)>/gi;

export interface LeanChapterContent {
	html: string;
	plainText: string;
	titleHint: string | null;
}

@Injectable()
export class LeanChapterContentExtractor {
	public constructor(
		@Inject(EpubTextUtils)
		private readonly textUtils: EpubTextUtils,
	) {}

	public extract(html: string): LeanChapterContent {
		const withLineBreaks = html
			.replace(LINE_BREAK_TAG_PATTERN, "\n")
			.replace(STRUCTURAL_TAG_END_PATTERN, "$&\n");

		let doc = load(withLineBreaks);
		this.removeNoise(doc);
		let body = doc("body");

		if (body.length === 0 && this.textUtils.isLikelyXhtml(withLineBreaks)) {
			doc = load(withLineBreaks, { xmlMode: true });
			this.removeNoise(doc);
			body = doc("body");
		}

		const chapterHtml =
			body.length > 0 ? (body.html() ?? "").trim() : (doc.root().html() ?? "").trim();
		const plainText =
			body.length > 0
				? this.textUtils.normalizeText(body.text())
				: this.textUtils.normalizeText(doc.root().text());
		const firstHeading =
			body.length > 0
				? body.find("h1,h2,h3,h4,h5,h6").first().text()
				: doc.root().find("h1,h2,h3,h4,h5,h6").first().text();
		const titleHint = this.textUtils.normalizeFlatText(firstHeading) || null;

		return {
			html: chapterHtml,
			plainText,
			titleHint,
		};
	}

	private removeNoise(doc: ReturnType<typeof load>): void {
		doc("script,style,noscript,svg,math,iframe,video,audio,source,track,picture,img").remove();
		doc("a").each((_, element) => {
			const link = doc(element);
			const replacement = link.html() ?? link.text();
			link.replaceWith(replacement);
		});
	}
}
