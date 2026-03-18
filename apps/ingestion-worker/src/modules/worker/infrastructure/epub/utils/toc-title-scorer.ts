import { Injectable } from "@nestjs/common";

@Injectable()
export class TocTitleScorer {
	public shouldReplaceTocTitle(currentTitle: string, candidateTitle: string): boolean {
		const currentScore = this.scoreTocTitle(currentTitle);
		const candidateScore = this.scoreTocTitle(candidateTitle);

		if (candidateScore !== currentScore) {
			return candidateScore > currentScore;
		}

		return candidateTitle.length > currentTitle.length;
	}

	public scoreTocTitle(title: string): number {
		const normalized = title.trim();

		if (!normalized) {
			return Number.NEGATIVE_INFINITY;
		}

		if (this.isPageMarkerTitle(normalized)) {
			return -200;
		}

		if (this.isFootnoteLikeTitle(normalized)) {
			return -100;
		}

		let score = 0;
		if (/[A-Za-z]/.test(normalized)) {
			score += 10;
		}

		if (normalized.length >= 16) {
			score += 6;
		}

		if (/\b(chapter|part|book)\b/i.test(normalized)) {
			score += 2;
		}

		if (/^\s*(chapter|part|book)\s+[ivxlcdm\d]+\s*$/i.test(normalized)) {
			score -= 3;
		}

		if (this.isMostlyUppercaseTitle(normalized)) {
			score -= 2;
		}

		return score;
	}

	private isFootnoteLikeTitle(title: string): boolean {
		return /^footnotes?:?$/i.test(title);
	}

	private isPageMarkerTitle(title: string): boolean {
		return /^\[?\s*(pg|page)\.?\s*\d+\s*\]?$/i.test(title);
	}

	private isMostlyUppercaseTitle(title: string): boolean {
		const letters = title.match(/[A-Za-z]/g);

		if (!letters || letters.length === 0) {
			return false;
		}

		const uppercaseLetters = letters.filter((letter) => letter === letter.toUpperCase()).length;
		return uppercaseLetters / letters.length > 0.8;
	}
}
