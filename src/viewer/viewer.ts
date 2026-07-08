import './styles.css';
import { ViewerApp } from './ViewerApp';
import { getFileParam } from '../core/util/url';
import { logger } from '../core/util/logger';

async function bootstrap(): Promise<void> {
  const statusEl = document.getElementById('status');
  const pagesEl = document.getElementById('pages');
  const fileUrl = getFileParam(location.search);

  if (!pagesEl) {
    logger.error('viewer markup missing #pages');
    return;
  }

  if (!fileUrl) {
    if (statusEl) statusEl.textContent = 'No PDF specified.';
    logger.warn('viewer opened without a file parameter');
    return;
  }

  document.title = deriveTitle(fileUrl);

  const app = new ViewerApp({ pagesEl, statusEl });
  try {
    await app.open(fileUrl);
  } catch (err) {
    logger.error('failed to open pdf', err);
    if (statusEl) statusEl.textContent = 'Failed to load this PDF.';
  }
}

function deriveTitle(url: string): string {
  try {
    const withoutQuery = url.split(/[?#]/, 1)[0] ?? url;
    const name = withoutQuery.split('/').pop();
    return name ? decodeURIComponent(name) : 'PDF Sentence Navigator';
  } catch {
    return 'PDF Sentence Navigator';
  }
}

void bootstrap();
