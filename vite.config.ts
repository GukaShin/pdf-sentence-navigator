import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    target: 'es2022',
    // Keep readable output; the code is small and this aids review/debugging.
    minify: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        viewer: 'src/viewer/viewer.html',
        popup: 'src/popup/popup.html',
      },
    },
  },
  // Some Chrome extension pages are served from chrome-extension:// origins;
  // fixed HMR port avoids clashes during development.
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
});
