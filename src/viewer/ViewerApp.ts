import type { PDFDocumentProxy } from 'pdfjs-dist';
import { loadPdf } from '../core/pdf/PdfLoader';
import { buildPageText } from '../core/pdf/TextExtractor';
import { renderPage, type RenderedPage } from '../core/pdf/PageRenderer';
import { SentenceIndex } from '../core/sentences/SentenceIndex';
import { NavigationController, type NavigationState } from '../core/navigation/NavigationController';
import { KeyboardHandler } from '../core/navigation/KeyboardHandler';
import type { PageText } from '../core/types';
import { logger } from '../core/util/logger';

export interface ViewerElements {
  readonly pagesEl: HTMLElement;
  readonly statusEl: HTMLElement | null;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const PAGE_MARGIN = 32;

/**
 * Orchestrates the viewer: load the PDF, render every page, and extract
 * normalized page text. Later phases attach sentence indexing, navigation and
 * highlighting on top of the data collected here.
 */
export class ViewerApp {
  private doc: PDFDocumentProxy | undefined;
  readonly pages: RenderedPage[] = [];
  readonly pageTexts: PageText[] = [];
  sentenceIndex: SentenceIndex | undefined;
  private navigation: NavigationController | undefined;
  private keyboard: KeyboardHandler | undefined;

  constructor(private readonly elements: ViewerElements) {}

  async open(url: string): Promise<void> {
    this.setStatus('Loading PDF\u2026');
    this.doc = await loadPdf(url);

    const scale = await this.computeScale(this.doc);
    logger.info('rendering at scale', scale);

    for (let pageNumber = 1; pageNumber <= this.doc.numPages; pageNumber++) {
      const page = await this.doc.getPage(pageNumber);
      const content = await page.getTextContent();

      this.pageTexts.push(buildPageText(pageNumber, content));

      const rendered = await renderPage(page, scale, content);
      this.elements.pagesEl.appendChild(rendered.container);
      this.pages.push(rendered);

      // Release page-level resources; the rendered canvas/text layer remain.
      page.cleanup();
      this.setStatus(`Rendered page ${pageNumber} of ${this.doc.numPages}`);
    }

    const hasAnyText = this.pageTexts.some((p) => p.hasText);
    if (!hasAnyText) {
      this.setStatus('No selectable text found (this looks like a scanned PDF).');
      return;
    }

    this.sentenceIndex = SentenceIndex.build(this.pageTexts);
    this.enableNavigation(this.sentenceIndex.count);
  }

  private enableNavigation(total: number): void {
    this.navigation = new NavigationController(total);
    this.navigation.subscribe((state) => this.onNavigate(state));
    this.keyboard = new KeyboardHandler(this.navigation);
    this.keyboard.attach();
    this.showReady(total);
  }

  private onNavigate(state: NavigationState): void {
    // Highlight + scroll are attached in later phases; report progress for now.
    this.setStatus(`Sentence ${state.index + 1} of ${state.total}`);
    logger.debug('navigate', state);
  }

  private showReady(total: number): void {
    const pages = this.doc?.numPages ?? this.pages.length;
    this.setStatus(
      total > 0
        ? `${pages} page(s), ${total} sentence(s). Press Tab / Shift+Tab to navigate.`
        : `${pages} page(s). No sentences detected.`,
    );
  }

  /** Fit-to-width scale computed from the first page's intrinsic size. */
  private async computeScale(doc: PDFDocumentProxy): Promise<number> {
    const firstPage = await doc.getPage(1);
    const base = firstPage.getViewport({ scale: 1 });
    const available = this.elements.pagesEl.clientWidth - PAGE_MARGIN;
    const scale = available > 0 ? available / base.width : 1;
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
  }

  private setStatus(message: string): void {
    if (this.elements.statusEl) this.elements.statusEl.textContent = message;
  }

  destroy(): void {
    this.keyboard?.detach();
    this.keyboard = undefined;
    this.navigation = undefined;
    void this.doc?.destroy();
    this.doc = undefined;
    this.sentenceIndex = undefined;
    this.pages.length = 0;
    this.pageTexts.length = 0;
  }
}
