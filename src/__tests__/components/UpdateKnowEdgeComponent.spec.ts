import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import UpdateKnowEdgeComponent from '@/components/UpdateKnowEdgeComponent.vue';
import { VersionedKnowRelation } from '@/services/Models/VersionedKnowRelation';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';

function makeService(overrides: Partial<LoreWeaveApiService> = {}): LoreWeaveApiService {
  return {
    getKnowRelationAsync: vi
      .fn()
      .mockResolvedValue(new VersionedKnowRelation('char-1', 'char-2', 'old friends', true, '2')),
    updateKnowRelationAsync: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as LoreWeaveApiService;
}

function mountComponent(service: LoreWeaveApiService) {
  return mount(UpdateKnowEdgeComponent, {
    props: {
      open: false,
      loreWeaveApiService: service,
      fromCharacterId: 'char-1',
      toCharacterId: 'char-2',
    },
  });
}

describe('UpdateKnowEdgeComponent', () => {
  it('loads the relation and prefills the form when opened', async () => {
    const service = makeService();
    const wrapper = mountComponent(service);

    await wrapper.setProps({ open: true });
    await flushPromises();

    expect(service.getKnowRelationAsync).toHaveBeenCalledWith(
      'char-1',
      'char-2',
      expect.anything(),
    );
    const input = wrapper.find<HTMLInputElement>('#update-know-edge-description-input');
    expect(input.element.value).toBe('old friends');
    const checkbox = wrapper.find<HTMLInputElement>('#update-know-edge-strong-checkbox');
    expect(checkbox.element.checked).toBe(true);
  });

  it('does not load when the character ids are missing', async () => {
    const service = makeService();
    const wrapper = mount(UpdateKnowEdgeComponent, {
      props: {
        open: false,
        loreWeaveApiService: service,
        fromCharacterId: null,
        toCharacterId: null,
      },
    });

    await wrapper.setProps({ open: true });
    await flushPromises();

    expect(service.getKnowRelationAsync).not.toHaveBeenCalled();
  });

  it('updates the relation with the edited values, including the loaded version', async () => {
    const service = makeService();
    const wrapper = mountComponent(service);
    await wrapper.setProps({ open: true });
    await flushPromises();

    await wrapper.find('#update-know-edge-description-input').setValue('former allies');
    await wrapper.find('#update-know-edge-strong-checkbox').setValue(false);
    await wrapper.find('#update-know-edge-submit-button').trigger('click');
    await flushPromises();

    expect(service.updateKnowRelationAsync).toHaveBeenCalledTimes(1);
    const updateArg = vi.mocked(service.updateKnowRelationAsync).mock.calls[0]![0];
    expect(updateArg.fromCharacterId).toBe('char-1');
    expect(updateArg.toCharacterId).toBe('char-2');
    expect(updateArg.description).toBe('former allies');
    expect(updateArg.isStrongRelation).toBe(false);
    expect(updateArg.version).toBe('2');
  });

  it('re-fetches the relation after updating, emits it, and closes', async () => {
    const service = makeService();
    const wrapper = mountComponent(service);
    await wrapper.setProps({ open: true });
    await flushPromises();

    await wrapper.find('#update-know-edge-submit-button').trigger('click');
    await flushPromises();

    // One load on open + one re-fetch after the update.
    expect(service.getKnowRelationAsync).toHaveBeenCalledTimes(2);

    const emitted = wrapper.emitted('updatedKnowEdge');
    expect(emitted).toHaveLength(1);
    const relation = emitted![0]![0] as VersionedKnowRelation;
    expect(relation.fromCharacterId).toBe('char-1');
    expect(relation.toCharacterId).toBe('char-2');

    expect(wrapper.emitted('update:open')!.at(-1)).toEqual([false]);
  });
});
