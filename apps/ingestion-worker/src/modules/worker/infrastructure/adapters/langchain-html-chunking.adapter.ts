import { load } from "cheerio";
import { Injectable } from "@nestjs/common";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import type {
	HtmlChunkingInput,
	HtmlChunkingOptions,
	HtmlChunkingResult,
	HtmlChunkingPort,
	TextChunk,
} from "@/modules/worker/domain/ports/html-chunking.port";

const DEFAULT_MAX_CHARS = 1200;
const DEFAULT_CONTEXT_CHARS = 200;

const LINE_BREAK_TAG_PATTERN = /<br\s*\/?>/gi;
const STRUCTURAL_TAG_END_PATTERN =
	/<\/(article|aside|blockquote|dd|div|figcaption|figure|h[1-6]|header|li|p|section|table|td|th|tr|ul|ol)>/gi;
const SEMANTIC_SEPARATORS = ["\n\n", "\n", ". ", "! ", "? ", "… ", "; ", ": ", ", ", " "];

@Injectable()
export class LangchainHtmlChunkingAdapter implements HtmlChunkingPort {
	public async chunk(
		input: HtmlChunkingInput,
		options?: HtmlChunkingOptions,
	): Promise<HtmlChunkingResult> {
		const plainText = this.extractPlainText(input.html);
		const chunks = await this.splitPlainText(plainText, options);

		return {
			plainText,
			plainTextChars: plainText.length,
			chunks,
		};
	}

	private extractPlainText(html: string): string {
		const withLineBreaks = html
			.replace(LINE_BREAK_TAG_PATTERN, "\n")
			.replace(STRUCTURAL_TAG_END_PATTERN, "$&\n");

		const doc = load(withLineBreaks);
		this.removeNoise(doc);

		const body = doc("body");
		const text = body.length > 0 ? body.text() : doc.root().text();

		return this.normalizeText(text);
	}

	private async splitPlainText(
		plainText: string,
		options?: HtmlChunkingOptions,
	): Promise<TextChunk[]> {
		if (plainText.length === 0) {
			return [];
		}

		const { maxChars, contextChars } = this.resolveOptions(options);

		const splitter = new RecursiveCharacterTextSplitter({
			chunkSize: maxChars,
			chunkOverlap: contextChars,
			keepSeparator: false,
			separators: SEMANTIC_SEPARATORS,
			lengthFunction: (text) => text.length,
		});

		const splitChunks = await splitter.splitText(plainText);

		return this.mapChunksToSource(plainText, splitChunks);
	}

	private mapChunksToSource(plainText: string, splitChunks: string[]): TextChunk[] {
		const chunks: TextChunk[] = [];

		for (const chunkText of splitChunks) {
			const previousChunk = chunks.length > 0 ? chunks[chunks.length - 1]! : null;
			const start = this.resolveChunkStart(plainText, chunkText, previousChunk);
			const end = start + chunkText.length;

			if (plainText.slice(start, end) !== chunkText) {
				throw new Error("Unable to map split chunk back to source text");
			}

			chunks.push({
				chunkIndex: chunks.length + 1,
				text: chunkText,
				charCount: chunkText.length,
				contextChars: previousChunk ? Math.max(0, previousChunk.sourceEndChar - start) : 0,
				sourceStartChar: start,
				sourceEndChar: end,
			});
		}

		return chunks;
	}

	private resolveChunkStart(
		plainText: string,
		chunkText: string,
		previousChunk: TextChunk | null,
	): number {
		if (!previousChunk) {
			const start = plainText.indexOf(chunkText);

			if (start >= 0) {
				return start;
			}

			throw new Error("Unable to map first chunk back to source text");
		}

		const overlapStart = this.findOverlapStart(plainText, previousChunk, chunkText);

		if (typeof overlapStart === "number") {
			return overlapStart;
		}

		const fallbackStart = plainText.indexOf(chunkText, previousChunk.sourceStartChar + 1);

		if (fallbackStart >= 0) {
			return fallbackStart;
		}

		throw new Error("Unable to map overlapped chunk back to source text");
	}

	private findOverlapStart(
		plainText: string,
		previousChunk: TextChunk,
		chunkText: string,
	): number | null {
		const maxOverlap = Math.min(previousChunk.text.length, chunkText.length);

		for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
			if (!previousChunk.text.endsWith(chunkText.slice(0, overlap))) {
				continue;
			}

			const start = previousChunk.sourceEndChar - overlap;

			if (start < 0) {
				continue;
			}

			if (plainText.slice(start, start + chunkText.length) === chunkText) {
				return start;
			}
		}

		return null;
	}

	private resolveOptions(options?: HtmlChunkingOptions): Required<HtmlChunkingOptions> {
		const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;
		const contextChars = options?.contextChars ?? DEFAULT_CONTEXT_CHARS;

		if (!Number.isInteger(maxChars) || maxChars <= 0) {
			throw new RangeError("maxChars must be a positive integer");
		}

		if (!Number.isInteger(contextChars) || contextChars < 0) {
			throw new RangeError("contextChars must be a non-negative integer");
		}

		if (contextChars >= maxChars) {
			throw new RangeError("contextChars must be smaller than maxChars");
		}

		return {
			maxChars,
			contextChars,
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

	private normalizeText(text: string): string {
		const normalized = text
			.replace(/\u00A0/g, " ")
			.replace(/\r\n?/g, "\n")
			.replace(/[ \t\f\v]+/g, " ")
			.replace(/ *\n */g, "\n")
			.replace(/\n{3,}/g, "\n\n")
			.trim();

		if (normalized.length === 0) {
			return "";
		}

		return normalized
			.split(/\n{2,}/)
			.map((paragraph) => paragraph.replace(/\n+/g, " ").replace(/ {2,}/g, " ").trim())
			.filter((paragraph) => paragraph.length > 0)
			.join("\n\n");
	}
}

