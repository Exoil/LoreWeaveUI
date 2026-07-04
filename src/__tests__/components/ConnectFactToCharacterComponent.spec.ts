import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ConnectFactToCharacterComponent from '@/components/ConnectFactToCharacterComponent.vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { Character } from '@/services/Models/Character';

function makeCharacters(start: number, count: number): Character[] {
  return Array.from(
    { length: count },
    (_, i) => new Character(`id-${start + i}`, `Name ${start + i}`),
  );
}

function makeService(overrides: Partial<LoreWeaveApiService> = {}): LoreWeaveApiService {
  return {
    searchCharactersByNameAsync: vi.fn().mockResolvedValue(makeCharacters(1, 10)),
    connectFactToCharacterAsync: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as LoreWeaveApiService;
}

function mountConnect(
  service: LoreWeaveApiService,
  props: Partial<{ factId: string | null; connectedCharacterIds: string[]; open: boolean }> = {},
) {
  return mount(ConnectFactToCharacterComponent, {
    props: {
      loreWeaveApiService: service,
      factId: 'fact-1',
      connectedCharacterIds: [],
      open: true,
      ...props,
    },
  });
}

async function search(wrapper: ReturnType<typeof mountConnect>, text: string) {
  await wrapper.find('#connect-fact-name-input').setValue(text);
  vi.advanceTimersByTime(250);
  await flushPromises();
}

describe('ConnectFactToCharacterComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('modal visibility follows the open prop', () => {
    expect(mountConnect(makeService()).find('.modal').classes()).toContain('is-active');
    expect(mountConnect(makeService(), { open: false }).find('.modal').classes()).not.toContain(
      'is-active',
    );
  });

  it('searches characters after the debounce', async () => {
    const service = makeService();
    const wrapper = mountConnect(service);

    await search(wrapper, 'Name');

    expect(service.searchCharactersByNameAsync).toHaveBeenCalledWith(
      'Name',
      1,
      10,
      expect.any(AbortSignal),
    );
    expect(wrapper.findAll('.result-item')).toHaveLength(10);
  });

  it('hides characters already connected to the fact', async () => {
    const wrapper = mountConnect(makeService(), { connectedCharacterIds: ['id-1', 'id-2'] });

    await search(wrapper, 'Name');

    const names = wrapper.findAll('.result-item').map((item) => item.text());
    expect(names).not.toContain('Name 1');
    expect(names).not.toContain('Name 2');
    expect(names).toHaveLength(8);
  });

  it('connects the picked character, emits factConnected and closes', async () => {
    const service = makeService();
    const wrapper = mountConnect(service);
    await search(wrapper, 'Name');

    await wrapper.findAll('.result-item')[0]!.trigger('click');
    await flushPromises();

    expect(service.connectFactToCharacterAsync).toHaveBeenCalledWith(
      'id-1',
      'fact-1',
      expect.any(AbortSignal),
    );
    expect(wrapper.emitted('factConnected')).toEqual([['id-1', 'fact-1']]);
    expect(wrapper.emitted('update:open')!.at(-1)).toEqual([false]);
  });

  it('does nothing when no fact is selected', async () => {
    const service = makeService();
    const wrapper = mountConnect(service, { factId: null });
    await search(wrapper, 'Name');

    await wrapper.findAll('.result-item')[0]!.trigger('click');
    await flushPromises();

    expect(service.connectFactToCharacterAsync).not.toHaveBeenCalled();
    expect(wrapper.emitted('factConnected')).toBeUndefined();
  });

  it('cancel closes without connecting', async () => {
    const service = makeService();
    const wrapper = mountConnect(service);

    await wrapper.find('#connect-fact-cancel-button').trigger('click');

    expect(service.connectFactToCharacterAsync).not.toHaveBeenCalled();
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });
});
