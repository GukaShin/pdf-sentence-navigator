import type { NavigationController } from './NavigationController';

/** True for elements that should keep native Tab behavior (form fields). */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

/**
 * Intercepts Tab / Shift+Tab and routes them to the navigation controller,
 * suppressing the browser's default focus traversal. Listens in the capture
 * phase so nothing else consumes the key first.
 */
export class KeyboardHandler {
  private readonly onKeyDown = (event: Event): void => {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.key !== 'Tab' || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (isEditableTarget(event.target)) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.shiftKey) {
      this.controller.previous();
    } else {
      this.controller.next();
    }
  };

  constructor(
    private readonly controller: NavigationController,
    private readonly target: EventTarget = window,
  ) {}

  attach(): void {
    this.target.addEventListener('keydown', this.onKeyDown, { capture: true });
  }

  detach(): void {
    this.target.removeEventListener('keydown', this.onKeyDown, { capture: true });
  }
}
