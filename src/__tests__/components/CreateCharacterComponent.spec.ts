import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CreateCharacterComponent from '@/components/CreateCharacterComponent.vue';
import type { RpgAssistantService } from '@/services/RpgAssistantService';

function makeService(overrides: Partial<RpgAssistantService> = {}): RpgAssistantService {
  return {
    createCharacterAsync: vi.fn().mockResolvedValue('new-id'),
    ...overrides,
  } as unknown as RpgAssistantService;
}

describe('CreateCharacterComponent', () => {
  it('modal is visible when open prop is true', () => {
    const wrapper = mount(CreateCharacterComponent, {
      props: { rpgAssistantService: makeService(), open: true },
    });

    expect(wrapper.find('.modal').classes()).toContain('is-active');
  });

  it('modal is hidden when open prop is false', () => {
    const wrapper = mount(CreateCharacterComponent, {
      props: { rpgAssistantService: makeService(), open: false },
    });

    expect(wrapper.find('.modal').classes()).not.toContain('is-active');
  });

  it('calls createCharacterAsync with the typed name', async () => {
    const service = makeService();
    const wrapper = mount(CreateCharacterComponent, {
      props: { rpgAssistantService: service, open: true },
    });

    await wrapper.find('#create-character-node-name-input').setValue('Gandalf');
    await wrapper.find('#create-character-node-submit-button').trigger('click');
    await flushPromises();

    expect(service.createCharacterAsync).toHaveBeenCalledWith('Gandalf', expect.anything());
  });

  it('emits characterCreated with a CharacterNode after create', async () => {
    const wrapper = mount(CreateCharacterComponent, {
      props: { rpgAssistantService: makeService(), open: true },
    });

    await wrapper.find('#create-character-node-name-input').setValue('Gandalf');
    await wrapper.find('#create-character-node-submit-button').trigger('click');
    await flushPromises();

    const emitted = wrapper.emitted('characterCreated');
    expect(emitted).toHaveLength(1);
    expect(emitted![0]![0]).toMatchObject({ id: 'new-id', name: 'Gandalf' });
  });

  it('emits update:open=false after create', async () => {
    const wrapper = mount(CreateCharacterComponent, {
      props: { rpgAssistantService: makeService(), open: true },
    });

    await wrapper.find('#create-character-node-name-input').setValue('Gandalf');
    await wrapper.find('#create-character-node-submit-button').trigger('click');
    await flushPromises();

    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('clears the input after create', async () => {
    const wrapper = mount(CreateCharacterComponent, {
      props: { rpgAssistantService: makeService(), open: true },
    });
    const input = wrapper.find<HTMLInputElement>('#create-character-node-name-input');

    await input.setValue('Gandalf');
    await wrapper.find('#create-character-node-submit-button').trigger('click');
    await flushPromises();

    expect(input.element.value).toBe('');
  });

  it('Cancel button emits update:open=false without calling the service', async () => {
    const service = makeService();
    const wrapper = mount(CreateCharacterComponent, {
      props: { rpgAssistantService: service, open: true },
    });

    await wrapper.find('.button.is-ghost').trigger('click');

    expect(wrapper.emitted('update:open')).toEqual([[false]]);
    expect(service.createCharacterAsync).not.toHaveBeenCalled();
  });
});
