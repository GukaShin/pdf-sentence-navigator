/**
 * Shared domain types for the viewer pipeline:
 *   PDF page -> normalized text + item map -> sentences -> highlight ranges.
 */

/** A single text run reported by PDF.js, positioned within a page's text. */
export interface TextItemRef {
  /** 1-based page number this item belongs to. */
  readonly pageNumber: number;
  /** The raw string of this run. */
  readonly str: string;
  /** Inclusive start offset within the page's normalized text. */
  readonly charStart: number;
  /** Exclusive end offset within the page's normalized text. */
  readonly charEnd: number;
  /** Index of this item within its page (matches the text layer span index). */
  readonly itemIndex: number;
}

/** Normalized, sentence-ready text for a single page plus its item map. */
export interface PageText {
  readonly pageNumber: number;
  /** Whitespace-normalized text used for sentence segmentation. */
  readonly text: string;
  readonly items: readonly TextItemRef[];
  /** True when the page exposes no selectable text (e.g. scanned image). */
  readonly hasText: boolean;
}

/** A contiguous slice of a page's text belonging to a sentence. */
export interface SentenceSpan {
  readonly pageNumber: number;
  /** Inclusive start offset within the page's normalized text. */
  readonly charStart: number;
  /** Exclusive end offset within the page's normalized text. */
  readonly charEnd: number;
}

/**
 * A sentence, possibly spanning multiple pages. Geometry is derived lazily
 * from the live text layer, so only text/offsets are stored here.
 */
export interface Sentence {
  /** Stable, document-global sentence index (navigation order). */
  readonly index: number;
  readonly text: string;
  /** One span per page the sentence touches, in reading order. */
  readonly spans: readonly SentenceSpan[];
  /** First page the sentence appears on (used for scrolling). */
  readonly startPage: number;
}
