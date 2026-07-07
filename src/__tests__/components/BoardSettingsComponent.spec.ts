import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { AxiosError, AxiosHeaders } from 'axios';
import BoardSettingsComponent from '@/components/BoardSettingsComponent.vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { LoreWeaveApiService as RealService } from '@/services/LoreWeaveApiService';
import { BoardConfiguration } from '@/services/Models/BoardConfiguration';
import { VersionedBoard } from '@/services/Models/VersionedBoard';
import type { UpdateBoard } from '@/services/Models/UpdateBoard';

function makeBoard(version = '"1"'): VersionedBoard {
  return new VersionedBoard(
    'board-1',
    'Curse of Strahd',
    BoardConfiguration.createDefault(),
    version,
  );
}

function makeService(overrides: Partial<LoreWeaveApiService> = {}): LoreWeaveApiService {
  return {
    getBoardAsync: vi.fn().mockResolvedValue(makeBoard()),
    updateBoardAsync: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as LoreWeaveApiService;
}

function make412(): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError('Precondition Failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 412,
    statusText: 'Precondition Failed',
    headers,
    config: { headers },
    data: {},
  });
}

describe('BoardSettingsComponent', () => {
  it('loads the board into the form when opened', async () => {
    const service = makeService();
    const wrapper = mount(BoardSettingsComponent, {
      props: { loreWeaveApiService: service, boardId: 'board-1', open: true },
    });
    await flushPromises();

    expect(service.getBoardAsync).toHaveBeenCalledWith('board-1', expect.anything());
    expect(wrapper.find<HTMLInputElement>('#board-settings-name-input').element.value).toBe(
      'Curse of Strahd',
    );
    expect(
      wrapper.find<HTMLInputElement>('#board-settings-characterNodeColor-input').element.value,
    ).toBe('#4466cc');
    expect(wrapper.find<HTMLInputElement>('#board-settings-node-radius-input').element.value).toBe(
      '16',
    );
  });

  it('saves the edited name and configuration and emits boardUpdated', async () => {
    const service = makeService();
    const wrapper = mount(BoardSettingsComponent, {
      props: { loreWeaveApiService: service, boardId: 'board-1', open: true },
    });
    await flushPromises();

    await wrapper.find('#board-settings-name-input').setValue('Act II');
    await wrapper.find('#board-settings-characterNodeColor-input').setValue('#112233');
    await wrapper.find('#board-settings-node-radius-input').setValue('24');
    await wrapper.find('#board-settings-curved-edges-input').setValue(false);
    await wrapper.find('#board-settings-submit-button').trigger('click');
    await flushPromises();

    const update = (service.updateBoardAsync as ReturnType<typeof vi.fn>).mock
      .calls[0]![0] as UpdateBoard;
    expect(update.id).toBe('board-1');
    expect(update.name).toBe('Act II');
    expect(update.version).toBe('"1"');
    expect(update.configuration.characterNodeColor).toBe('#112233');
    expect(update.configuration.nodeRadius).toBe(24);
    expect(update.configuration.curvedEdges).toBe(false);

    expect(wrapper.emitted('boardUpdated')).toHaveLength(1);
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('blocks saving out-of-bounds options', async () => {
    const service = makeService();
    const wrapper = mount(BoardSettingsComponent, {
      props: { loreWeaveApiService: service, boardId: 'board-1', open: true },
    });
    await flushPromises();

    await wrapper.find('#board-settings-node-radius-input').setValue('100');
    expect(wrapper.find<HTMLButtonElement>('#board-settings-submit-button').element.disabled).toBe(
      true,
    );

    await wrapper.find('#board-settings-submit-button').trigger('click');
    expect(service.updateBoardAsync).not.toHaveBeenCalled();
  });

  it('a 412 on save reloads the fresh board and keeps the modal open', async () => {
    const service = makeService({
      updateBoardAsync: vi.fn().mockRejectedValue(make412()),
    });
    const wrapper = mount(BoardSettingsComponent, {
      props: { loreWeaveApiService: service, boardId: 'board-1', open: true },
    });
    await flushPromises();

    // Sanity: the mock error is what the component's guard looks for.
    expect(RealService.isPreconditionFailedError(make412())).toBe(true);

    (service.getBoardAsync as ReturnType<typeof vi.fn>).mockResolvedValue(makeBoard('"2"'));
    await wrapper.find('#board-settings-name-input').setValue('Act II');
    await wrapper.find('#board-settings-submit-button').trigger('click');
    await flushPromises();

    // Fresh reload, no emit, still open for the retry.
    expect(service.getBoardAsync).toHaveBeenCalledTimes(2);
    expect(wrapper.emitted('boardUpdated')).toBeUndefined();
    expect(wrapper.emitted('update:open')).toBeUndefined();
    expect(wrapper.find<HTMLInputElement>('#board-settings-name-input').element.value).toBe(
      'Curse of Strahd',
    );
  });
});
