import { unionRects } from '../util/rects';

/** Fraction of the viewport height kept as breathing room above/below. */
const MARGIN_RATIO = 0.15;

/**
 * Keeps the active sentence comfortably in view. If a sentence is already
 * fully visible it does nothing (avoids jitter while reading); otherwise it
 * smoothly scrolls the sentence toward the vertical center.
 */
export class ScrollManager {
  scrollToRanges(ranges: readonly Range[]): void {
    const rect = unionRects(ranges.map((range) => range.getBoundingClientRect()));
    if (!rect) return;

    const viewportHeight = window.innerHeight;
    const margin = viewportHeight * MARGIN_RATIO;
    const fullyVisible = rect.top >= margin && rect.bottom <= viewportHeight - margin;
    if (fullyVisible) return;

    const centerOffset = viewportHeight / 2 - rect.height / 2;
    const targetY = window.scrollY + rect.top - Math.max(margin, centerOffset);
    window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
  }
}
