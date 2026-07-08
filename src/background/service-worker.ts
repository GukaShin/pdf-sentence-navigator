import { logger } from '../core/util/logger';

// Phase 1: scaffold only. PDF detection and declarativeNetRequest redirect
// rules are added in Phase 2.
chrome.runtime.onInstalled.addListener((details) => {
  logger.info('installed', details.reason);
});
