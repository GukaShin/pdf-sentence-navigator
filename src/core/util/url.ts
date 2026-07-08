/**
 * Extracts the original PDF URL from the viewer's query string.
 *
 * The redirect rule appends the matched URL verbatim after `file=`, e.g.
 * `viewer.html?file=https://host/a.pdf?token=x`. Because that value can itself
 * contain `?`, `&` and `=`, we take the entire remainder after `file=` rather
 * than parsing with URLSearchParams. The value is already a valid URL string,
 * so it is returned as-is (no decoding).
 */
export function getFileParam(search: string): string | null {
  const marker = 'file=';
  const idx = search.indexOf(marker);
  if (idx === -1) return null;
  const raw = search.slice(idx + marker.length);
  return raw.length > 0 ? raw : null;
}

/** True when a URL points at something we can treat as a PDF by extension. */
export function looksLikePdfUrl(url: string): boolean {
  return /^(?:https?|file):\/\/.+\.pdf(?:[?#].*)?$/i.test(url);
}
