import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import FindPathToCharacterComponent from '@/components/FindPathToCharacterComponent.vue';
import type { RpgAssistantService } from '@/services/RpgAssistantService';
import { Character } from '@/services/Models/Character';
import { RelationPath } from '@/services/Models/RelationPath';

function makeCharacters(start: number, count: number): Character[] {
  return Array.from(
    { length: count },
    (_, i) => new Character(`id-${start + i}`, `Name ${start + i}`),
  );
}

function makeService(overrides: Partial<RpgAssistantService> = {}): RpgAssistantService {
  return {
    searchCharactersByNameAsync: vi.fn().mockResolvedValue(makeCharacters(1, 10)),
    findRelationBetweenCharactersAsync: vi
      .fn()
      .mockResolvedValue(new RelationPath(['id-0', 'id-1'], 1)),
    ...overrides,
  } as unknown as RpgAssistantService;
}

function setScrollMetrics(
  element: HTMLElement,
  metrics: { scrollTop: number; clientHeight: number; scrollHeight: number },
) {
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    value: metrics.scrollTop,
  });
  Object.defineProperty(element, 'clientHeight', {
    configurable: true,
    value: metrics.clientHeight,
  });
  Object.defineProperty(element, 'scrollHeight', {
    configurable: true,
    value: metrics.scrollHeight,
  });
}

describe('FindPathToCharacterComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('modal is visible when open prop is true', () => {
    const wrapper = mount(FindPathToCharacterComponent, {
      props: { rpgAssistantService: makeService(), fromCharacterId: 'id-0', open: true },
    });

    expect(wrapper.find('.modal').classes()).toContain('is-active');
  });

  it('modal is hidden when open prop is false', () => {
    const wrapper = mount(FindPathToCharacterComponent, {
      props: { rpgAssistantService: makeService(), fromCharacterId: 'id-0', open: false },
    });

    expect(wrapper.find('.modal').classes()).not.toContain('is-active');
  });

  it('debounces input then calls searchCharactersByNameAsync with nameFilter, page 1, size 10', async () => {
    const service = makeService();
    const wrapper = mount(FindPathToCharacterComponent, {
      props: { rpgAssistantService: service, fromCharacterId: 'id-0', open: true },
    });

    await wrapper.find('#find-path-name-input').setValue('Fro');
    expect(service.searchCharactersByNameAsync).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);
    await flushPromises();

    expect(service.searchCharactersByNameAsync).toHaveBeenCalledTimes(1);
    expect(service.searchCharactersByNameAsync).toHaveBeenCalledWith(
      'Fro',
      1,
      10,
      expect.anything(),
    );
  });

  it('excludes fromCharacterId from rendered results', async () => {
    const service = makeService({
      searchCharactersByNameAsync: vi
        .fn()
        .mockResolvedValue([new Character('id-0', 'Self'), new Character('id-1', 'Other')]),
    });
    const wrapper = mount(FindPathToCharacterComponent, {
      props: { rpgAssistantService: service, fromCharacterId: 'id-0', open: true },
    });

    await wrapper.find('#find-path-name-input').setValue('any');
    vi.advanceTimersByTime(250);
    await flushPromises();

    const itemTexts = wrapper.findAll('.result-item').map((w) => w.text());
    expect(itemTexts).toEqual(['Other']);
  });

  it('clicking a result calls findRelationBetweenCharactersAsync from -> picked', async () => {
    const service = makeService();
    const wrapper = mount(FindPathToCharacterComponent, {
      props: { rpgAssistantService: service, fromCharacterId: 'id-0', open: true },
    });

    await wrapper.find('#find-path-name-input').setValue('Fro');
    vi.advanceTimersByTime(250);
    await flushPromises();

    await wrapper.findAll('.result-item')[0]!.trigger('click');
    await flushPromises();

    expect(service.findRelationBetweenCharactersAsync).toHaveBeenCalledWith(
      'id-0',
      'id-1',
      expect.anything(),
    );
  });

  it('emits pathFound with characterIds and closes dialog after a successful lookup', async () => {
    const service = makeService({
      findRelationBetweenCharactersAsync: vi
        .fn()
        .mockResolvedValue(new RelationPath(['id-0', 'id-5', 'id-1'], 2)),
    });
    const wrapper = mount(FindPathToCharacterComponent, {
      props: { rpgAssistantService: service, fromCharacterId: 'id-0', open: true },
    });

    await wrapper.find('#find-path-name-input').setValue('Fro');
    vi.advanceTimersByTime(250);
    await flushPromises();

    await wrapper.findAll('.result-item')[0]!.trigger('click');
    await flushPromises();

    expect(wrapper.emitted('pathFound')).toEqual([[['id-0', 'id-5', 'id-1']]]);
    expect(wrapper.emitted('update:open')!.at(-1)).toEqual([false]);
  });

  it('shows no-path message when service returns empty path and keeps dialog open', async () => {
    const service = makeService({
      findRelationBetweenCharactersAsync: vi.fn().mockResolvedValue(new RelationPath([], 0)),
    });
    const wrapper = mount(FindPathToCharacterComponent, {
      props: { rpgAssistantService: service, fromCharacterId: 'id-0', open: true },
    });

    await wrapper.find('#find-path-name-input').setValue('Fro');
    vi.advanceTimersByTime(250);
    await flushPromises();

    await wrapper.findAll('.result-item')[0]!.trigger('click');
    await flushPromises();

    expect(wrapper.find('#find-path-no-path-message').exists()).toBe(true);
    expect(wrapper.emitted('pathFound')).toBeUndefined();
    expect(wrapper.emitted('update:open')).toBeUndefined();
  });

  it('scrolling near bottom triggers a second page fetch with pageNumber=2', async () => {
    const service = makeService({
      searchCharactersByNameAsync: vi
        .fn()
        .mockResolvedValueOnce(makeCharacters(1, 10))
        .mockResolvedValueOnce(makeCharacters(11, 3)),
    });
    const wrapper = mount(FindPathToCharacterComponent, {
      props: { rpgAssistantService: service, fromCharacterId: 'id-0', open: true },
    });

    await wrapper.find('#find-path-name-input').setValue('Fro');
    vi.advanceTimersByTime(250);
    await flushPromises();

    const list = wrapper.find<HTMLUListElement>('#find-path-results-list');
    setScrollMetrics(list.element, { scrollTop: 200, clientHeight: 240, scrollHeight: 440 });
    await list.trigger('scroll');
    await flushPromises();

    expect(service.searchCharactersByNameAsync).toHaveBeenCalledTimes(2);
    expect(service.searchCharactersByNameAsync).toHaveBeenLastCalledWith(
      'Fro',
      2,
      10,
      expect.anything(),
    );
  });

  it('does not fetch further pages once response is shorter than pageSize', async () => {
    const service = makeService({
      searchCharactersByNameAsync: vi.fn().mockResolvedValue(makeCharacters(1, 3)),
    });
    const wrapper = mount(FindPathToCharacterComponent, {
      props: { rpgAssistantService: service, fromCharacterId: 'id-0', open: true },
    });

    await wrapper.find('#find-path-name-input').setValue('Fro');
    vi.advanceTimersByTime(250);
    await flushPromises();

    const list = wrapper.find<HTMLUListElement>('#find-path-results-list');
    setScrollMetrics(list.element, { scrollTop: 200, clientHeight: 240, scrollHeight: 440 });
    await list.trigger('scroll');
    await flushPromises();

    expect(service.searchCharactersByNameAsync).toHaveBeenCalledTimes(1);
  });

  it('cancel button closes dialog without calling the service', async () => {
    const service = makeService();
    const wrapper = mount(FindPathToCharacterComponent, {
      props: { rpgAssistantService: service, fromCharacterId: 'id-0', open: true },
    });

    await wrapper.find('#find-path-cancel-button').trigger('click');

    expect(wrapper.emitted('update:open')!.at(-1)).toEqual([false]);
    expect(service.searchCharactersByNameAsync).not.toHaveBeenCalled();
    expect(service.findRelationBetweenCharactersAsync).not.toHaveBeenCalled();
  });
});
