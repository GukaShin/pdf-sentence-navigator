# Manual Test Checklist

Build first: `npm run build`, then load `dist/` as an unpacked extension
(`chrome://extensions` -> Developer mode -> Load unpacked). Enable
"Allow access to file URLs" on the extension's details page to test local PDFs.

A sample document is generated at `test/sample.pdf`
(`npm run test:pdf`). Open it via `file:///.../test/sample.pdf` or drag it into
a tab.

## Core navigation

- [ ] Opening a `.pdf` URL loads the custom viewer (not Chrome's native one).
- [ ] `Tab` moves to the next sentence; the highlight advances.
- [ ] `Shift+Tab` moves to the previous sentence.
- [ ] The browser's default Tab focus traversal is suppressed.
- [ ] Exactly one sentence is highlighted at a time.
- [ ] `Tab` at the last sentence does nothing (no wrap, no error).
- [ ] `Shift+Tab` at the first sentence does nothing.
- [ ] The active sentence auto-scrolls into view when off-screen.
- [ ] A sentence spanning a page break highlights on both pages.

## Zoom and resize

- [ ] `Ctrl` + `+` / `-` zooms; the highlight stays aligned to its sentence.
- [ ] `Ctrl` + `0` refits to width.
- [ ] `Ctrl` + mouse wheel zooms.
- [ ] Resizing the window refits and keeps the highlight aligned.

## Edge cases

- [ ] Scanned / image-only PDF: viewer reports "no selectable text"; no errors.
- [ ] Empty pages are skipped in the sentence sequence.
- [ ] Rotated pages render upright and highlight correctly.
- [ ] Unusual punctuation (abbreviations, prices) does not crash segmentation.
- [ ] Large PDF (many pages) remains responsive when navigating.

## Privacy

- [ ] Network tab shows no requests other than fetching the PDF itself.
