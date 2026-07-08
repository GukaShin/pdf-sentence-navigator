import type { Sentence, TextItemRef } from '../types';

export interface PageTextGeometry {
  readonly items: readonly TextItemRef[];
  /** Text-layer span per item, index-aligned with TextItemRef.itemIndex. */
  readonly spans: readonly HTMLElement[];
}

export type PageGeometryLookup = ReadonlyMap<number, PageTextGeometry>;

interface DomPosition {
  readonly node: Text;
  readonly offset: number;
}

/**
 * Builds one DOM Range per page a sentence touches. Ranges are computed from
 * the live text layer, so they stay correct across zoom and rotation.
 *
 * Character offsets that land on inter-item separators (which belong to no
 * span) are snapped to the nearest item boundary.
 */
export function buildSentenceRanges(
  sentence: Sentence,
  pages: PageGeometryLookup,
): Range[] {
  const ranges: Range[] = [];

  for (const span of sentence.spans) {
    const geometry = pages.get(span.pageNumber);
    if (!geometry) continue;

    const start = locateStart(span.charStart, geometry);
    const end = locateEnd(span.charEnd, geometry);
    if (!start || !end) continue;

    const range = document.createRange();
    try {
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
    } catch {
      continue;
    }
    if (!range.collapsed) ranges.push(range);
  }

  return ranges;
}

function textNodeOf(span: HTMLElement | undefined): Text | null {
  const node = span?.firstChild;
  return node && node.nodeType === Node.TEXT_NODE ? (node as Text) : null;
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(value, max));
}

/** First DOM position at or after `offset` (snaps forward across gaps). */
function locateStart(offset: number, geometry: PageTextGeometry): DomPosition | null {
  const { items, spans } = geometry;
  for (const item of items) {
    if (offset < item.charEnd) {
      const node = textNodeOf(spans[item.itemIndex]);
      if (!node) continue;
      return { node, offset: clamp(offset - item.charStart, node.length) };
    }
  }
  return null;
}

/** Last DOM position at or before `offset` (snaps back across gaps). */
function locateEnd(offset: number, geometry: PageTextGeometry): DomPosition | null {
  const { items, spans } = geometry;
  let candidate: TextItemRef | null = null;
  for (const item of items) {
    if (item.charStart < offset) candidate = item;
    else break;
  }

  const target = candidate ?? items[0];
  if (!target) return null;

  const node = textNodeOf(spans[target.itemIndex]);
  if (!node) return null;
  return { node, offset: clamp(offset - target.charStart, node.length) };
}
