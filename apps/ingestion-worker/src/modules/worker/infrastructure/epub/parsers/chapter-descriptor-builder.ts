import { Injectable, Inject } from "@nestjs/common";

import type {
	ChapterDescriptor,
	EpubFlowItem,
	EpubTocItem,
	ParsedArchive,
} from "@/modules/worker/infrastructure/epub/types";

import { EpubPathUtils } from "@/modules/worker/infrastructure/epub/utils/epub-path-utils";
import { TocTitleScorer } from "@/modules/worker/infrastructure/epub/utils/toc-title-scorer";

interface TocChapterEntry {
	title: string;
	anchor: string | null;
	order: number;
}

@Injectable()
export class ChapterDescriptorBuilder {
	public constructor(
		@Inject(EpubPathUtils)
		private readonly pathUtils: EpubPathUtils,

		@Inject(TocTitleScorer)
		private readonly tocTitleScorer: TocTitleScorer,
	) {}

	public build(parsedArchive: ParsedArchive): ChapterDescriptor[] {
		const tocEntriesByHref = new Map<string, TocChapterEntry[]>();
		let tocOrder = 0;

		for (const tocItem of parsedArchive.toc) {
			if (!this.isTocItemWithTitle(tocItem) || typeof tocItem.href !== "string") {
				continue;
			}

			if (this.tocTitleScorer.scoreTocTitle(tocItem.title) < 0) {
				continue;
			}

			const href = this.pathUtils.normalizeHref(tocItem.href);

			if (!href) {
				continue;
			}

			const anchor = this.pathUtils.extractHrefFragment(tocItem.href);
			const entries = tocEntriesByHref.get(href) ?? [];

			if (entries.some((entry) => entry.anchor === anchor)) {
				continue;
			}

			entries.push({
				title: tocItem.title.trim(),
				anchor,
				order: tocOrder,
			});

			tocOrder += 1;
			tocEntriesByHref.set(href, entries);
		}

		const chapters: ChapterDescriptor[] = [];

		for (const [index, flowItem] of parsedArchive.flow.entries()) {
			if (!this.isFlowChapter(flowItem)) {
				continue;
			}

			const href = this.pathUtils.normalizeHref(flowItem.href);

			const tocEntries = (tocEntriesByHref.get(href) ?? []).sort(
				(left, right) => left.order - right.order,
			);

			if (tocEntries.length === 0) {
				chapters.push({
					id: flowItem.id,
					sourceId: flowItem.id,
					sourceHref: href,
					startAnchor: null,
					endAnchor: null,
					title: `Chapter ${index + 1}`,
				});

				continue;
			}

			for (const [tocIndex, tocEntry] of tocEntries.entries()) {
				const nextEntry = tocEntries[tocIndex + 1];

				chapters.push({
					id: this.buildSegmentChapterId(flowItem.id, tocEntry.anchor, tocIndex),
					sourceId: flowItem.id,
					sourceHref: href,
					startAnchor: tocEntry.anchor,
					endAnchor: nextEntry?.anchor ?? null,
					title: tocEntry.title,
				});
			}
		}

		return chapters;
	}

	private buildSegmentChapterId(
		baseId: string,
		anchor: string | null,
		segmentIndex: number,
	): string {
		if (!anchor) {
			return segmentIndex === 0 ? baseId : `${baseId}:s${segmentIndex + 1}`;
		}

		const normalizedAnchor = anchor
			.toLowerCase()
			.replace(/[^a-z0-9_-]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 48);

		if (!normalizedAnchor) {
			return `${baseId}:s${segmentIndex + 1}`;
		}

		return `${baseId}:a:${normalizedAnchor}:${segmentIndex + 1}`;
	}

	private isFlowChapter(item: EpubFlowItem): item is EpubFlowItem & { id: string } {
		if (typeof item.id !== "string" || item.id.length === 0) {
			return false;
		}

		const mediaType = this.resolveFlowMediaType(item);

		return typeof mediaType !== "string" || mediaType.includes("xhtml");
	}

	private resolveFlowMediaType(item: EpubFlowItem): string | undefined {
		if (typeof item["media-type"] === "string") {
			return item["media-type"];
		}

		if (typeof item.mediaType === "string") {
			return item.mediaType;
		}

		return undefined;
	}

	private isTocItemWithTitle(item: EpubTocItem): item is EpubTocItem & { title: string } {
		return typeof item.title === "string" && item.title.trim().length > 0;
	}
}
