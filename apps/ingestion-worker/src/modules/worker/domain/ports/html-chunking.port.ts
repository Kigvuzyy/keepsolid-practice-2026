export interface TextChunk {
	chunkIndex: number;
	text: string;
	charCount: number;
	contextChars: number;
	sourceStartChar: number;
	sourceEndChar: number;
}

export interface HtmlChunkingInput {
	html: string;
}

export interface HtmlChunkingOptions {
	maxChars?: number;
	contextChars?: number;
}

export interface HtmlChunkingResult {
	plainText: string;
	plainTextChars: number;
	chunks: TextChunk[];
}

export abstract class HtmlChunkingPort {
	public abstract chunk(
		input: HtmlChunkingInput,
		options?: HtmlChunkingOptions,
	): Promise<HtmlChunkingResult>;
}
