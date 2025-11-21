/**
 * Keyboard Shortcuts
 * Cross-platform key bindings and hotkey manager
 */

export type KeyCombo = string; // e.g., "Ctrl+S", "Cmd+Shift+P"
export type KeyHandler = (e: KeyboardEvent) => void;

export class KeyboardShortcuts {
  private bindings = new Map<string, KeyHandler>();
  private element: HTMLElement | Window;

  constructor(element: HTMLElement | Window = window) {
    this.element = element;
    this.element.addEventListener('keydown', this.handleKeyDown as EventListener);
  }

  bind(combo: KeyCombo, handler: KeyHandler): this {
    const normalized = this.normalizeCombo(combo);
    this.bindings.set(normalized, handler);
    return this;
  }

  unbind(combo: KeyCombo): this {
    const normalized = this.normalizeCombo(combo);
    this.bindings.delete(normalized);
    return this;
  }

  destroy(): void {
    this.element.removeEventListener('keydown', this.handleKeyDown as EventListener);
    this.bindings.clear();
  }

  private normalizeCombo(combo: string): string {
    return combo.toLowerCase().replace(/\s+/g, '');
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const combo = this.buildCombo(e);
    const handler = this.bindings.get(combo);
    if (handler) {
      e.preventDefault();
      handler(e);
    }
  };

  private buildCombo(e: KeyboardEvent): string {
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    parts.push(e.key.toLowerCase());
    return parts.join('+');
  }
}
