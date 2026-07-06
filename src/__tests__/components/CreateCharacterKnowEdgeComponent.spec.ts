import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CreateCharacterKnowEdgeComponent from '@/components/CreateCharacterKnowEdgeComponent.vue';
import { KnowEdge } from '@/models/KnowEdge';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';

function makeService(overrides: Partial<LoreWeaveApiService> = {}): LoreWeaveApiService {
  return {
    createKnowRelationBetweenCharacters: vi.fn().mockResolvedValue('rel-id'),
    ...overrides,
  } as unknown as LoreWeaveApiService;
}

function mountComponent(
  service: LoreWeaveApiService,
  props: { fromNodeId: string | null; targetNodeId: string | null } = {
    fromNodeId: 'char-1',
    targetNodeId: 'char-2',
  },
) {
  return mount(CreateCharacterKnowEdgeComponent, {
    props: { open: true, loreWeaveApiService: service, ...props },
  });
}

describe('CreateCharacterKnowEdgeComponent', () => {
  it('create button is disabled when a node id is missing', () => {
    const wrapper = mountComponent(makeService(), { fromNodeId: 'char-1', targetNodeId: null });

    const button = wrapper.find<HTMLButtonElement>('#create-know-edge-button');
    expect(button.element.disabled).toBe(true);
  });

  it('blocks descriptions over the contract limit (256)', async () => {
    const service = makeService();
    const wrapper = mountComponent(service);
    const button = wrapper.find<HTMLButtonElement>('#create-know-edge-button');

    await wrapper.find('#create-know-edge-description-input').setValue('d'.repeat(257));
    expect(button.element.disabled).toBe(true);
    await button.trigger('click');
    expect(service.createKnowRelationBetweenCharacters).not.toHaveBeenCalled();

    await wrapper.find('#create-know-edge-description-input').setValue('d'.repeat(256));
    expect(button.element.disabled).toBe(false);
  });

  it('defaults to a strong relation with an empty description', async () => {
    const service = makeService();
    const wrapper = mountComponent(service);

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
    const wrapper = mountComponent(service);

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

  it('emits createKnowEdge with the relation data and closes the modal', async () => {
    const wrapper = mountComponent(makeService());

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

    expect(wrapper.emitted('update:open')!.at(-1)).toEqual([false]);
  });

  it('resets the form each time the modal is reopened', async () => {
    const wrapper = mountComponent(makeService());

    await wrapper.find('#create-know-edge-description-input').setValue('stale text');
    await wrapper.find('#create-know-edge-strong-checkbox').setValue(false);

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });

    const input = wrapper.find<HTMLInputElement>('#create-know-edge-description-input');
    const checkbox = wrapper.find<HTMLInputElement>('#create-know-edge-strong-checkbox');
    expect(input.element.value).toBe('');
    expect(checkbox.element.checked).toBe(true);
  });
});
