/**
 * DeleteCharacterComponent tests.
 *
 * mount() from @vue/test-utils renders the component into a jsdom document,
 * similar to rendering a Blazor component in a test host in C#.
 *
 * wrapper.find() is like document.querySelector().
 * wrapper.trigger() simulates a DOM event (e.g. a button click).
 * wrapper.emitted() records events emitted by the component — like checking
 * that a C# event was raised.
 * flushPromises() waits for all pending async operations to settle.
 */
import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import DeleteCharacterComponent from '@/components/DeleteCharacterComponent.vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';

function makeService(overrides: Partial<LoreWeaveApiService> = {}): LoreWeaveApiService {
  return {
    deleteCharacterAsync: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as LoreWeaveApiService;
}

describe('DeleteCharacterComponent', () => {
  it('renders a Delete character button', () => {
    const wrapper = mount(DeleteCharacterComponent, {
      props: { loreWeaveApiService: makeService(), characterId: 'char-1' },
    });

    expect(wrapper.find('#delete-character-button').exists()).toBe(true);
  });

  it('button is disabled when characterId is null', () => {
    const wrapper = mount(DeleteCharacterComponent, {
      props: { loreWeaveApiService: makeService(), characterId: null },
    });

    const button = wrapper.find<HTMLButtonElement>('#delete-character-button');
    expect(button.element.disabled).toBe(true);
  });

  it('button is enabled when characterId is provided', () => {
    const wrapper = mount(DeleteCharacterComponent, {
      props: { loreWeaveApiService: makeService(), characterId: 'char-1' },
    });

    const button = wrapper.find<HTMLButtonElement>('#delete-character-button');
    expect(button.element.disabled).toBe(false);
  });

  it('calls deleteCharacterAsync with the correct id on click', async () => {
    const service = makeService();
    const wrapper = mount(DeleteCharacterComponent, {
      props: { loreWeaveApiService: service, characterId: 'char-42' },
    });

    await wrapper.find('#delete-character-button').trigger('click');
    await flushPromises();

    expect(service.deleteCharacterAsync).toHaveBeenCalledWith('char-42', expect.anything());
  });

  it('emits deletedCharacter with the id after successful deletion', async () => {
    const wrapper = mount(DeleteCharacterComponent, {
      props: { loreWeaveApiService: makeService(), characterId: 'char-42' },
    });

    await wrapper.find('#delete-character-button').trigger('click');
    await flushPromises();

    expect(wrapper.emitted('deletedCharacter')).toEqual([['char-42']]);
  });

  it('does not call the service when characterId is null', async () => {
    const service = makeService();
    const wrapper = mount(DeleteCharacterComponent, {
      props: { loreWeaveApiService: service, characterId: null },
    });

    await wrapper.find('#delete-character-button').trigger('click');
    await flushPromises();

    expect(service.deleteCharacterAsync).not.toHaveBeenCalled();
  });
});
