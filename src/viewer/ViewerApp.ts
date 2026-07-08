import type { PDFDocumentProxy } from 'pdfjs-dist';
import { loadPdf } from '../core/pdf/PdfLoader';
import { buildPageText } from '../core/pdf/TextExtractor';
import { renderPage, type RenderedPage } from '../core/pdf/PageRenderer';
import { SentenceIndex } from '../core/sentences/SentenceIndex';
import { NavigationController, type NavigationState } from '../core/navigation/NavigationController';
import { KeyboardHandler } from '../core/navigation/KeyboardHandler';
import { Highlighter } from '../core/highlight/Highlighter';
import { ScrollManager } from '../core/highlight/ScrollManager';
import type { PageGeometryLookup, PageTextGeometry } from '../core/highlight/RangeBuilder';
import type { PageText } from '../core/types';
import { debounce } from '../core/util/debounce';
import { logger } from '../core/util/logger';

export interface ViewerElements {
  readonly pagesEl: HTMLElement;
  readonly statusEl: HTMLElement | null;
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 4;
const PAGE_MARGIN = 32;
const ZOOM_STEP = 1.15;
const RESIZE_DEBOUNCE_MS = 200;

/**
 * Orchestrates the viewer: load the PDF, render pages, extract text, and wire
 * sentence indexing, navigation, highlighting and scrolling together. Also owns
 * zoom and resize, re-rendering pages and rebuilding highlight geometry so the
 * active sentence stays correctly highlighted.
 */
export class ViewerApp {
  private doc: PDFDocumentProxy | undefined;
  readonly pages: RenderedPage[] = [];
  readonly pageTexts: PageText[] = [];
  sentenceIndex: SentenceIndex | undefined;

  private navigation: NavigationController | undefined;
  private keyboard: KeyboardHandler | undefined;
  private highlighter: Highlighter | undefined;
  private scroller: ScrollManager | undefined;

  private scale = 1;
  private autoFit = true;
  /** Incremented per render pass so superseded (stale) passes can bail out. */
  private renderToken = 0;

  private readonly onResize = debounce(() => {
    if (this.autoFit) void this.refit();
  }, RESIZE_DEBOUNCE_MS);

  constructor(private readonly elements: ViewerElements) {}

  async open(url: string): Promise<void> {
    this.setStatus('Loading PDF\u2026');
    this.doc = await loadPdf(url);

    this.scale = await this.computeFitScale();
    await this.renderPages(this.scale);

    if (!this.pageTexts.some((page) => page.hasText)) {
      this.setStatus('No selectable text found (this looks like a scanned PDF).');
      return;
    }

    this.sentenceIndex = SentenceIndex.build(this.pageTexts);
    this.enableNavigation(this.sentenceIndex.count);
    this.attachViewportListeners();
  }

  /** (Re)renders every page at `scale`. Text extraction happens only once. */
  private async renderPages(scale: number): Promise<void> {
    if (!this.doc) return;
    const doc = this.doc;
    const token = ++this.renderToken;

    this.elements.pagesEl.replaceChildren();
    this.pages.length = 0;
    const extractText = this.pageTexts.length === 0;

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      if (token !== this.renderToken) {
        page.cleanup();
        return; // A newer render pass superseded this one.
      }

      if (extractText) this.pageTexts.push(buildPageText(pageNumber, content));

      const rendered = await renderPage(page, scale, content);
      page.cleanup();
      if (token !== this.renderToken) return;

      this.elements.pagesEl.appendChild(rendered.container);
      this.pages.push(rendered);
    }
  }

  private enableNavigation(total: number): void {
    this.highlighter = new Highlighter(this.buildGeometry());
    this.scroller = new ScrollManager();
    this.navigation = new NavigationController(total);
    this.navigation.subscribe((state) => this.onNavigate(state));
    this.keyboard = new KeyboardHandler(this.navigation);
    this.keyboard.attach();
    this.showReady(total);
  }

  private onNavigate(state: NavigationState): void {
    this.refreshHighlight(true);
    this.setStatus(`Sentence ${state.index + 1} of ${state.total}`);
    logger.debug('navigate', state);
  }

  /** Re-shows the active sentence; optionally scrolls it into view. */
  private refreshHighlight(scrollIntoView: boolean): void {
    const index = this.navigation?.state.index ?? -1;
    const sentence = index >= 0 ? this.sentenceIndex?.at(index) : undefined;
    if (!sentence || !this.highlighter) return;
    const ranges = this.highlighter.show(sentence);
    if (scrollIntoView) this.scroller?.scrollToRanges(ranges);
  }

  /** Maps page numbers to their text items and rendered text-layer spans. */
  private buildGeometry(): PageGeometryLookup {
    const textByPage = new Map<number, PageText>();
    for (const page of this.pageTexts) textByPage.set(page.pageNumber, page);

    const map = new Map<number, PageTextGeometry>();
    for (const rendered of this.pages) {
      const pageText = textByPage.get(rendered.pageNumber);
      if (!pageText) continue;
      map.set(rendered.pageNumber, { items: pageText.items, spans: rendered.spans });
    }
    return map;
  }

  // --- Zoom / resize -------------------------------------------------------

  private attachViewportListeners(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onZoomKey);
    window.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private readonly onZoomKey = (event: KeyboardEvent): void => {
    if (!event.ctrlKey && !event.metaKey) return;
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      void this.applyScale(this.scale * ZOOM_STEP, true);
    } else if (event.key === '-') {
      event.preventDefault();
      void this.applyScale(this.scale / ZOOM_STEP, true);
    } else if (event.key === '0') {
      event.preventDefault();
      this.autoFit = true;
      void this.refit();
    }
  };

  private readonly onWheel = (event: WheelEvent): void => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    void this.applyScale(this.scale * factor, true);
  };

  private async refit(): Promise<void> {
    await this.applyScale(await this.computeFitScale(), false);
  }

  private async applyScale(scale: number, userInitiated: boolean): Promise<void> {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    if (userInitiated) this.autoFit = false;
    if (Math.abs(clamped - this.scale) < 0.001) return;

    this.scale = clamped;
    await this.renderPages(clamped);
    this.highlighter?.setPages(this.buildGeometry());
    this.refreshHighlight(true);
  }

  /** Fit-to-width scale from the first page's intrinsic (scale 1) size. */
  private async computeFitScale(): Promise<number> {
    if (!this.doc) return this.scale || 1;
    const first = await this.doc.getPage(1);
    const base = first.getViewport({ scale: 1 });
    const available = this.elements.pagesEl.clientWidth - PAGE_MARGIN;
    if (available <= 0) return this.scale || 1;
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, available / base.width));
  }

  private showReady(total: number): void {
    const pages = this.doc?.numPages ?? this.pages.length;
    this.setStatus(
      total > 0
        ? `${pages} page(s), ${total} sentence(s). Tab / Shift+Tab to navigate, Ctrl +/- to zoom.`
        : `${pages} page(s). No sentences detected.`,
    );
  }

  private setStatus(message: string): void {
    if (this.elements.statusEl) this.elements.statusEl.textContent = message;
  }

  destroy(): void {
    this.onResize.cancel();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onZoomKey);
    window.removeEventListener('wheel', this.onWheel);
    this.keyboard?.detach();
    this.keyboard = undefined;
    this.navigation = undefined;
    this.highlighter?.destroy();
    this.highlighter = undefined;
    this.scroller = undefined;
    void this.doc?.destroy();
    this.doc = undefined;
    this.sentenceIndex = undefined;
    this.pages.length = 0;
    this.pageTexts.length = 0;
  }
}
