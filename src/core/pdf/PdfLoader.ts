import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
// `?worker` makes Vite bundle the PDF.js worker with the correct module type
// and hand us a Worker constructor - the most reliable pattern for bundlers.
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import { logger } from '../util/logger';

let workerConfigured = false;

function configureWorker(): void {
  if (workerConfigured) return;
  pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();
  workerConfigured = true;
}

/**
 * Loads a PDF document from a URL.
 *
 * The bytes are fetched with the extension page's privileges (host
 * permissions cover cross-origin PDFs; file:// requires the user's
 * "Allow access to file URLs" toggle). Nothing is sent anywhere else.
 */
export async function loadPdf(url: string): Promise<PDFDocumentProxy> {
  configureWorker();

  const task = pdfjs.getDocument({
    url,
    // Security hardening: never evaluate embedded JS to build fonts.
    isEvalSupported: false,
  });

  const doc = await task.promise;
  logger.info('pdf loaded', { pages: doc.numPages });
  return doc;
}
