/** Returns the smallest rectangle covering all inputs, or null if empty. */
export function unionRects(rects: readonly DOMRect[]): DOMRect | null {
  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const rect of rects) {
    if (rect.width === 0 && rect.height === 0) continue;
    top = Math.min(top, rect.top);
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }

  if (!Number.isFinite(top)) return null;
  return new DOMRect(left, top, right - left, bottom - top);
}
