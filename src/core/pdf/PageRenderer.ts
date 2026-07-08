import { TextLayer } from 'pdfjs-dist';
import type { PDFPageProxy, PageViewport } from 'pdfjs-dist';
import type { TextContent } from 'pdfjs-dist/types/src/display/api';

export interface RenderedPage {
  readonly pageNumber: number;
  /** Wrapper positioned in the page flow; holds canvas + text layer. */
  readonly container: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly textLayerDiv: HTMLElement;
  readonly textLayer: TextLayer;
  viewport: PageViewport;
  /** One span per text item, index-aligned with TextItemRef.itemIndex. */
  spans: readonly HTMLElement[];
}

/**
 * Renders a single page: the raster canvas plus an overlaid, transparent text
 * layer whose spans we later use to compute highlight geometry.
 *
 * `content` is passed in (rather than fetched here) so the caller can reuse the
 * same TextContent for sentence extraction, avoiding a second parse.
 */
export async function renderPage(
  page: PDFPageProxy,
  scale: number,
  content: TextContent,
): Promise<RenderedPage> {
  const viewport = page.getViewport({ scale });

  const container = document.createElement('section');
  container.className = 'page';
  container.dataset['pageNumber'] = String(page.pageNumber);
  // Required by PDF.js text layer positioning.
  container.style.setProperty('--scale-factor', String(scale));
  container.style.width = `${Math.floor(viewport.width)}px`;
  container.style.height = `${Math.floor(viewport.height)}px`;

  const canvas = document.createElement('canvas');
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');

  const textLayerDiv = document.createElement('div');
  textLayerDiv.className = 'textLayer';
  container.appendChild(textLayerDiv);

  await page.render({
    canvasContext: ctx,
    viewport,
    transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
  }).promise;

  const textLayer = new TextLayer({
    textContentSource: content,
    container: textLayerDiv,
    viewport,
  });
  await textLayer.render();

  return {
    pageNumber: page.pageNumber,
    container,
    canvas,
    textLayerDiv,
    textLayer,
    viewport,
    spans: textLayer.textDivs,
  };
}
