import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CreateFactComponent from '@/components/CreateFactComponent.vue';
import { FactNode } from '@/models/FactNode';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';

function makeService(overrides: Partial<LoreWeaveApiService> = {}): LoreWeaveApiService {
  return {
    addFactToCharacterAsync: vi.fn().mockResolvedValue('fact-id'),
    ...overrides,
  } as unknown as LoreWeaveApiService;
}

function mountComponent(
  service: LoreWeaveApiService,
  props: { characterId: string | null } = { characterId: 'char-1' },
) {
  return mount(CreateFactComponent, {
    props: { open: true, loreWeaveApiService: service, ...props },
  });
}

describe('CreateFactComponent', () => {
  it('create button is disabled when the character id is missing', () => {
    const wrapper = mountComponent(makeService(), { characterId: null });

    const button = wrapper.find<HTMLButtonElement>('#create-fact-submit-button');
    expect(button.element.disabled).toBe(true);
  });

  it('passes the title and content to the service', async () => {
    const service = makeService();
    const wrapper = mountComponent(service);

    await wrapper.find('#create-fact-title-input').setValue('Wizard of the Secret Fire');
    await wrapper.find('#create-fact-content-input').setValue('Wielder of Narya.');
    await wrapper.find('#create-fact-submit-button').trigger('click');
    await flushPromises();

    expect(service.addFactToCharacterAsync).toHaveBeenCalledWith(
      'char-1',
      'Wizard of the Secret Fire',
      'Wielder of Narya.',
      expect.anything(),
    );
  });

  it('emits factCreated with the character id and the new fact node, then closes', async () => {
    const wrapper = mountComponent(makeService());

    await wrapper.find('#create-fact-title-input').setValue('Ring bearer');
    await wrapper.find('#create-fact-content-input').setValue('Carried the Ring.');
    await wrapper.find('#create-fact-submit-button').trigger('click');
    await flushPromises();

    const emitted = wrapper.emitted('factCreated');
    expect(emitted).toHaveLength(1);
    const [characterId, factNode] = emitted![0]! as [string, FactNode];
    expect(characterId).toBe('char-1');
    expect(factNode.id).toBe('fact-id');
    expect(factNode.name).toBe('Ring bearer');
    expect(factNode.factData.content).toBe('Carried the Ring.');

    expect(wrapper.emitted('update:open')!.at(-1)).toEqual([false]);
  });

  it('blocks submits that violate the contract limits (title 1..100, content 1..3000)', async () => {
    const service = makeService();
    const wrapper = mountComponent(service);
    const button = wrapper.find<HTMLButtonElement>('#create-fact-submit-button');

    // Empty form → invalid (both fields require 1+ chars).
    expect(button.element.disabled).toBe(true);

    // Oversized title.
    await wrapper.find('#create-fact-title-input').setValue('t'.repeat(101));
    await wrapper.find('#create-fact-content-input').setValue('valid content');
    expect(button.element.disabled).toBe(true);

    // Oversized content.
    await wrapper.find('#create-fact-title-input').setValue('valid title');
    await wrapper.find('#create-fact-content-input').setValue('c'.repeat(3001));
    expect(button.element.disabled).toBe(true);
    await button.trigger('click');
    expect(service.addFactToCharacterAsync).not.toHaveBeenCalled();

    // Back within limits → valid.
    await wrapper.find('#create-fact-content-input').setValue('c'.repeat(3000));
    expect(button.element.disabled).toBe(false);
  });

  it('resets the form each time the modal is reopened', async () => {
    const wrapper = mountComponent(makeService());

    await wrapper.find('#create-fact-title-input').setValue('stale title');
    await wrapper.find('#create-fact-content-input').setValue('stale content');

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });

    const title = wrapper.find<HTMLInputElement>('#create-fact-title-input');
    const content = wrapper.find<HTMLTextAreaElement>('#create-fact-content-input');
    expect(title.element.value).toBe('');
    expect(content.element.value).toBe('');
  });
});
