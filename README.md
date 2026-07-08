# PDF Sentence Navigator

A Google Chrome extension (Manifest V3) that lets you move through a PDF **one
sentence at a time** with the keyboard. Press <kbd>Tab</kbd> for the next
sentence and <kbd>Shift</kbd>+<kbd>Tab</kbd> for the previous one; the active
sentence is highlighted and scrolled into view.

Everything runs locally. No servers, no APIs, no text ever leaves your browser.

## Why a custom viewer?

Chrome renders PDFs with PDFium inside a sealed, closed shadow DOM. A content
script cannot read that text or paint over it, so precise sentence highlighting
and keyboard control are impossible in the native viewer. This extension instead
redirects PDF navigations to its own viewer built on
[PDF.js](https://mozilla.github.io/pdf.js/), where it has full access to the
text layer, geometry, key events and rendering.

## Features

- Sentence-by-sentence navigation with <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd>.
- Exactly one sentence highlighted at a time (CSS Custom Highlight API).
- Smooth auto-scroll to keep the active sentence in view.
- Sentences that cross a page break are highlighted on both pages.
- Zoom with <kbd>Ctrl</kbd> <kbd>+</kbd>/<kbd>-</kbd>/<kbd>0</kbd> or
  <kbd>Ctrl</kbd>+mouse wheel; highlight stays aligned.
- Works with local (`file://`) and web (`http(s)://`) PDFs.
- Fully local and private; the only network access is fetching the PDF itself.

## Technologies

- **TypeScript** (strict) and modern ES modules
- **PDF.js** (`pdfjs-dist`) for rendering and text extraction
- **Vite** + **@crxjs/vite-plugin** for the MV3 build
- **Intl.Segmenter** for local, punctuation-aware sentence detection
- **CSS Custom Highlight API** for DOM-free highlighting
- **declarativeNetRequest** to route PDFs to the viewer

## Installation

```bash
npm install
npm run build
```

The unpacked extension is written to `dist/`.

### Load in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the `dist/` folder.
4. (For local PDFs) open the extension's **Details** and enable
   **Allow access to file URLs**.

Open any `.pdf` link, or a `file:///...pdf`, and the sentence navigator loads.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Vite dev server (HMR) |
| `npm run build` | Type-check and build to `dist/` |
| `npm run typecheck` | Type-check only |
| `npm run icons` | Regenerate placeholder icons |

## Project structure

```
src/
  background/
    service-worker.ts     # declarativeNetRequest redirect + settings sync
    pdfRedirect.ts         # builds/applies the dynamic redirect rule
  viewer/
    viewer.html/.ts        # viewer entry
    ViewerApp.ts           # orchestrates load -> render -> index -> navigate
    styles.css
  popup/                   # toolbar popup (enable toggle, hints)
  core/
    pdf/
      PdfLoader.ts          # getDocument + worker setup
      PageRenderer.ts       # canvas + text layer per page
      TextExtractor.ts      # normalized text + item map
    sentences/
      SentenceSegmenter.ts  # Intl.Segmenter wrapper (+ regex fallback)
      SentenceIndex.ts      # document-global sentence list + spans
    navigation/
      NavigationController.ts
      KeyboardHandler.ts    # intercepts Tab / Shift+Tab
    highlight/
      RangeBuilder.ts       # char ranges -> DOM Ranges over spans
      Highlighter.ts        # CSS Custom Highlight API (+ overlay fallback)
      ScrollManager.ts
    util/                   # debounce, rects, url, logger
    types.ts
manifest.config.ts          # Manifest V3 (CRXJS)
scripts/                    # dependency-free icon + test-PDF generators
```

## How it works

1. The service worker installs a `declarativeNetRequest` rule that redirects
   `*.pdf` main-frame navigations to `viewer.html?file=<original-url>`.
2. The viewer loads the PDF with PDF.js and renders each page to a canvas with
   an overlaid, transparent text layer.
3. Page text is normalized once and segmented into sentences with
   `Intl.Segmenter`; each sentence keeps per-page character ranges.
4. <kbd>Tab</kbd> updates a clamped sentence index. The highlighter maps the
   sentence's ranges onto the live text-layer spans and paints them with the
   CSS Custom Highlight API, then scrolls them into view.

Text is extracted and segmented only once and cached; keypresses only move an
index. Zoom/resize re-render pages and rebuild only the highlight geometry, not
the sentence data.

## Known limitations

- **Detection is by `.pdf` extension.** PDFs served as `application/pdf` with no
  `.pdf` in the URL are not intercepted (MV3 `declarativeNetRequest` cannot match
  on response Content-Type).
- **Scanned / image-only PDFs** have no selectable text; navigation is disabled
  and the viewer says so (no OCR).
- **Standard-14-font PDFs** may log a `standardFontDataUrl` warning; glyph
  metrics use a fallback (highlighting stays aligned).
- `file://` support requires the user to enable "Allow access to file URLs".
- Very large PDFs render all pages eagerly (see below).

## Future improvements

- Page virtualization / lazy rendering for very large documents.
- Optional OCR for scanned PDFs.
- Bundled cMaps and standard fonts for perfect glyph fidelity.
- In-viewer controls (next/prev buttons, sentence counter, zoom UI).
- Per-language segmentation tuning.

## License

[MIT](LICENSE)
