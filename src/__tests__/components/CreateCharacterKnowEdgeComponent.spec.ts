import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CreateCharacterKnowEdgeComponent from '@/components/CreateCharacterKnowEdgeComponent.vue';
import type { RpgAssistantService } from '@/services/RpgAssistantService';

function makeService(overrides: Partial<RpgAssistantService> = {}): RpgAssistantService {
  return {
    createKnowRelationBetweenCharacters: vi.fn().mockResolvedValue('rel-id'),
    ...overrides,
  } as unknown as RpgAssistantService;
}

describe('CreateCharacterKnowEdgeComponent', () => {
  it('button is disabled when both node ids are null', () => {
    const wrapper = mount(CreateCharacterKnowEdgeComponent, {
      props: {
        rpgAssistantService: makeService(),
        fromNodeId: null,
        targetNodeId: null,
        edgeIdSeparator: '_',
      },
    });

    const button = wrapper.find<HTMLButtonElement>('#create-know-edge-button');
    expect(button.element.disabled).toBe(true);
  });

  it('button is disabled when only fromNodeId is provided', () => {
    const wrapper = mount(CreateCharacterKnowEdgeComponent, {
      props: {
        rpgAssistantService: makeService(),
        fromNodeId: 'char-1',
        targetNodeId: null,
        edgeIdSeparator: '_',
      },
    });

    const button = wrapper.find<HTMLButtonElement>('#create-know-edge-button');
    expect(button.element.disabled).toBe(true);
  });

  it('button is disabled when only targetNodeId is provided', () => {
    const wrapper = mount(CreateCharacterKnowEdgeComponent, {
      props: {
        rpgAssistantService: makeService(),
        fromNodeId: null,
        targetNodeId: 'char-2',
        edgeIdSeparator: '_',
      },
    });

    const button = wrapper.find<HTMLButtonElement>('#create-know-edge-button');
    expect(button.element.disabled).toBe(true);
  });

  it('button is enabled when both node ids are provided', () => {
    const wrapper = mount(CreateCharacterKnowEdgeComponent, {
      props: {
        rpgAssistantService: makeService(),
        fromNodeId: 'char-1',
        targetNodeId: 'char-2',
        edgeIdSeparator: '_',
      },
    });

    const button = wrapper.find<HTMLButtonElement>('#create-know-edge-button');
    expect(button.element.disabled).toBe(false);
  });

  it('calls createKnowRelationBetweenCharacters with correct ids', async () => {
    const service = makeService();
    const wrapper = mount(CreateCharacterKnowEdgeComponent, {
      props: {
        rpgAssistantService: service,
        fromNodeId: 'char-1',
        targetNodeId: 'char-2',
        edgeIdSeparator: '_',
      },
    });

    await wrapper.find('#create-know-edge-button').trigger('click');
    await flushPromises();

    expect(service.createKnowRelationBetweenCharacters).toHaveBeenCalledWith(
      'char-1',
      'char-2',
      '',
      expect.anything(),
    );
  });

  it('emits createKnowEdge with the composite edge id', async () => {
    const wrapper = mount(CreateCharacterKnowEdgeComponent, {
      props: {
        rpgAssistantService: makeService(),
        fromNodeId: 'char-1',
        targetNodeId: 'char-2',
        edgeIdSeparator: '_',
      },
    });

    await wrapper.find('#create-know-edge-button').trigger('click');
    await flushPromises();

    expect(wrapper.emitted('createKnowEdge')).toEqual([['char-1_char-2']]);
  });
});
