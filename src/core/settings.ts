/**
 * Persisted user preferences (chrome.storage.local). Currently just an on/off
 * switch controlling whether PDFs are redirected to our viewer.
 */
const ENABLED_KEY = 'enabled';

export async function isEnabled(): Promise<boolean> {
  const stored = await chrome.storage.local.get(ENABLED_KEY);
  // Default on: the extension is opt-out.
  return stored[ENABLED_KEY] !== false;
}

export async function setEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [ENABLED_KEY]: enabled });
}

export const ENABLED_STORAGE_KEY = ENABLED_KEY;
