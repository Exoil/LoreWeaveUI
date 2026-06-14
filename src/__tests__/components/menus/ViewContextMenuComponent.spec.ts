/**
 * Context menu component tests.
 *
 * defineExpose() makes internal methods available on the component instance,
 * similar to a public method on a C# class.
 *
 * wrapper.vm gives you the component instance so you can call those exposed methods.
 */
import { describe, it, expect } from 'vitest';
import { mount, config } from '@vue/test-utils';
import { nextTick } from 'vue';
import ViewContextMenuComponent from '@/components/menus/ViewContextMenuComponent.vue';
import type { ViewEvent } from 'v-network-graph';

// The menu renders its dropdown through `<Teleport to="body">`. Stub the
// teleport so the content renders inline and stays queryable via `wrapper`.
config.global.stubs = { teleport: true };

function makeViewEvent(x = 100, y = 200): ViewEvent<MouseEvent> {
  return {
    event: new MouseEvent('contextmenu', { clientX: x, clientY: y, bubbles: true }),
  } as unknown as ViewEvent<MouseEvent>;
}

describe('ViewContextMenuComponent', () => {
  it('menu is hidden by default', () => {
    const wrapper = mount(ViewContextMenuComponent);

    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });

  it('showViewContextMenu opens the menu at the click position', async () => {
    const wrapper = mount(ViewContextMenuComponent);

    (wrapper.vm as { showViewContextMenu: (p: ViewEvent<MouseEvent>) => void }).showViewContextMenu(
      makeViewEvent(150, 250),
    );
    await nextTick();

    expect(wrapper.find('.dropdown').classes()).toContain('is-active');
    const style = (wrapper.find('.dropdown').element as HTMLElement).style;
    expect(style.left).toBe('150px');
    expect(style.top).toBe('250px');
  });

  it('hideMenu closes the menu', async () => {
    const wrapper = mount(ViewContextMenuComponent);
    (wrapper.vm as { showViewContextMenu: (p: ViewEvent<MouseEvent>) => void }).showViewContextMenu(
      makeViewEvent(),
    );
    await nextTick();

    (wrapper.vm as { hideMenu: () => void }).hideMenu();
    await nextTick();

    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });

  it('clicking Create character emits openCreateCharacterDialog', async () => {
    const wrapper = mount(ViewContextMenuComponent);
    (wrapper.vm as { showViewContextMenu: (p: ViewEvent<MouseEvent>) => void }).showViewContextMenu(
      makeViewEvent(),
    );
    await nextTick();

    await wrapper.find('button.dropdown-item').trigger('click');

    expect(wrapper.emitted('openCreateCharacterDialog')).toHaveLength(1);
  });

  it('clicking Create character closes the menu', async () => {
    const wrapper = mount(ViewContextMenuComponent);
    (wrapper.vm as { showViewContextMenu: (p: ViewEvent<MouseEvent>) => void }).showViewContextMenu(
      makeViewEvent(),
    );
    await nextTick();

    await wrapper.find('button.dropdown-item').trigger('click');

    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });
});
