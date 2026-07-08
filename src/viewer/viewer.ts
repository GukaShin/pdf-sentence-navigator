import './styles.css';
import { logger } from '../core/util/logger';

// Phase 1: scaffold only. Actual PDF loading/rendering arrives in Phase 3.
function bootstrap(): void {
  const status = document.getElementById('status');
  if (status) status.textContent = 'Viewer scaffold ready.';
  logger.info('viewer bootstrap');
}

bootstrap();
