import { load } from "cheerio";
import { Inject, Injectable } from "@nestjs/common";

import type * as yauzl from "yauzl";
import type {
	EpubFlowItem,
	EpubManifestItem,
	EpubMetadata,
	EpubTocItem,
	IndexedZipEntries,
	ParseMetadataResult,
	ParsedArchive,
} from "@/modules/worker/infrastructure/epub/types";

import { EPUB_CONTAINER_FILE } from "@/modules/worker/infrastructure/epub/constants";
import { EpubPathUtils } from "@/modules/worker/infrastructure/epub/utils/epub-path-utils";
import { EpubTextUtils } from "@/modules/worker/infrastructure/epub/utils/epub-text-utils";
import { ZipEntryReader } from "@/modules/worker/infrastructure/epub/zip/zip-entry-reader";
import { TocTitleScorer } from "@/modules/worker/infrastructure/epub/utils/toc-title-scorer";
import { EpubCoverReferenceResolver } from "@/modules/worker/infrastructure/epub/resolvers/epub-cover-reference.resolver";

@Injectable()
export class EpubArchiveParser {
	public constructor(
		@Inject(EpubPathUtils)
		private readonly pathUtils: EpubPathUtils,

		@Inject(EpubTextUtils)
		private readonly textUtils: EpubTextUtils,

		@Inject(TocTitleScorer)
		private readonly tocTitleScorer: TocTitleScorer,

		@Inject(ZipEntryReader)
		private readonly zipEntryReader: ZipEntryReader,

		@Inject(EpubCoverReferenceResolver)
		private readonly coverReferenceResolver: EpubCoverReferenceResolver,
	) {}

	public async parse(
		zipfile: yauzl.ZipFile,
		indexedEntries: IndexedZipEntries,
	): Promise<ParsedArchive> {
		const containerXml = await this.zipEntryReader.readTextEntry(
			zipfile,
			indexedEntries,
			EPUB_CONTAINER_FILE,
		);

		const rootFilePath = this.parseRootFilePath(containerXml);

		const opfXml = await this.zipEntryReader.readTextEntry(
			zipfile,
			indexedEntries,
			rootFilePath,
		);

		const { metadata, coverByMeta } = this.parseMetadata(opfXml);
		const { manifestById, manifestByHref } = this.parseManifest(opfXml, rootFilePath);
		const { flow, spineTocId } = this.parseFlowAndSpineToc(opfXml, manifestById);

		const parsedArchive: ParsedArchive = {
			zipfile,
			indexedEntries,
			manifestById,
			manifestByHref,
			metadata,
			flow,
			toc: [],
			rootFilePath,
			spineTocId,
		};

		const resolvedCoverId = await this.coverReferenceResolver.resolveCoverId(
			parsedArchive,
			opfXml,
			coverByMeta,
		);

		if (resolvedCoverId) {
			parsedArchive.metadata.cover = resolvedCoverId;
		}

		parsedArchive.toc = await this.parseToc(parsedArchive);

		return parsedArchive;
	}

	private parseRootFilePath(containerXml: string): string {
		const doc = load(containerXml, { xmlMode: true });
		const fullPath =
			doc("rootfile[full-path]").first().attr("full-path") ??
			doc("*[full-path]").first().attr("full-path");

		if (!fullPath || fullPath.trim().length === 0) {
			throw new Error("EPUB container does not include a valid rootfile path");
		}

		return this.pathUtils.normalizeArchivePath(fullPath);
	}

	private parseMetadata(opfXml: string): ParseMetadataResult {
		const doc = load(opfXml, { xmlMode: true });

		const title =
			this.textUtils.normalizeFlatText(doc("metadata > dc\\:title").first().text()) ||
			this.textUtils.normalizeFlatText(doc("metadata > title").first().text()) ||
			undefined;

		const creator =
			this.textUtils.normalizeFlatText(doc("metadata > dc\\:creator").first().text()) ||
			this.textUtils.normalizeFlatText(doc("metadata > creator").first().text()) ||
			undefined;

		const coverByMeta = this.coverReferenceResolver.extractCoverByMeta(opfXml);

		const metadata: EpubMetadata = {};

		if (title) {
			metadata.title = title;
		}

		if (creator) {
			metadata.creator = creator;
		}

		return { metadata, coverByMeta };
	}

	private parseManifest(
		opfXml: string,
		rootFilePath: string,
	): {
		manifestById: Map<string, EpubManifestItem>;
		manifestByHref: Map<string, EpubManifestItem>;
	} {
		const doc = load(opfXml, { xmlMode: true });
		const manifestNode = doc("manifest").first();

		const manifestById = new Map<string, EpubManifestItem>();
		const manifestByHref = new Map<string, EpubManifestItem>();

		for (const element of manifestNode.find("item").toArray()) {
			const id = doc(element).attr("id")?.trim();
			const rawHref = doc(element).attr("href")?.trim();

			if (!id || !rawHref) {
				continue;
			}

			const href = this.pathUtils.resolveHref(rootFilePath, rawHref);
			const mediaType =
				doc(element).attr("media-type")?.trim() ??
				doc(element).attr("mediaType")?.trim() ??
				null;
			const properties = doc(element).attr("properties")?.trim() ?? null;

			const manifestItem: EpubManifestItem = {
				id,
				href,
				mediaType,
				properties,
			};

			manifestById.set(id, manifestItem);
			manifestByHref.set(this.pathUtils.normalizeHref(href), manifestItem);
		}

		return { manifestById, manifestByHref };
	}

	private parseFlowAndSpineToc(
		opfXml: string,
		manifestById: Map<string, EpubManifestItem>,
	): {
		flow: EpubFlowItem[];
		spineTocId: string | null;
	} {
		const doc = load(opfXml, { xmlMode: true });
		const spineNode = doc("spine").first();
		const spineTocId = spineNode.attr("toc")?.trim() ?? null;

		const flow: EpubFlowItem[] = [];

		for (const element of spineNode.find("itemref").toArray()) {
			const idref = doc(element).attr("idref")?.trim();

			if (!idref) {
				continue;
			}

			const manifestItem = manifestById.get(idref);

			if (!manifestItem) {
				continue;
			}

			const flowItem: EpubFlowItem = {
				id: manifestItem.id,
				href: manifestItem.href,
			};

			if (manifestItem.mediaType) {
				flowItem.mediaType = manifestItem.mediaType;
				flowItem["media-type"] = manifestItem.mediaType;
			}

			flow.push(flowItem);
		}

		return {
			flow,
			spineTocId,
		};
	}

	private async parseToc(parsedArchive: ParsedArchive): Promise<EpubTocItem[]> {
		const tocByTarget = new Map<string, EpubTocItem>();

		const upsertTocItem = (item: EpubTocItem): void => {
			if (!this.isTocItemWithTitle(item) || typeof item.href !== "string") {
				return;
			}

			const normalizedTarget = this.pathUtils.normalizeTocTarget(item.href);

			if (!normalizedTarget) {
				return;
			}

			const existing = tocByTarget.get(normalizedTarget);

			if (
				!existing ||
				this.tocTitleScorer.shouldReplaceTocTitle(existing.title ?? "", item.title.trim())
			) {
				tocByTarget.set(normalizedTarget, {
					href: normalizedTarget,
					title: item.title.trim(),
				});
			}
		};

		if (parsedArchive.spineTocId) {
			const tocManifestItem = parsedArchive.manifestById.get(parsedArchive.spineTocId);

			if (tocManifestItem) {
				const tocXml = await this.zipEntryReader.readTextEntry(
					parsedArchive.zipfile,
					parsedArchive.indexedEntries,
					tocManifestItem.href,
				);

				for (const tocItem of this.parseNcxTitles(tocXml, tocManifestItem.href)) {
					upsertTocItem(tocItem);
				}
			}
		}

		const navItems = [...parsedArchive.manifestById.values()].filter((item) =>
			item.properties?.split(/\s+/).includes("nav"),
		);

		for (const navItem of navItems) {
			const navHtml = await this.zipEntryReader.readTextEntry(
				parsedArchive.zipfile,
				parsedArchive.indexedEntries,
				navItem.href,
			);

			for (const tocItem of this.parseNavDocumentTitles(navHtml, navItem.href)) {
				upsertTocItem(tocItem);
			}
		}

		const tocItems: EpubTocItem[] = [];

		for (const tocItem of tocByTarget.values()) {
			if (typeof tocItem.href !== "string") {
				continue;
			}

			const manifestItem = parsedArchive.manifestByHref.get(
				this.pathUtils.normalizeHref(tocItem.href),
			);

			const normalizedTocItem: EpubTocItem = {
				href: tocItem.href,
			};

			if (typeof tocItem.title === "string") {
				normalizedTocItem.title = tocItem.title;
			}

			if (manifestItem?.id) {
				normalizedTocItem.id = manifestItem.id;
			}

			tocItems.push(normalizedTocItem);
		}

		return tocItems;
	}

	private parseNcxTitles(ncxXml: string, ncxPath: string): EpubTocItem[] {
		const doc = load(ncxXml, { xmlMode: true });
		const tocItems: EpubTocItem[] = [];

		for (const navPoint of doc("navPoint").toArray()) {
			const navPointNode = doc(navPoint);
			const title = this.textUtils.normalizeFlatText(
				navPointNode.find("navLabel > text").first().text(),
			);
			const src = navPointNode.find("content").first().attr("src")?.trim();

			if (!title || !src) {
				continue;
			}

			tocItems.push({
				href: this.pathUtils.normalizeTocTarget(this.pathUtils.resolveHref(ncxPath, src)),
				title,
			});
		}

		return tocItems;
	}

	private parseNavDocumentTitles(navHtml: string, navPath: string): EpubTocItem[] {
		const doc = load(navHtml);
		const tocItems: EpubTocItem[] = [];

		const tocNav = doc("nav[epub\\:type='toc'], nav[role='doc-toc']").first();
		const scope = tocNav.length > 0 ? tocNav : doc("nav").first();
		const links = scope.find("a[href]").toArray();

		for (const link of links) {
			const href = doc(link).attr("href")?.trim();
			const title = this.textUtils.normalizeFlatText(doc(link).text());

			if (!href || !title) {
				continue;
			}

			tocItems.push({
				href: this.pathUtils.normalizeTocTarget(this.pathUtils.resolveHref(navPath, href)),
				title,
			});
		}

		return tocItems;
	}

	private isTocItemWithTitle(item: EpubTocItem): item is EpubTocItem & { title: string } {
		return typeof item.title === "string" && item.title.trim().length > 0;
	}
}
