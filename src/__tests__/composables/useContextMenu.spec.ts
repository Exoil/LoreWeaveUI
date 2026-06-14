/**
 * useContextMenu composable tests.
 *
 * A composable in Vue is like a stateful utility class in C# — it encapsulates
 * reactive state and behaviour that multiple components can share.
 *
 * Here we call the composable directly (no component mounting needed) and
 * interact with the returned refs and functions.
 */
import { describe, it, expect } from 'vitest';
import { useContextMenu } from '@/composables/useContextMenu';

describe('useContextMenu', () => {
  it('starts with the menu closed', () => {
    const { isOpen } = useContextMenu();

    expect(isOpen.value).toBe(false);
  });

  it('starts with position at (0, 0)', () => {
    const { pos } = useContextMenu();

    expect(pos.value).toEqual({ x: 0, y: 0 });
  });

  it('showContextMenu opens the menu', () => {
    const { isOpen, showContextMenu } = useContextMenu();
    const event = new MouseEvent('contextmenu');

    showContextMenu(event);

    expect(isOpen.value).toBe(true);
  });

  it('showContextMenu records the click position', () => {
    const { pos, showContextMenu } = useContextMenu();
    const event = new MouseEvent('contextmenu', { clientX: 150, clientY: 300 });

    showContextMenu(event);

    expect(pos.value).toEqual({ x: 150, y: 300 });
  });

  it('hideMenu closes the menu', () => {
    const { isOpen, showContextMenu, hideMenu } = useContextMenu();
    showContextMenu(new MouseEvent('contextmenu'));

    hideMenu();

    expect(isOpen.value).toBe(false);
  });

  it('calling showContextMenu twice updates the position each time', () => {
    const { pos, showContextMenu } = useContextMenu();

    showContextMenu(new MouseEvent('contextmenu', { clientX: 10, clientY: 20 }));
    showContextMenu(new MouseEvent('contextmenu', { clientX: 50, clientY: 80 }));

    expect(pos.value).toEqual({ x: 50, y: 80 });
  });

  it('clicking outside the menu element closes it', () => {
    const { menuEl, isOpen, showContextMenu } = useContextMenu();

    // Attach a real element so the "outside" check has something to test against
    const menuDiv = document.createElement('div');
    menuEl.value = menuDiv;
    document.body.appendChild(menuDiv);

    showContextMenu(new MouseEvent('contextmenu'));
    expect(isOpen.value).toBe(true);

    // Dispatch a pointerdown on a different element (outside the menu)
    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);
    outsideEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(isOpen.value).toBe(false);

    document.body.removeChild(menuDiv);
    document.body.removeChild(outsideEl);
  });
});
