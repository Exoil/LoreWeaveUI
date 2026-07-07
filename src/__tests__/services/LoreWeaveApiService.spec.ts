import { describe, it, expect, vi } from 'vitest';
import { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { Character } from '@/services/Models/Character';
import type { PageQuery } from '@/services/Models/PageQuery';

function makeCharacters(count: number, prefix: string): Character[] {
  return Array.from({ length: count }, (_, i) => new Character(`${prefix}-${i}`, `${prefix} ${i}`));
}

describe('LoreWeaveApiService.getAllCharactersAsync', () => {
  it('returns the single page when the first page is short', async () => {
    const service = new LoreWeaveApiService('');
    const getPage = vi
      .spyOn(service, 'getCharactersAsync')
      .mockResolvedValue(makeCharacters(3, 'a'));

    const all = await service.getAllCharactersAsync();

    expect(all).toHaveLength(3);
    expect(getPage).toHaveBeenCalledTimes(1);
    expect((getPage.mock.calls[0]![0] as PageQuery).pageSize).toBe(100);
  });

  it('walks pages until a short page and concatenates them in order', async () => {
    const service = new LoreWeaveApiService('');
    const getPage = vi
      .spyOn(service, 'getCharactersAsync')
      .mockResolvedValueOnce(makeCharacters(100, 'page1'))
      .mockResolvedValueOnce(makeCharacters(100, 'page2'))
      .mockResolvedValueOnce(makeCharacters(7, 'page3'));

    const all = await service.getAllCharactersAsync();

    expect(all).toHaveLength(207);
    expect(all[0]!.id).toBe('page1-0');
    expect(all[206]!.id).toBe('page3-6');
    expect(getPage).toHaveBeenCalledTimes(3);
    expect((getPage.mock.calls[0]![0] as PageQuery).pageNumber).toBe(1);
    expect((getPage.mock.calls[2]![0] as PageQuery).pageNumber).toBe(3);
  });

  it('forwards the abort signal to every page request', async () => {
    const service = new LoreWeaveApiService('');
    const getPage = vi.spyOn(service, 'getCharactersAsync').mockResolvedValue([]);
    const controller = new AbortController();

    await service.getAllCharactersAsync(controller.signal);

    expect(getPage).toHaveBeenCalledWith(expect.anything(), controller.signal);
  });
});

describe('LoreWeaveApiService active board scoping', () => {
  it('starts without an active board', () => {
    const service = new LoreWeaveApiService('');

    expect(service.activeBoardId).toBeNull();
  });

  it('remembers the board set via setActiveBoard', () => {
    const service = new LoreWeaveApiService('');

    service.setActiveBoard('board-1');

    expect(service.activeBoardId).toBe('board-1');
  });

  it('rejects data requests before a board is selected', async () => {
    const service = new LoreWeaveApiService('');

    await expect(service.getCharacterAsync('some-id')).rejects.toThrow(/no active board/);
    await expect(service.deleteFactAsync('some-id')).rejects.toThrow(/no active board/);
  });
});
