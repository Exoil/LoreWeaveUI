import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises, config } from '@vue/test-utils';
import { nextTick } from 'vue';
import EdgeContextMenuComponent from '@/components/menus/EdgeContextMenuComponent.vue';
import type { RpgAssistantService } from '@/services/RpgAssistantService';
import type { EdgeEvent } from 'v-network-graph';

// The menu renders its dropdown through `<Teleport to="body">`. Stub the
// teleport so the content renders inline and stays queryable via `wrapper`.
config.global.stubs = { teleport: true };

function makeService(overrides: Partial<RpgAssistantService> = {}): RpgAssistantService {
  return {
    deleteKnowRelationBetweenCharacters: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as RpgAssistantService;
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
      props: {
        rpgAssistantService: makeService(),
        selectedEdgeId: 'char-1_char-2',
        edgeIdSeparator: '_',
      },
    });

    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });

  it('showEdgeContextMenu opens the menu', async () => {
    const wrapper = mount(EdgeContextMenuComponent, {
      props: {
        rpgAssistantService: makeService(),
        selectedEdgeId: 'char-1_char-2',
        edgeIdSeparator: '_',
      },
    });

    (wrapper.vm as unknown as ExposedEdgeMenu).showEdgeContextMenu(makeEdgeEvent());
    await nextTick();

    expect(wrapper.find('.dropdown').classes()).toContain('is-active');
  });

  it('hideMenu closes the menu', async () => {
    const wrapper = mount(EdgeContextMenuComponent, {
      props: {
        rpgAssistantService: makeService(),
        selectedEdgeId: 'char-1_char-2',
        edgeIdSeparator: '_',
      },
    });
    (wrapper.vm as unknown as ExposedEdgeMenu).showEdgeContextMenu(makeEdgeEvent());
    await nextTick();

    (wrapper.vm as unknown as ExposedEdgeMenu).hideMenu();
    await nextTick();

    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });

  it('choosing update relation emits openUpdateKnowEdgeDialog and closes the menu', async () => {
    const wrapper = mount(EdgeContextMenuComponent, {
      props: {
        rpgAssistantService: makeService(),
        selectedEdgeId: 'char-1_char-2',
        edgeIdSeparator: '_',
      },
    });
    (wrapper.vm as unknown as ExposedEdgeMenu).showEdgeContextMenu(makeEdgeEvent());
    await nextTick();

    await wrapper.find('#edge-context-update-button').trigger('click');

    expect(wrapper.emitted('openUpdateKnowEdgeDialog')).toHaveLength(1);
    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });

  it('update relation button is disabled when no edge is selected', () => {
    const wrapper = mount(EdgeContextMenuComponent, {
      props: {
        rpgAssistantService: makeService(),
        selectedEdgeId: undefined,
        edgeIdSeparator: '_',
      },
    });

    const button = wrapper.find<HTMLButtonElement>('#edge-context-update-button');
    expect(button.element.disabled).toBe(true);
  });

  it('deleting an edge emits deleteKnowEdgeFromMenu and closes the menu', async () => {
    const service = makeService();
    const wrapper = mount(EdgeContextMenuComponent, {
      props: {
        rpgAssistantService: service,
        selectedEdgeId: 'char-1_char-2',
        edgeIdSeparator: '_',
      },
    });
    (wrapper.vm as unknown as ExposedEdgeMenu).showEdgeContextMenu(makeEdgeEvent());
    await nextTick();

    await wrapper.find('#delete-know-edge-button').trigger('click');
    await flushPromises();

    expect(wrapper.emitted('deleteKnowEdgeFromMenu')).toEqual([['char-1_char-2']]);
    expect(wrapper.find('.dropdown').classes()).not.toContain('is-active');
  });
});
