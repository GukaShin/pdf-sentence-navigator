import type { TextContent, TextItem } from 'pdfjs-dist/types/src/display/api';
import type { PageText, TextItemRef } from '../types';

type ContentItem = TextContent['items'][number];

/** TextContent may include non-text "marked content" markers; filter them. */
function isTextItem(item: ContentItem): item is TextItem {
  return (item as TextItem).str !== undefined;
}

function endsWithSpace(s: string): boolean {
  return s.length > 0 && /\s$/.test(s);
}

function startsWithSpace(s: string): boolean {
  return s.length > 0 && /^\s/.test(s);
}

/**
 * Builds the normalized, sentence-ready text for a page and an item map that
 * links each PDF.js text run to its character range within that text.
 *
 * The item order here matches `TextLayer.textDivs`, so `TextItemRef.itemIndex`
 * can later be used to locate the corresponding span for highlighting.
 *
 * Separators (a single space or newline) are inserted between runs based on
 * geometry hints (`hasEOL`) and existing whitespace. These separators are part
 * of the normalized text but belong to no item; range-to-span mapping snaps to
 * the nearest item boundary when an offset lands on one.
 */
export function buildPageText(pageNumber: number, content: TextContent): PageText {
  const runs = content.items.filter(isTextItem);
  const items: TextItemRef[] = [];
  let text = '';

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (!run) continue;

    const charStart = text.length;
    text += run.str;
    const charEnd = text.length;

    items.push({
      pageNumber,
      str: run.str,
      charStart,
      charEnd,
      itemIndex: i,
    });

    const next = runs[i + 1];
    if (run.hasEOL) {
      text += '\n';
    } else if (next && !endsWithSpace(run.str) && !startsWithSpace(next.str)) {
      text += ' ';
    }
  }

  const hasText = items.some((item) => item.str.trim().length > 0);
  return { pageNumber, text, items, hasText };
}
