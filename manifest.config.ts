import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

/**
 * Manifest V3 definition.
 *
 * The extension replaces Chrome's sealed native PDF viewer with a bundled
 * PDF.js viewer so we can access the text layer, control keyboard input and
 * paint highlights. Everything runs locally: no host is contacted beyond the
 * origin that already serves the PDF.
 */
export default defineManifest({
  manifest_version: 3,
  name: 'PDF Sentence Navigator',
  version: pkg.version,
  description: pkg.description,
  // Intl.Segmenter, CSS Custom Highlight API and dynamic declarativeNetRequest
  // rules are all available well before this baseline.
  minimum_chrome_version: '116',

  icons: {
    '16': 'src/assets/icons/icon-16.png',
    '48': 'src/assets/icons/icon-48.png',
    '128': 'src/assets/icons/icon-128.png',
  },

  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },

  action: {
    default_popup: 'src/popup/popup.html',
    default_title: 'PDF Sentence Navigator',
    default_icon: {
      '16': 'src/assets/icons/icon-16.png',
      '48': 'src/assets/icons/icon-48.png',
      '128': 'src/assets/icons/icon-128.png',
    },
  },

  // `declarativeNetRequest` redirects PDF navigations to our viewer.
  // `storage` persists user preferences (e.g. enabled/disabled).
  permissions: ['declarativeNetRequest', 'storage'],

  // Needed to redirect PDFs on any site and to let the viewer fetch the
  // original bytes client-side. No network requests originate from the
  // extension itself.
  host_permissions: ['<all_urls>'],

  web_accessible_resources: [
    {
      resources: ['src/viewer/viewer.html', 'assets/*'],
      matches: ['<all_urls>'],
    },
  ],
});
