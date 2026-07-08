// Generates a small multi-page PDF with selectable text for manual testing.
// Pure Node, no dependencies. Run with: node scripts/generate-test-pdf.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'test');

const PAGES = [
  [
    'PDF Sentence Navigator test document.',
    'This is the first sentence on page one. Here is a second sentence!',
    'Does keyboard navigation work? It certainly should.',
    'A longer sentence spans several words to verify multi-line highlighting behaves as expected across the page.',
    'Dr. Smith paid $3.50 for item no. 4; tricky punctuation lives here.',
  ],
  [
    'Welcome to the second page of the sample file.',
    'Press Tab to advance and Shift+Tab to go back.',
    'The highlight should follow the active sentence and scroll it into view.',
    'This sentence continues to the next page to test cross-page',
  ],
  [
    'boundaries and confirm the highlight maps to both pages.',
    'Zooming with Ctrl and plus or minus must keep the highlight aligned.',
    'This is the final sentence of the document.',
  ],
];

function escapePdfText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildContentStream(lines) {
  const body = lines
    .map((line, i) => `${i === 0 ? '' : 'T* '}(${escapePdfText(line)}) Tj`)
    .join('\n');
  return `BT\n/F1 14 Tf\n72 760 Td\n18 TL\n${body}\nET`;
}

const objects = [];
function addObject(body) {
  objects.push(body);
  return objects.length; // 1-based object number
}

const fontObj = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
const pageObjNumbers = [];
const contentObjNumbers = [];
// Reserve the Pages object number so page objects can reference it.
const pagesObjNumber = objects.length + 1 + PAGES.length * 2 + 0 + 1;

for (const lines of PAGES) {
  const stream = buildContentStream(lines);
  const contentNum = addObject(
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  );
  contentObjNumbers.push(contentNum);
  const pageNum = addObject(
    `<< /Type /Page /Parent ${pagesObjNumber} 0 R /MediaBox [0 0 612 792] ` +
      `/Resources << /Font << /F1 ${fontObj} 0 R >> >> /Contents ${contentNum} 0 R >>`,
  );
  pageObjNumbers.push(pageNum);
}

const kids = pageObjNumbers.map((n) => `${n} 0 R`).join(' ');
const actualPagesNum = addObject(
  `<< /Type /Pages /Kids [${kids}] /Count ${pageObjNumbers.length} >>`,
);
const catalogNum = addObject(`<< /Type /Catalog /Pages ${actualPagesNum} 0 R >>`);

if (actualPagesNum !== pagesObjNumber) {
  // Keep the forward reference used by page objects consistent.
  for (const pageNum of pageObjNumbers) {
    objects[pageNum - 1] = objects[pageNum - 1].replace(
      `/Parent ${pagesObjNumber} 0 R`,
      `/Parent ${actualPagesNum} 0 R`,
    );
  }
}

let pdf = '%PDF-1.4\n';
const offsets = [];
objects.forEach((body, i) => {
  offsets[i] = pdf.length;
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
});

const xrefOffset = pdf.length;
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += '0000000000 65535 f \n';
for (const offset of offsets) {
  pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogNum} 0 R >>\n`;
pdf += `startxref\n${xrefOffset}\n%%EOF`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'sample.pdf'), pdf, 'latin1');
console.log(`wrote test/sample.pdf (${PAGES.length} pages)`);
