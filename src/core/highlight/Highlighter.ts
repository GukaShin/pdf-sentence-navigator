import type { Sentence } from '../types';
import { buildSentenceRanges, type PageGeometryLookup } from './RangeBuilder';

const HIGHLIGHT_NAME = 'pdf-sentence';

/**
 * Paints exactly one sentence at a time.
 *
 * Preferred path is the CSS Custom Highlight API, which highlights a set of
 * Ranges without touching the DOM (no reflow, cheap to swap). Where it is
 * unavailable we fall back to pooled absolutely-positioned overlay divs.
 */
export class Highlighter {
  private readonly supported: boolean;
  private cssHighlight: Highlight | undefined;
  private readonly overlays: HTMLElement[] = [];
  private pages: PageGeometryLookup;

  constructor(pages: PageGeometryLookup) {
    this.pages = pages;
    this.supported =
      typeof CSS !== 'undefined' &&
      'highlights' in CSS &&
      typeof Highlight !== 'undefined';

    if (this.supported) {
      this.cssHighlight = new Highlight();
      CSS.highlights.set(HIGHLIGHT_NAME, this.cssHighlight);
    }
  }

  /** Swaps in fresh page geometry (e.g. after a zoom re-render). */
  setPages(pages: PageGeometryLookup): void {
    this.pages = pages;
  }

  /** Highlights the given sentence and returns the ranges used (for scrolling). */
  show(sentence: Sentence): Range[] {
    this.clear();
    const ranges = buildSentenceRanges(sentence, this.pages);
    if (ranges.length === 0) return ranges;

    if (this.supported && this.cssHighlight) {
      for (const range of ranges) this.cssHighlight.add(range);
    } else {
      this.renderOverlays(ranges);
    }
    return ranges;
  }

  clear(): void {
    if (this.supported) {
      this.cssHighlight?.clear();
    } else {
      this.removeOverlays();
    }
  }

  destroy(): void {
    this.clear();
    if (this.supported) CSS.highlights.delete(HIGHLIGHT_NAME);
    this.cssHighlight = undefined;
  }

  // --- Fallback overlay rendering -----------------------------------------

  private renderOverlays(ranges: Range[]): void {
    const rects: DOMRect[] = [];
    for (const range of ranges) {
      for (const rect of range.getClientRects()) rects.push(rect);
    }

    let i = 0;
    for (const rect of rects) {
      const overlay = this.overlays[i] ?? this.createOverlay();
      overlay.style.left = `${rect.left + window.scrollX}px`;
      overlay.style.top = `${rect.top + window.scrollY}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.display = 'block';
      i++;
    }
    for (; i < this.overlays.length; i++) {
      const overlay = this.overlays[i];
      if (overlay) overlay.style.display = 'none';
    }
  }

  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'sentence-overlay';
    document.body.appendChild(overlay);
    this.overlays.push(overlay);
    return overlay;
  }

  private removeOverlays(): void {
    for (const overlay of this.overlays) overlay.style.display = 'none';
  }
}
