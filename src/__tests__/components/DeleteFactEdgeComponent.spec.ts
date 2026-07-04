import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import DeleteFactEdgeComponent from '@/components/DeleteFactEdgeComponent.vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';

function makeService(overrides: Partial<LoreWeaveApiService> = {}): LoreWeaveApiService {
  return {
    disconnectFactFromCharacterAsync: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as LoreWeaveApiService;
}

describe('DeleteFactEdgeComponent', () => {
  it('renders the Delete fact edge button', () => {
    const wrapper = mount(DeleteFactEdgeComponent, {
      props: {
        loreWeaveApiService: makeService(),
        edgeId: 'char-1_fact-1',
        edgeIdSeparator: '_',
      },
    });

    expect(wrapper.find('#delete-fact-edge-button').exists()).toBe(true);
  });

  it('parses the edge id and calls the service with character and fact ids', async () => {
    const service = makeService();
    const wrapper = mount(DeleteFactEdgeComponent, {
      props: {
        loreWeaveApiService: service,
        edgeId: 'char-1_fact-1',
        edgeIdSeparator: '_',
      },
    });

    await wrapper.find('#delete-fact-edge-button').trigger('click');
    await flushPromises();

    expect(service.disconnectFactFromCharacterAsync).toHaveBeenCalledWith(
      'char-1',
      'fact-1',
      expect.anything(),
    );
  });

  it('emits deletedFactEdge with the full edge id', async () => {
    const wrapper = mount(DeleteFactEdgeComponent, {
      props: {
        loreWeaveApiService: makeService(),
        edgeId: 'char-1_fact-1',
        edgeIdSeparator: '_',
      },
    });

    await wrapper.find('#delete-fact-edge-button').trigger('click');
    await flushPromises();

    expect(wrapper.emitted('deletedFactEdge')).toEqual([['char-1_fact-1']]);
  });

  it('does nothing when edgeId is undefined', async () => {
    const service = makeService();
    const wrapper = mount(DeleteFactEdgeComponent, {
      props: {
        loreWeaveApiService: service,
        edgeId: undefined,
        edgeIdSeparator: '_',
      },
    });

    await wrapper.find('#delete-fact-edge-button').trigger('click');
    await flushPromises();

    expect(service.disconnectFactFromCharacterAsync).not.toHaveBeenCalled();
  });
});
