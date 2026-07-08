import type { PageText, Sentence, SentenceSpan } from '../types';
import { segmentSentences } from './SentenceSegmenter';

interface PageOffset {
  readonly pageNumber: number;
  /** Offset of this page's text within the global concatenated string. */
  readonly globalStart: number;
  /** Length of this page's text (excludes the inter-page separator). */
  readonly length: number;
}

/** Separator inserted between page texts in the global string. */
const PAGE_SEPARATOR = '\n';

/**
 * Immutable, document-global sentence list built once from all page texts.
 *
 * Pages are concatenated into a single string (so sentences that run across a
 * page break are detected as one), then each sentence's global range is split
 * back into per-page spans that map onto each page's text layer.
 */
export class SentenceIndex {
  private constructor(private readonly sentences: readonly Sentence[]) {}

  static build(pages: readonly PageText[], locale?: string): SentenceIndex {
    const offsets: PageOffset[] = [];
    let global = '';
    for (const page of pages) {
      offsets.push({
        pageNumber: page.pageNumber,
        globalStart: global.length,
        length: page.text.length,
      });
      global += page.text + PAGE_SEPARATOR;
    }

    const sentences: Sentence[] = [];
    for (const piece of segmentSentences(global, locale)) {
      if (piece.text.trim().length === 0) continue;
      const spans = toSpans(piece.start, piece.end, offsets);
      const first = spans[0];
      if (!first) continue;
      sentences.push({
        index: sentences.length,
        text: piece.text,
        spans,
        startPage: first.pageNumber,
      });
    }

    return new SentenceIndex(sentences);
  }

  get count(): number {
    return this.sentences.length;
  }

  at(index: number): Sentence | undefined {
    return this.sentences[index];
  }

  all(): readonly Sentence[] {
    return this.sentences;
  }
}

/** Splits a global [start, end) range into per-page spans (local offsets). */
function toSpans(
  start: number,
  end: number,
  offsets: readonly PageOffset[],
): SentenceSpan[] {
  const spans: SentenceSpan[] = [];
  for (const off of offsets) {
    const pageGlobalEnd = off.globalStart + off.length;
    const s = Math.max(start, off.globalStart);
    const e = Math.min(end, pageGlobalEnd);
    if (e > s) {
      spans.push({
        pageNumber: off.pageNumber,
        charStart: s - off.globalStart,
        charEnd: e - off.globalStart,
      });
    }
  }
  return spans;
}
