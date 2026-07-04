import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises, config } from '@vue/test-utils';
import { nextTick } from 'vue';
import FactNodeContextMenuComponent from '@/components/menus/FactNodeContextMenuComponent.vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import type { NodeEvent } from 'v-network-graph';

// The menu renders its dropdown through `<Teleport to="body">`. Stub the
// teleport so the content renders inline and stays queryable via `wrapper`.
config.global.stubs = { teleport: true };

function makeService(overrides: Partial<LoreWeaveApiService> = {}): LoreWeaveApiService {
  return {
    deleteFactAsync: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as LoreWeaveApiService;
}

function makeNodeEvent(nodeId = 'fact-1', x = 100, y = 200): NodeEvent<MouseEvent> {
  return {
    node: nodeId,
    event: new MouseEvent('contextmenu', { clientX: x, clientY: y, bubbles: true }),
  } as unknown as NodeEvent<MouseEvent>;
}

function defaultProps(overrides = {}) {
  return {
    loreWeaveApiService: makeService(),
    selectedFactId: 'fact-1',
    ...overrides,
  };
}

type ExposedFactMenu = {
  showFactNodeContextMenu: (p: NodeEvent<MouseEvent>) => void;
  hideMenu: () => void;
};

describe('FactNodeContextMenuComponent', () => {
  it('menu is hidden by default', () => {
    const wrapper = mount(FactNodeContextMenuComponent, { props: defaultProps() });

    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });

  it('showFactNodeContextMenu opens the menu at the click position', async () => {
    const wrapper = mount(FactNodeContextMenuComponent, { props: defaultProps() });

    (wrapper.vm as unknown as ExposedFactMenu).showFactNodeContextMenu(
      makeNodeEvent('fact-1', 80, 160),
    );
    await nextTick();

    expect(wrapper.find('.dropdown').classes()).toContain('is-active');
    const style = (wrapper.find('.dropdown').element as HTMLElement).style;
    expect(style.left).toBe('80px');
    expect(style.top).toBe('160px');
  });

  it('hideMenu closes the menu', async () => {
    const wrapper = mount(FactNodeContextMenuComponent, { props: defaultProps() });
    (wrapper.vm as unknown as ExposedFactMenu).showFactNodeContextMenu(makeNodeEvent());
    await nextTick();

    (wrapper.vm as unknown as ExposedFactMenu).hideMenu();
    await nextTick();

    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });

  it('choosing update fact emits openUpdateFactDialog and closes the menu', async () => {
    const wrapper = mount(FactNodeContextMenuComponent, { props: defaultProps() });
    (wrapper.vm as unknown as ExposedFactMenu).showFactNodeContextMenu(makeNodeEvent());
    await nextTick();

    await wrapper.find('#fact-context-update-button').trigger('click');

    expect(wrapper.emitted('openUpdateFactDialog')).toHaveLength(1);
    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });

  it('update fact button is disabled when no fact is selected', () => {
    const wrapper = mount(FactNodeContextMenuComponent, {
      props: defaultProps({ selectedFactId: null }),
    });

    const button = wrapper.find<HTMLButtonElement>('#fact-context-update-button');
    expect(button.element.disabled).toBe(true);
  });

  it('deleting a fact emits deletedFactFromMenu and closes the menu', async () => {
    const wrapper = mount(FactNodeContextMenuComponent, { props: defaultProps() });
    (wrapper.vm as unknown as ExposedFactMenu).showFactNodeContextMenu(makeNodeEvent());
    await nextTick();

    await wrapper.find('#delete-fact-button').trigger('click');
    await flushPromises();

    expect(wrapper.emitted('deletedFactFromMenu')).toEqual([['fact-1']]);
    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });
});
