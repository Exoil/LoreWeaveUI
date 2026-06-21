import { ref } from 'vue';

/**
 * Reusable open/close + positioning logic for a context-menu dropdown.
 *
 * Bind `menuEl` to the dropdown root and `pos` to its `left`/`top`. Calling
 * `showContextMenu(event)` positions the menu at the cursor, opens it, and
 * installs a one-shot "click outside to dismiss" listener.
 *
 * @returns `menuEl` (template ref), `isOpen`, `pos`, and `showContextMenu` /
 *   `hideMenu` controls.
 */
export function useContextMenu() {
  const menuEl = ref<HTMLDivElement>();
  const isOpen = ref(false);
  const pos = ref({ x: 0, y: 0 });
  // Active outside-click listener while the menu is open; null when closed.
  let outsidePointerHandler: ((event: PointerEvent) => void) | null = null;

  /** Close the menu and detach the outside-click listener. */
  function hideMenu() {
    isOpen.value = false;
    if (outsidePointerHandler) {
      document.removeEventListener('pointerdown', outsidePointerHandler, { capture: true });
      outsidePointerHandler = null;
    }
  }

  /** Open the menu at the event's cursor position and arm outside-click dismissal. */
  function showContextMenu(event: MouseEvent) {
    pos.value = { x: event.clientX, y: event.clientY };
    isOpen.value = true;

    if (outsidePointerHandler) {
      document.removeEventListener('pointerdown', outsidePointerHandler, { capture: true });
    }

    // Capture phase so a click anywhere closes the menu before that click's own
    // handler runs (e.g. clicking another node shouldn't leave this menu open).
    outsidePointerHandler = (e: PointerEvent) => {
      const el = menuEl.value;
      if (!el) return;
      if (!e.target || !el.contains(e.target as Node)) hideMenu();
    };

    document.addEventListener('pointerdown', outsidePointerHandler, {
      passive: true,
      capture: true,
    });
  }

  return { menuEl, isOpen, pos, showContextMenu, hideMenu };
}
