import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import DeleteFactComponent from '@/components/DeleteFactComponent.vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';

function makeService(overrides: Partial<LoreWeaveApiService> = {}): LoreWeaveApiService {
  return {
    deleteFactAsync: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as LoreWeaveApiService;
}

describe('DeleteFactComponent', () => {
  it('renders the Delete fact button', () => {
    const wrapper = mount(DeleteFactComponent, {
      props: {
        loreWeaveApiService: makeService(),
        factId: 'fact-1',
      },
    });

    expect(wrapper.find('#delete-fact-button').exists()).toBe(true);
  });

  it('button is disabled when there is no fact id', () => {
    const wrapper = mount(DeleteFactComponent, {
      props: {
        loreWeaveApiService: makeService(),
        factId: null,
      },
    });

    const button = wrapper.find<HTMLButtonElement>('#delete-fact-button');
    expect(button.element.disabled).toBe(true);
  });

  it('calls the service and emits deletedFact with the fact id', async () => {
    const service = makeService();
    const wrapper = mount(DeleteFactComponent, {
      props: {
        loreWeaveApiService: service,
        factId: 'fact-1',
      },
    });

    await wrapper.find('#delete-fact-button').trigger('click');
    await flushPromises();

    expect(service.deleteFactAsync).toHaveBeenCalledWith('fact-1', expect.anything());
    expect(wrapper.emitted('deletedFact')).toEqual([['fact-1']]);
  });

  it('does nothing when factId is null', async () => {
    const service = makeService();
    const wrapper = mount(DeleteFactComponent, {
      props: {
        loreWeaveApiService: service,
        factId: null,
      },
    });

    await wrapper.find('#delete-fact-button').trigger('click');
    await flushPromises();

    expect(service.deleteFactAsync).not.toHaveBeenCalled();
    expect(wrapper.emitted('deletedFact')).toBeUndefined();
  });
});
