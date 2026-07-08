/**
 * Splits text into sentence pieces with character offsets.
 *
 * Primary strategy is `Intl.Segmenter` (granularity: 'sentence'), which is
 * local, dependency-free and punctuation/locale aware. A regex fallback covers
 * engines without it (not expected given our Chrome baseline).
 */
export interface SentencePiece {
  /** Trimmed sentence text (leading/trailing whitespace removed). */
  readonly text: string;
  /** Inclusive start offset into the source text (after trimming). */
  readonly start: number;
  /** Exclusive end offset into the source text (after trimming). */
  readonly end: number;
}

const supportsSegmenter =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function';

export function segmentSentences(text: string, locale?: string): SentencePiece[] {
  if (text.length === 0) return [];
  return supportsSegmenter ? segmentWithIntl(text, locale) : segmentWithRegex(text);
}

function segmentWithIntl(text: string, locale?: string): SentencePiece[] {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' });
  const pieces: SentencePiece[] = [];
  for (const { segment, index } of segmenter.segment(text)) {
    const piece = trimToPiece(segment, index);
    if (piece) pieces.push(piece);
  }
  return pieces;
}

function segmentWithRegex(text: string): SentencePiece[] {
  const pieces: SentencePiece[] = [];
  // Greedy up to a terminator (. ! ?), a blank line, or end of text.
  const re = /[\s\S]*?(?:[.!?]+|\n{2,}|$)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match[0].length > 0) {
      const piece = trimToPiece(match[0], match.index);
      if (piece) pieces.push(piece);
    }
    // Guard against zero-length matches (the trailing `$` alternative).
    if (re.lastIndex === match.index) re.lastIndex++;
  }
  return pieces;
}

function trimToPiece(segment: string, offset: number): SentencePiece | null {
  const leading = segment.length - segment.trimStart().length;
  const trailing = segment.length - segment.trimEnd().length;
  const start = offset + leading;
  const end = offset + segment.length - trailing;
  if (end <= start) return null;
  return { text: segment.slice(leading, segment.length - trailing), start, end };
}
