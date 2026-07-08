export interface NavigationState {
  /** Active sentence index, or -1 when nothing is selected yet. */
  readonly index: number;
  readonly total: number;
  readonly atStart: boolean;
  readonly atEnd: boolean;
}

export type NavigationListener = (state: NavigationState) => void;

/**
 * Holds the active sentence index and exposes clamped next/previous movement.
 * It is intentionally free of DOM concerns so it is trivial to reason about and
 * test; observers (highlighter, scroller, status bar) subscribe for changes.
 */
export class NavigationController {
  private index = -1;
  private readonly listeners = new Set<NavigationListener>();

  constructor(private readonly total: number) {}

  get state(): NavigationState {
    return {
      index: this.index,
      total: this.total,
      atStart: this.index <= 0,
      atEnd: this.total === 0 || this.index >= this.total - 1,
    };
  }

  /** Advances to the next sentence. Returns false if already at the end. */
  next(): boolean {
    if (this.total === 0) return false;
    const target = this.index < 0 ? 0 : Math.min(this.index + 1, this.total - 1);
    return this.commit(target);
  }

  /** Moves to the previous sentence. Returns false if already at the start. */
  previous(): boolean {
    if (this.total === 0 || this.index <= 0) return false;
    return this.commit(this.index - 1);
  }

  /** Jumps to an explicit index (clamped). Returns whether the index changed. */
  goTo(index: number): boolean {
    if (this.total === 0) return false;
    const target = Math.min(Math.max(index, 0), this.total - 1);
    return this.commit(target);
  }

  subscribe(listener: NavigationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private commit(target: number): boolean {
    if (target === this.index) return false;
    this.index = target;
    const snapshot = this.state;
    for (const listener of this.listeners) listener(snapshot);
    return true;
  }
}
