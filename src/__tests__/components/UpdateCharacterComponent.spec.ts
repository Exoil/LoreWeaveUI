import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import UpdateCharacterComponent from '@/components/UpdateCharacterComponent.vue';
import type { RpgAssistantService } from '@/services/RpgAssistantService';
import { VersionedCharacter } from '@/services/Models/VersionedCharacter';

function makeService(overrides: Partial<RpgAssistantService> = {}): RpgAssistantService {
  return {
    getCharacterAsync: vi.fn().mockResolvedValue(new VersionedCharacter('1', 'Frodo', '"etag-v1"')),
    updateCharacterAsync: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as RpgAssistantService;
}

describe('UpdateCharacterComponent', () => {
  it('modal is visible when open prop is true', () => {
    const wrapper = mount(UpdateCharacterComponent, {
      props: { rpgAssistantService: makeService(), characterId: '1', open: true },
    });

    expect(wrapper.find('.modal').classes()).toContain('is-active');
  });

  it('modal is hidden when open prop is false', () => {
    const wrapper = mount(UpdateCharacterComponent, {
      props: { rpgAssistantService: makeService(), characterId: '1', open: false },
    });

    expect(wrapper.find('.modal').classes()).not.toContain('is-active');
  });

  it('loads character data when characterId is provided', async () => {
    const service = makeService();
    mount(UpdateCharacterComponent, {
      props: { rpgAssistantService: service, characterId: '1', open: true },
    });

    await flushPromises();

    expect(service.getCharacterAsync).toHaveBeenCalledWith('1', expect.anything());
  });

  it('pre-fills the input with the loaded character name', async () => {
    const wrapper = mount(UpdateCharacterComponent, {
      props: { rpgAssistantService: makeService(), characterId: '1', open: true },
    });

    await flushPromises();

    const input = wrapper.find<HTMLInputElement>('#update-character-node-name-input');
    expect(input.element.value).toBe('Frodo');
  });

  it('calls updateCharacterAsync with edited name on submit', async () => {
    const service = makeService();
    const wrapper = mount(UpdateCharacterComponent, {
      props: { rpgAssistantService: service, characterId: '1', open: true },
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
      props: { rpgAssistantService: makeService(), characterId: '1', open: true },
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
      props: { rpgAssistantService: makeService(), characterId: '1', open: true },
    });
    await flushPromises();

    await wrapper.find('#update-character-node-submit-button').trigger('click');
    await flushPromises();

    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('Cancel button emits update:open=false without calling updateCharacterAsync', async () => {
    const service = makeService();
    const wrapper = mount(UpdateCharacterComponent, {
      props: { rpgAssistantService: service, characterId: '1', open: true },
    });
    await flushPromises();

    await wrapper.find('.button.is-ghost').trigger('click');

    expect(wrapper.emitted('update:open')).toEqual([[false]]);
    expect(service.updateCharacterAsync).not.toHaveBeenCalled();
  });

  it('reloads character when characterId prop changes', async () => {
    const service = makeService();
    const wrapper = mount(UpdateCharacterComponent, {
      props: { rpgAssistantService: service, characterId: '1', open: true },
    });
    await flushPromises();

    await wrapper.setProps({ characterId: '2' });
    await flushPromises();

    expect(service.getCharacterAsync).toHaveBeenCalledTimes(2);
    expect(service.getCharacterAsync).toHaveBeenLastCalledWith('2', expect.anything());
  });
});
