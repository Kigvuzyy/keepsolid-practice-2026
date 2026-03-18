import { load } from "cheerio";
import { Inject, Injectable } from "@nestjs/common";

import type { EpubManifestItem, ParsedArchive } from "@/modules/worker/infrastructure/epub/types";

import { EpubPathUtils } from "@/modules/worker/infrastructure/epub/utils/epub-path-utils";
import { ZipEntryReader } from "@/modules/worker/infrastructure/epub/zip/zip-entry-reader";

@Injectable()
export class EpubCoverReferenceResolver {
	public constructor(
		@Inject(EpubPathUtils)
		private readonly pathUtils: EpubPathUtils,

		@Inject(ZipEntryReader)
		private readonly zipEntryReader: ZipEntryReader,
	) {}

	public extractCoverByMeta(opfXml: string): string | null {
		const doc = load(opfXml, { xmlMode: true });

		for (const metaNode of doc("metadata").first().find("meta").toArray()) {
			const meta = doc(metaNode);
			const name =
				meta.attr("name")?.trim().toLowerCase() ??
				meta.attr("opf:name")?.trim().toLowerCase() ??
				null;

			if (name !== "cover") {
				continue;
			}

			const content =
				meta.attr("content")?.trim() ?? meta.attr("opf:content")?.trim() ?? null;

			if (content) {
				return content;
			}
		}

		return null;
	}

	public async resolveCoverId(
		parsedArchive: ParsedArchive,
		opfXml: string,
		coverByMeta: string | null,
	): Promise<string | null> {
		const referenceCandidates = [
			coverByMeta,
			...this.collectGuideCoverReferences(opfXml),
		].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

		for (const reference of referenceCandidates) {
			const imageId = await this.resolveImageIdFromReference(
				parsedArchive,
				parsedArchive.rootFilePath,
				reference,
			);

			if (imageId) {
				return imageId;
			}
		}

		const coverImageByProperties = [...parsedArchive.manifestById.values()].find(
			(item) =>
				this.isImageManifestItem(item) && this.hasManifestProperty(item, "cover-image"),
		);

		if (coverImageByProperties) {
			return coverImageByProperties.id;
		}

		for (const manifestItem of this.collectCoverLikeManifestItems(parsedArchive)) {
			const imageId = await this.resolveImageIdFromManifestItem(parsedArchive, manifestItem);

			if (imageId) {
				return imageId;
			}
		}

		const namedImageCandidate = [...parsedArchive.manifestById.values()].find(
			(item) => this.isImageManifestItem(item) && this.isCoverLikeManifestItem(item),
		);

		return namedImageCandidate?.id ?? null;
	}

	private collectGuideCoverReferences(opfXml: string): string[] {
		const doc = load(opfXml, { xmlMode: true });
		const references: string[] = [];
		const seen = new Set<string>();

		for (const element of doc("guide").first().find("[href]").toArray()) {
			const reference = doc(element);
			const type = reference.attr("type")?.trim().toLowerCase() ?? "";
			const href = reference.attr("href")?.trim() ?? "";

			if (!href || !this.isGuideCoverType(type) || seen.has(href)) {
				continue;
			}

			seen.add(href);
			references.push(href);
		}

		return references;
	}

	private isGuideCoverType(type: string): boolean {
		return type.includes("cover") || type.includes("titlepage") || type.includes("title-page");
	}

	private collectCoverLikeManifestItems(parsedArchive: ParsedArchive): EpubManifestItem[] {
		const candidates: EpubManifestItem[] = [];
		const seen = new Set<string>();
		const push = (item: EpubManifestItem | null | undefined): void => {
			if (!item || seen.has(item.id)) {
				return;
			}

			seen.add(item.id);
			candidates.push(item);
		};

		for (const item of parsedArchive.manifestById.values()) {
			if (this.isCoverLikeManifestItem(item)) {
				push(item);
			}
		}

		if (parsedArchive.flow.length > 0) {
			push(parsedArchive.manifestById.get(parsedArchive.flow[0]!.id));
		}

		return candidates;
	}

	private isCoverLikeManifestItem(item: EpubManifestItem): boolean {
		const hrefBaseName = item.href.split("/").pop() ?? item.href;
		return this.isCoverLikeValue(item.id) || this.isCoverLikeValue(hrefBaseName);
	}

	private isCoverLikeValue(value: string): boolean {
		const normalized = value.trim().toLowerCase();

		if (!normalized) {
			return false;
		}

		return /(^|[^a-z])(cover|coverimage|coverimg|frontcover|titlepage|title-page)([^a-z]|$)/i.test(
			normalized,
		);
	}

	private async resolveImageIdFromReference(
		parsedArchive: ParsedArchive,
		baseFilePath: string,
		reference: string,
	): Promise<string | null> {
		const manifestItem = this.findManifestItemByReference(
			parsedArchive,
			baseFilePath,
			reference,
		);

		if (manifestItem) {
			return this.resolveImageIdFromManifestItem(parsedArchive, manifestItem);
		}

		const resolvedPath = this.pathUtils.resolveHref(baseFilePath, reference);
		return this.resolveImageIdFromDocumentPath(parsedArchive, resolvedPath);
	}

	private async resolveImageIdFromManifestItem(
		parsedArchive: ParsedArchive,
		manifestItem: EpubManifestItem,
	): Promise<string | null> {
		if (this.isImageManifestItem(manifestItem)) {
			return manifestItem.id;
		}

		if (!this.isDocumentLikeManifestItem(manifestItem)) {
			return null;
		}

		return this.resolveImageIdFromDocumentPath(parsedArchive, manifestItem.href);
	}

	private async resolveImageIdFromDocumentPath(
		parsedArchive: ParsedArchive,
		documentPath: string,
	): Promise<string | null> {
		let documentText: string;

		try {
			documentText = await this.zipEntryReader.readTextEntry(
				parsedArchive.zipfile,
				parsedArchive.indexedEntries,
				documentPath,
			);
		} catch {
			return null;
		}

		for (const reference of this.extractImageReferencesFromDocument(documentText)) {
			const manifestItem = this.findManifestItemByReference(
				parsedArchive,
				documentPath,
				reference,
			);

			if (manifestItem && this.isImageManifestItem(manifestItem)) {
				return manifestItem.id;
			}
		}

		return null;
	}

	private extractImageReferencesFromDocument(documentText: string): string[] {
		const doc = load(documentText, { xmlMode: true });
		const references: string[] = [];
		const seen = new Set<string>();
		const push = (value: string | null | undefined): void => {
			const normalized = value?.trim() ?? "";

			if (!normalized || seen.has(normalized)) {
				return;
			}

			seen.add(normalized);
			references.push(normalized);
		};

		for (const element of doc(
			"img[src], image[href], image[xlink\\:href], object[data]",
		).toArray()) {
			const node = doc(element);
			push(
				node.attr("src") ??
					node.attr("href") ??
					node.attr("xlink:href") ??
					node.attr("data"),
			);
		}

		for (const element of doc("[style]").toArray()) {
			for (const url of this.extractCssUrls(doc(element).attr("style"))) {
				push(url);
			}
		}

		for (const styleNode of doc("style").toArray()) {
			for (const url of this.extractCssUrls(doc(styleNode).text())) {
				push(url);
			}
		}

		return references;
	}

	private extractCssUrls(value: string | null | undefined): string[] {
		if (!value) {
			return [];
		}

		const urls: string[] = [];
		const pattern = /url\((['"]?)(.*?)\1\)/gi;

		for (const match of value.matchAll(pattern)) {
			const url = match[2]?.trim();

			if (url) {
				urls.push(url);
			}
		}

		return urls;
	}

	private findManifestItemByReference(
		parsedArchive: ParsedArchive,
		baseFilePath: string,
		reference: string,
	): EpubManifestItem | null {
		const rawReference = reference.trim();

		if (!rawReference) {
			return null;
		}

		const directId = rawReference.replace(/^#/, "");
		if (directId && parsedArchive.manifestById.has(directId)) {
			return parsedArchive.manifestById.get(directId) ?? null;
		}

		const resolvedHref = this.pathUtils.resolveHref(baseFilePath, rawReference);
		return this.findManifestItemByHref(parsedArchive, resolvedHref);
	}

	private findManifestItemByHref(
		parsedArchive: ParsedArchive,
		href: string,
	): EpubManifestItem | null {
		const normalizedHref = this.pathUtils.normalizeHref(href);
		const directMatch = parsedArchive.manifestByHref.get(normalizedHref);

		if (directMatch) {
			return directMatch;
		}

		const lowerHref = normalizedHref.toLowerCase();

		for (const item of parsedArchive.manifestById.values()) {
			if (item.href.toLowerCase() === lowerHref) {
				return item;
			}
		}

		return null;
	}

	private hasManifestProperty(item: EpubManifestItem, propertyName: string): boolean {
		return item.properties?.split(/\s+/).includes(propertyName) ?? false;
	}

	private isImageManifestItem(item: EpubManifestItem): boolean {
		return item.mediaType?.startsWith("image/") ?? false;
	}

	private isDocumentLikeManifestItem(item: EpubManifestItem): boolean {
		if (!item.mediaType) {
			return /\.(xhtml|html|htm|svg)$/i.test(item.href);
		}

		return (
			item.mediaType === "application/xhtml+xml" ||
			item.mediaType === "text/html" ||
			item.mediaType === "application/xml" ||
			item.mediaType === "image/svg+xml"
		);
	}
}
