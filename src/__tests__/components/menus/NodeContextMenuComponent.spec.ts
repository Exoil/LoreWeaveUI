import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises, config } from '@vue/test-utils';
import { nextTick } from 'vue';
import NodeContextMenuComponent from '@/components/menus/NodeContextMenuComponent.vue';
import type { RpgAssistantService } from '@/services/RpgAssistantService';
import type { NodeEvent } from 'v-network-graph';

// The menu renders its dropdown through `<Teleport to="body">`. Stub the
// teleport so the content renders inline and stays queryable via `wrapper`.
config.global.stubs = { teleport: true };

function makeService(overrides: Partial<RpgAssistantService> = {}): RpgAssistantService {
  return {
    deleteCharacterAsync: vi.fn().mockResolvedValue(undefined),
    createKnowRelationBetweenCharacters: vi.fn().mockResolvedValue('rel-id'),
    ...overrides,
  } as unknown as RpgAssistantService;
}

function makeNodeEvent(nodeId = 'char-1', x = 100, y = 200): NodeEvent<MouseEvent> {
  return {
    node: nodeId,
    event: new MouseEvent('contextmenu', { clientX: x, clientY: y, bubbles: true }),
  } as unknown as NodeEvent<MouseEvent>;
}

function defaultProps(overrides = {}) {
  return {
    rpgAssistantService: makeService(),
    firstSelectedCharacterId: 'char-1',
    secondSelectedCharacterId: null,
    edgeIdSeparator: '_',
    ...overrides,
  };
}

type ExposedNodeMenu = {
  showNodeContextMenu: (p: NodeEvent<MouseEvent>) => void;
  hideMenu: () => void;
};

describe('NodeContextMenuComponent', () => {
  it('menu is hidden by default', () => {
    const wrapper = mount(NodeContextMenuComponent, { props: defaultProps() });

    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });

  it('showNodeContextMenu opens the menu at the click position', async () => {
    const wrapper = mount(NodeContextMenuComponent, { props: defaultProps() });

    (wrapper.vm as unknown as ExposedNodeMenu).showNodeContextMenu(
      makeNodeEvent('char-1', 80, 160),
    );
    await nextTick();

    expect(wrapper.find('.dropdown').classes()).toContain('is-active');
    const style = (wrapper.find('.dropdown').element as HTMLElement).style;
    expect(style.left).toBe('80px');
    expect(style.top).toBe('160px');
  });

  it('hideMenu closes the menu', async () => {
    const wrapper = mount(NodeContextMenuComponent, { props: defaultProps() });
    (wrapper.vm as unknown as ExposedNodeMenu).showNodeContextMenu(makeNodeEvent());
    await nextTick();

    (wrapper.vm as unknown as ExposedNodeMenu).hideMenu();
    await nextTick();

    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });

  it('Update character button emits openUpdateCharacterDialog', async () => {
    const wrapper = mount(NodeContextMenuComponent, { props: defaultProps() });
    (wrapper.vm as unknown as ExposedNodeMenu).showNodeContextMenu(makeNodeEvent());
    await nextTick();

    await wrapper.find('button.dropdown-item').trigger('click');

    expect(wrapper.emitted('openUpdateCharacterDialog')).toHaveLength(1);
  });

  it('Update character button closes the menu', async () => {
    const wrapper = mount(NodeContextMenuComponent, { props: defaultProps() });
    (wrapper.vm as unknown as ExposedNodeMenu).showNodeContextMenu(makeNodeEvent());
    await nextTick();

    await wrapper.find('button.dropdown-item').trigger('click');

    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });

  it('deleting a character emits deletedCharacterFromMenu', async () => {
    const wrapper = mount(NodeContextMenuComponent, { props: defaultProps() });
    (wrapper.vm as unknown as ExposedNodeMenu).showNodeContextMenu(makeNodeEvent());
    await nextTick();

    await wrapper.find('#delete-character-button').trigger('click');
    await flushPromises();

    expect(wrapper.emitted('deletedCharacterFromMenu')).toEqual([['char-1']]);
  });

  it('creating a know edge emits createKnowEdgeFromMenu', async () => {
    const wrapper = mount(NodeContextMenuComponent, {
      props: defaultProps({ secondSelectedCharacterId: 'char-2' }),
    });
    (wrapper.vm as unknown as ExposedNodeMenu).showNodeContextMenu(makeNodeEvent());
    await nextTick();

    await wrapper.find('#create-know-edge-button').trigger('click');
    await flushPromises();

    expect(wrapper.emitted('createKnowEdgeFromMenu')).toEqual([['char-1_char-2']]);
  });
});
