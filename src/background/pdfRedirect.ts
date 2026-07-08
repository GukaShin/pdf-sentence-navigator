import { logger } from '../core/util/logger';

/**
 * Installs (or removes) the declarativeNetRequest rule that redirects PDF
 * navigations to our bundled viewer.
 *
 * We can't express the redirect as a static rule because the target contains
 * the extension's runtime ID (chrome-extension://<id>/...). Instead we build a
 * dynamic rule and use `regexSubstitution` to append the matched URL verbatim.
 *
 * Notes / limitations:
 * - Detection is by `.pdf` extension only. URLs served as application/pdf
 *   without a `.pdf` suffix are not caught (a known MV3 constraint, since DNR
 *   cannot match on response Content-Type).
 * - `file://` matching additionally requires the user to enable
 *   "Allow access to file URLs" for the extension.
 */
const REDIRECT_RULE_ID = 1;
const VIEWER_PATH = 'src/viewer/viewer.html';

// Chrome's DNR (RE2) rejects inline flags like `(?i)`, so case-insensitivity
// is handled via `isUrlFilterCaseSensitive: false` on the condition instead.
const PDF_URL_REGEX = '^(?:https?|file)://.+\\.pdf(?:[?#].*)?$';

function buildRedirectRule(): chrome.declarativeNetRequest.Rule {
  const viewerUrl = chrome.runtime.getURL(VIEWER_PATH);
  return {
    id: REDIRECT_RULE_ID,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: {
        // `\0` is the full matched request URL, appended unencoded.
        regexSubstitution: `${viewerUrl}?file=\\0`,
      },
    },
    condition: {
      regexFilter: PDF_URL_REGEX,
      isUrlFilterCaseSensitive: false,
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
    },
  };
}

/** Syncs the redirect rule with the desired enabled state (idempotent). */
export async function applyRedirectRules(enabled: boolean): Promise<void> {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((rule) => rule.id);
  const addRules = enabled ? [buildRedirectRule()] : [];

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  });

  const active = await chrome.declarativeNetRequest.getDynamicRules();
  logger.info('redirect rules synced', {
    enabled,
    removed: removeRuleIds.length,
    active: active.length,
    rules: active,
  });
}
