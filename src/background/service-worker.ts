import { logger } from '../core/util/logger';
import { isEnabled, ENABLED_STORAGE_KEY } from '../core/settings';
import { applyRedirectRules } from './pdfRedirect';

/**
 * Syncs the PDF redirect rule with the current enabled setting. Any failure is
 * logged loudly so it surfaces in the service-worker console.
 */
async function syncRules(): Promise<void> {
  try {
    const enabled = await isEnabled();
    await applyRedirectRules(enabled);
  } catch (error) {
    logger.error('failed to sync redirect rules', error);
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  logger.info('installed', details.reason);
  void syncRules();
});

chrome.runtime.onStartup.addListener(() => {
  logger.info('startup');
  void syncRules();
});

// Re-sync whenever the enabled toggle changes from the popup.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && ENABLED_STORAGE_KEY in changes) {
    void syncRules();
  }
});

// Run once on service-worker (re)spawn so the rule exists even if neither
// onInstalled nor onStartup fired this session.
void syncRules();
