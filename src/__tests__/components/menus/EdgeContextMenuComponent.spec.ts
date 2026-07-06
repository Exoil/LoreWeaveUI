import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises, config } from '@vue/test-utils';
import { nextTick } from 'vue';
import EdgeContextMenuComponent from '@/components/menus/EdgeContextMenuComponent.vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import type { EdgeEvent } from 'v-network-graph';

// The menu renders its dropdown through `<Teleport to="body">`. Stub the
// teleport so the content renders inline and stays queryable via `wrapper`.
config.global.stubs = { teleport: true };

function makeService(overrides: Partial<LoreWeaveApiService> = {}): LoreWeaveApiService {
  return {
    deleteKnowRelationBetweenCharacters: vi.fn().mockResolvedValue(undefined),
    disconnectFactFromCharacterAsync: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as LoreWeaveApiService;
}

function defaultProps(overrides = {}) {
  return {
    loreWeaveApiService: makeService(),
    selectedEdgeId: 'char-1_char-2',
    edgeIdSeparator: '_',
    isFactEdge: false,
    isGameMaster: true,
    isEdgeHidden: false,
    ...overrides,
  };
}

function makeEdgeEvent(edgeId = 'char-1_char-2', x = 100, y = 200): EdgeEvent<MouseEvent> {
  return {
    edge: edgeId,
    event: new MouseEvent('contextmenu', { clientX: x, clientY: y, bubbles: true }),
  } as unknown as EdgeEvent<MouseEvent>;
}

type ExposedEdgeMenu = {
  showEdgeContextMenu: (p: EdgeEvent<MouseEvent>) => void;
  hideMenu: () => void;
};

describe('EdgeContextMenuComponent', () => {
  it('menu is hidden by default', () => {
    const wrapper = mount(EdgeContextMenuComponent, {
      props: defaultProps(),
    });

    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });

  it('showEdgeContextMenu opens the menu', async () => {
    const wrapper = mount(EdgeContextMenuComponent, {
      props: defaultProps(),
    });

    (wrapper.vm as unknown as ExposedEdgeMenu).showEdgeContextMenu(makeEdgeEvent());
    await nextTick();

    expect(wrapper.find('.dropdown').classes()).toContain('is-active');
  });

  it('hideMenu closes the menu', async () => {
    const wrapper = mount(EdgeContextMenuComponent, {
      props: defaultProps(),
    });
    (wrapper.vm as unknown as ExposedEdgeMenu).showEdgeContextMenu(makeEdgeEvent());
    await nextTick();

    (wrapper.vm as unknown as ExposedEdgeMenu).hideMenu();
    await nextTick();

    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });

  it('choosing update relation emits openUpdateKnowEdgeDialog and closes the menu', async () => {
    const wrapper = mount(EdgeContextMenuComponent, {
      props: defaultProps(),
    });
    (wrapper.vm as unknown as ExposedEdgeMenu).showEdgeContextMenu(makeEdgeEvent());
    await nextTick();

    await wrapper.find('#edge-context-update-button').trigger('click');

    expect(wrapper.emitted('openUpdateKnowEdgeDialog')).toHaveLength(1);
    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });

  it('update relation button is disabled when no edge is selected', () => {
    const wrapper = mount(EdgeContextMenuComponent, {
      props: defaultProps({ selectedEdgeId: undefined }),
    });

    const button = wrapper.find<HTMLButtonElement>('#edge-context-update-button');
    expect(button.element.disabled).toBe(true);
  });

  it('deleting an edge emits deleteKnowEdgeFromMenu and closes the menu', async () => {
    const service = makeService();
    const wrapper = mount(EdgeContextMenuComponent, {
      props: defaultProps({ loreWeaveApiService: service }),
    });
    (wrapper.vm as unknown as ExposedEdgeMenu).showEdgeContextMenu(makeEdgeEvent());
    await nextTick();

    await wrapper.find('#delete-know-edge-button').trigger('click');
    await flushPromises();

    expect(wrapper.emitted('deleteKnowEdgeFromMenu')).toEqual([['char-1_char-2']]);
    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });

  it('for a fact edge only the delete fact edge action is shown', async () => {
    const wrapper = mount(EdgeContextMenuComponent, {
      props: defaultProps({ selectedEdgeId: 'char-1_fact-1', isFactEdge: true }),
    });
    (wrapper.vm as unknown as ExposedEdgeMenu).showEdgeContextMenu(makeEdgeEvent('char-1_fact-1'));
    await nextTick();

    expect(wrapper.find('#edge-context-update-button').exists()).toBe(false);
    expect(wrapper.find('#delete-know-edge-button').exists()).toBe(false);
    expect(wrapper.find('#delete-fact-edge-button').exists()).toBe(true);
  });

  it('deleting a fact edge emits deleteFactEdgeFromMenu and closes the menu', async () => {
    const service = makeService();
    const wrapper = mount(EdgeContextMenuComponent, {
      props: defaultProps({
        loreWeaveApiService: service,
        selectedEdgeId: 'char-1_fact-1',
        isFactEdge: true,
      }),
    });
    (wrapper.vm as unknown as ExposedEdgeMenu).showEdgeContextMenu(makeEdgeEvent('char-1_fact-1'));
    await nextTick();

    await wrapper.find('#delete-fact-edge-button').trigger('click');
    await flushPromises();

    expect(service.disconnectFactFromCharacterAsync).toHaveBeenCalledWith(
      'char-1',
      'fact-1',
      expect.anything(),
    );
    expect(wrapper.emitted('deleteFactEdgeFromMenu')).toEqual([['char-1_fact-1']]);
    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });

  it('hide from players emits toggleEdgeVisibility and closes the menu', async () => {
    const wrapper = mount(EdgeContextMenuComponent, { props: defaultProps() });
    (wrapper.vm as unknown as ExposedEdgeMenu).showEdgeContextMenu(makeEdgeEvent());
    await nextTick();

    const button = wrapper.find('#edge-context-toggle-visibility-button');
    expect(button.text()).toBe('Hide from players');
    await button.trigger('click');

    expect(wrapper.emitted('toggleEdgeVisibility')).toHaveLength(1);
    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });

  it('a hidden edge offers "Show for players" instead', () => {
    const wrapper = mount(EdgeContextMenuComponent, {
      props: defaultProps({ isEdgeHidden: true }),
    });

    expect(wrapper.find('#edge-context-toggle-visibility-button').text()).toBe('Show for players');
  });

  it('the visibility toggle is also available for fact edges', () => {
    const wrapper = mount(EdgeContextMenuComponent, {
      props: defaultProps({ selectedEdgeId: 'char-1_fact-1', isFactEdge: true }),
    });

    expect(wrapper.find('#edge-context-toggle-visibility-button').exists()).toBe(true);
  });

  it('players do not get the visibility toggle at all', () => {
    const wrapper = mount(EdgeContextMenuComponent, {
      props: defaultProps({ isGameMaster: false }),
    });

    expect(wrapper.find('#edge-context-toggle-visibility-button').exists()).toBe(false);
  });

  it('does not open for players — every edge action is GM-only', async () => {
    const wrapper = mount(EdgeContextMenuComponent, {
      props: defaultProps({ isGameMaster: false }),
    });

    (wrapper.vm as unknown as ExposedEdgeMenu).showEdgeContextMenu(makeEdgeEvent());
    await nextTick();

    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });
});
