import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CreateCharacterKnowEdgeComponent from '@/components/CreateCharacterKnowEdgeComponent.vue';
import { KnowEdge } from '@/models/KnowEdge';
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
      },
    });

    const button = wrapper.find<HTMLButtonElement>('#create-know-edge-button');
    expect(button.element.disabled).toBe(false);
  });

  it('defaults to a strong relation with an empty description', async () => {
    const service = makeService();
    const wrapper = mount(CreateCharacterKnowEdgeComponent, {
      props: {
        rpgAssistantService: service,
        fromNodeId: 'char-1',
        targetNodeId: 'char-2',
      },
    });

    await wrapper.find('#create-know-edge-button').trigger('click');
    await flushPromises();

    expect(service.createKnowRelationBetweenCharacters).toHaveBeenCalledWith(
      'char-1',
      'char-2',
      '',
      true,
      expect.anything(),
    );
  });

  it('passes the description and the weak relation flag to the service', async () => {
    const service = makeService();
    const wrapper = mount(CreateCharacterKnowEdgeComponent, {
      props: {
        rpgAssistantService: service,
        fromNodeId: 'char-1',
        targetNodeId: 'char-2',
      },
    });

    await wrapper.find('#create-know-edge-description-input').setValue('childhood friends');
    await wrapper.find('#create-know-edge-strong-checkbox').setValue(false);
    await wrapper.find('#create-know-edge-button').trigger('click');
    await flushPromises();

    expect(service.createKnowRelationBetweenCharacters).toHaveBeenCalledWith(
      'char-1',
      'char-2',
      'childhood friends',
      false,
      expect.anything(),
    );
  });

  it('emits createKnowEdge carrying source, target, description and strength', async () => {
    const wrapper = mount(CreateCharacterKnowEdgeComponent, {
      props: {
        rpgAssistantService: makeService(),
        fromNodeId: 'char-1',
        targetNodeId: 'char-2',
      },
    });

    await wrapper.find('#create-know-edge-description-input').setValue('rivals');
    await wrapper.find('#create-know-edge-button').trigger('click');
    await flushPromises();

    const emitted = wrapper.emitted('createKnowEdge');
    expect(emitted).toHaveLength(1);
    const edge = emitted![0]![0] as KnowEdge;
    expect(edge.source).toBe('char-1');
    expect(edge.target).toBe('char-2');
    expect(edge.description).toBe('rivals');
    expect(edge.isStrongRelation).toBe(true);
  });
});
