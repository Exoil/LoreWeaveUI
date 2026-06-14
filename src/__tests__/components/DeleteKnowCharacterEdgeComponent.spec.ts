import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import DeleteKnowCharacterEdgeComponent from '@/components/DeleteKnowCharacterEdgeComponent.vue';
import type { RpgAssistantService } from '@/services/RpgAssistantService';

function makeService(overrides: Partial<RpgAssistantService> = {}): RpgAssistantService {
  return {
    deleteKnowRelationBetweenCharacters: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as RpgAssistantService;
}

describe('DeleteKnowCharacterEdgeComponent', () => {
  it('renders the Delete know edge button', () => {
    const wrapper = mount(DeleteKnowCharacterEdgeComponent, {
      props: {
        rpgAssistantService: makeService(),
        edgeId: 'char-1_char-2',
        edgeIdSeparator: '_',
      },
    });

    expect(wrapper.find('#delete-know-edge-button').exists()).toBe(true);
  });

  it('parses the edge id and calls the service with both character ids', async () => {
    const service = makeService();
    const wrapper = mount(DeleteKnowCharacterEdgeComponent, {
      props: {
        rpgAssistantService: service,
        edgeId: 'char-1_char-2',
        edgeIdSeparator: '_',
      },
    });

    await wrapper.find('#delete-know-edge-button').trigger('click');
    await flushPromises();

    expect(service.deleteKnowRelationBetweenCharacters).toHaveBeenCalledWith(
      'char-1',
      'char-2',
      expect.anything(),
    );
  });

  it('emits deletedKnowEdge with the full edge id', async () => {
    const wrapper = mount(DeleteKnowCharacterEdgeComponent, {
      props: {
        rpgAssistantService: makeService(),
        edgeId: 'char-1_char-2',
        edgeIdSeparator: '_',
      },
    });

    await wrapper.find('#delete-know-edge-button').trigger('click');
    await flushPromises();

    expect(wrapper.emitted('deletedKnowEdge')).toEqual([['char-1_char-2']]);
  });

  it('does nothing when edgeId is undefined', async () => {
    const service = makeService();
    const wrapper = mount(DeleteKnowCharacterEdgeComponent, {
      props: {
        rpgAssistantService: service,
        edgeId: undefined,
        edgeIdSeparator: '_',
      },
    });

    await wrapper.find('#delete-know-edge-button').trigger('click');
    await flushPromises();

    expect(service.deleteKnowRelationBetweenCharacters).not.toHaveBeenCalled();
  });
});
