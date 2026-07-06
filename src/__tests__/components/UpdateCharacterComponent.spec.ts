import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import UpdateCharacterComponent from '@/components/UpdateCharacterComponent.vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { VersionedCharacter } from '@/services/Models/VersionedCharacter';

function makeService(overrides: Partial<LoreWeaveApiService> = {}): LoreWeaveApiService {
  return {
    getCharacterAsync: vi.fn().mockResolvedValue(new VersionedCharacter('1', 'Frodo', '"etag-v1"')),
    updateCharacterAsync: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as LoreWeaveApiService;
}

describe('UpdateCharacterComponent', () => {
  it('modal is visible when open prop is true', () => {
    const wrapper = mount(UpdateCharacterComponent, {
      props: { loreWeaveApiService: makeService(), characterId: '1', open: true },
    });

    expect(wrapper.find('.modal').classes()).toContain('is-active');
  });

  it('modal is hidden when open prop is false', () => {
    const wrapper = mount(UpdateCharacterComponent, {
      props: { loreWeaveApiService: makeService(), characterId: '1', open: false },
    });

    expect(wrapper.find('.modal').classes()).not.toContain('is-active');
  });

  it('loads character data when characterId is provided', async () => {
    const service = makeService();
    mount(UpdateCharacterComponent, {
      props: { loreWeaveApiService: service, characterId: '1', open: true },
    });

    await flushPromises();

    expect(service.getCharacterAsync).toHaveBeenCalledWith('1', expect.anything());
  });

  it('reloads fresh data every time the modal reopens', async () => {
    const service = makeService();
    const wrapper = mount(UpdateCharacterComponent, {
      props: { loreWeaveApiService: service, characterId: '1', open: true },
    });
    await flushPromises();
    expect(wrapper.find<HTMLInputElement>('#update-character-node-name-input').element.value).toBe(
      'Frodo',
    );

    // The Foundry sync renames the character while the modal is closed.
    (service.getCharacterAsync as ReturnType<typeof vi.fn>).mockResolvedValue(
      new VersionedCharacter('1', 'Frodo the Brave', '"etag-v2"'),
    );
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await flushPromises();

    expect(service.getCharacterAsync).toHaveBeenCalledTimes(2);
    expect(wrapper.find<HTMLInputElement>('#update-character-node-name-input').element.value).toBe(
      'Frodo the Brave',
    );
  });

  it('a 412 on save reloads the character and keeps the modal open for a retry', async () => {
    const service = makeService({
      updateCharacterAsync: vi
        .fn()
        .mockRejectedValue({ isAxiosError: true, response: { status: 412 } }),
    });
    const wrapper = mount(UpdateCharacterComponent, {
      props: { loreWeaveApiService: service, characterId: '1', open: true },
    });
    await flushPromises();

    await wrapper.find('#update-character-node-name-input').setValue('My rename');
    await wrapper.find('#update-character-node-submit-button').trigger('click');
    await flushPromises();

    // No success emit, modal not closed, form reloaded with the fresh state.
    expect(wrapper.emitted('updatedCharacter')).toBeUndefined();
    expect(wrapper.emitted('update:open')).toBeUndefined();
    expect(service.getCharacterAsync).toHaveBeenCalledTimes(2);
    expect(wrapper.find<HTMLInputElement>('#update-character-node-name-input').element.value).toBe(
      'Frodo',
    );
  });

  it('blocks names outside the contract limit (1..50)', async () => {
    const service = makeService();
    const wrapper = mount(UpdateCharacterComponent, {
      props: { loreWeaveApiService: service, characterId: '1', open: true },
    });
    await flushPromises();
    const button = wrapper.find<HTMLButtonElement>('#update-character-node-submit-button');

    await wrapper.find('#update-character-node-name-input').setValue('n'.repeat(51));
    expect(button.element.disabled).toBe(true);
    await button.trigger('click');
    expect(service.updateCharacterAsync).not.toHaveBeenCalled();

    await wrapper.find('#update-character-node-name-input').setValue('');
    expect(button.element.disabled).toBe(true);

    await wrapper.find('#update-character-node-name-input').setValue('Bilbo');
    expect(button.element.disabled).toBe(false);
  });

  it('pre-fills the input with the loaded character name', async () => {
    const wrapper = mount(UpdateCharacterComponent, {
      props: { loreWeaveApiService: makeService(), characterId: '1', open: true },
    });

    await flushPromises();

    const input = wrapper.find<HTMLInputElement>('#update-character-node-name-input');
    expect(input.element.value).toBe('Frodo');
  });

  it('calls updateCharacterAsync with edited name on submit', async () => {
    const service = makeService();
    const wrapper = mount(UpdateCharacterComponent, {
      props: { loreWeaveApiService: service, characterId: '1', open: true },
    });
    await flushPromises();

    await wrapper.find('#update-character-node-name-input').setValue('Frodo Baggins');
    await wrapper.find('#update-character-node-submit-button').trigger('click');
    await flushPromises();

    expect(service.updateCharacterAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1', name: 'Frodo Baggins', version: '"etag-v1"' }),
      expect.anything(),
    );
  });

  it('emits updatedCharacter after a successful update', async () => {
    const wrapper = mount(UpdateCharacterComponent, {
      props: { loreWeaveApiService: makeService(), characterId: '1', open: true },
    });
    await flushPromises();

    await wrapper.find('#update-character-node-name-input').setValue('Frodo Baggins');
    await wrapper.find('#update-character-node-submit-button').trigger('click');
    await flushPromises();

    const emitted = wrapper.emitted('updatedCharacter');
    expect(emitted).toHaveLength(1);
    expect(emitted![0]![0]).toMatchObject({ id: '1', name: 'Frodo Baggins' });
  });

  it('emits update:open=false after a successful update', async () => {
    const wrapper = mount(UpdateCharacterComponent, {
      props: { loreWeaveApiService: makeService(), characterId: '1', open: true },
    });
    await flushPromises();

    await wrapper.find('#update-character-node-submit-button').trigger('click');
    await flushPromises();

    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('Cancel button emits update:open=false without calling updateCharacterAsync', async () => {
    const service = makeService();
    const wrapper = mount(UpdateCharacterComponent, {
      props: { loreWeaveApiService: service, characterId: '1', open: true },
    });
    await flushPromises();

    await wrapper.find('.button.is-ghost').trigger('click');

    expect(wrapper.emitted('update:open')).toEqual([[false]]);
    expect(service.updateCharacterAsync).not.toHaveBeenCalled();
  });

  it('reloads character when characterId prop changes', async () => {
    const service = makeService();
    const wrapper = mount(UpdateCharacterComponent, {
      props: { loreWeaveApiService: service, characterId: '1', open: true },
    });
    await flushPromises();

    await wrapper.setProps({ characterId: '2' });
    await flushPromises();

    expect(service.getCharacterAsync).toHaveBeenCalledTimes(2);
    expect(service.getCharacterAsync).toHaveBeenLastCalledWith('2', expect.anything());
  });
});
