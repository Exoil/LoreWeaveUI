import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import UpdateFactComponent from '@/components/UpdateFactComponent.vue';
import { VersionedFact } from '@/services/Models/VersionedFact';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';

function makeService(overrides: Partial<LoreWeaveApiService> = {}): LoreWeaveApiService {
  return {
    getFactAsync: vi
      .fn()
      .mockResolvedValue(new VersionedFact('fact-1', 'Old title', 'Old content', '2')),
    updateFactAsync: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as LoreWeaveApiService;
}

function mountComponent(service: LoreWeaveApiService) {
  return mount(UpdateFactComponent, {
    props: {
      open: false,
      loreWeaveApiService: service,
      factId: 'fact-1',
    },
  });
}

describe('UpdateFactComponent', () => {
  it('loads the fact and prefills the form when opened', async () => {
    const service = makeService();
    const wrapper = mountComponent(service);

    await wrapper.setProps({ open: true });
    await flushPromises();

    expect(service.getFactAsync).toHaveBeenCalledWith('fact-1', expect.anything());
    const title = wrapper.find<HTMLInputElement>('#update-fact-title-input');
    expect(title.element.value).toBe('Old title');
    const content = wrapper.find<HTMLTextAreaElement>('#update-fact-content-input');
    expect(content.element.value).toBe('Old content');
  });

  it('does not load when the fact id is missing', async () => {
    const service = makeService();
    const wrapper = mount(UpdateFactComponent, {
      props: {
        open: false,
        loreWeaveApiService: service,
        factId: null,
      },
    });

    await wrapper.setProps({ open: true });
    await flushPromises();

    expect(service.getFactAsync).not.toHaveBeenCalled();
  });

  it('updates the fact with the edited values, including the loaded version', async () => {
    const service = makeService();
    const wrapper = mountComponent(service);
    await wrapper.setProps({ open: true });
    await flushPromises();

    await wrapper.find('#update-fact-title-input').setValue('New title');
    await wrapper.find('#update-fact-content-input').setValue('New content');
    await wrapper.find('#update-fact-submit-button').trigger('click');
    await flushPromises();

    expect(service.updateFactAsync).toHaveBeenCalledTimes(1);
    const updateArg = vi.mocked(service.updateFactAsync).mock.calls[0]![0];
    expect(updateArg.id).toBe('fact-1');
    expect(updateArg.title).toBe('New title');
    expect(updateArg.content).toBe('New content');
    expect(updateArg.version).toBe('2');
  });

  it('re-fetches the fact after updating, emits it, and closes', async () => {
    const service = makeService();
    const wrapper = mountComponent(service);
    await wrapper.setProps({ open: true });
    await flushPromises();

    await wrapper.find('#update-fact-submit-button').trigger('click');
    await flushPromises();

    // One load on open + one re-fetch after the update.
    expect(service.getFactAsync).toHaveBeenCalledTimes(2);

    const emitted = wrapper.emitted('updatedFact');
    expect(emitted).toHaveLength(1);
    const fact = emitted![0]![0] as VersionedFact;
    expect(fact.id).toBe('fact-1');

    expect(wrapper.emitted('update:open')!.at(-1)).toEqual([false]);
  });
});
