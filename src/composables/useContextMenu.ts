import { ref } from 'vue';

export function useContextMenu() {
  const menuEl = ref<HTMLDivElement>();
  const isOpen = ref(false);
  const pos = ref({ x: 0, y: 0 });
  let outsidePointerHandler: ((event: PointerEvent) => void) | null = null;

  function hideMenu() {
    isOpen.value = false;
    if (outsidePointerHandler) {
      document.removeEventListener('pointerdown', outsidePointerHandler, { capture: true });
      outsidePointerHandler = null;
    }
  }

  function showContextMenu(event: MouseEvent) {
    pos.value = { x: event.clientX, y: event.clientY };
    isOpen.value = true;

    if (outsidePointerHandler) {
      document.removeEventListener('pointerdown', outsidePointerHandler, { capture: true });
    }

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
