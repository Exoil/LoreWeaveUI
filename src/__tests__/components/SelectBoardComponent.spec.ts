import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import SelectBoardComponent from '@/components/SelectBoardComponent.vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { Board } from '@/services/Models/Board';
import { BoardConfiguration } from '@/services/Models/BoardConfiguration';

function makeBoard(id: string, name: string): Board {
  return new Board(id, name, BoardConfiguration.createDefault());
}

function makeService(overrides: Partial<LoreWeaveApiService> = {}): LoreWeaveApiService {
  return {
    getBoardsAsync: vi
      .fn()
      .mockResolvedValue([makeBoard('b1', 'Curse of Strahd'), makeBoard('b2', 'Waterdeep')]),
    createBoardAsync: vi.fn().mockResolvedValue('new-board-id'),
    ...overrides,
  } as unknown as LoreWeaveApiService;
}

describe('SelectBoardComponent', () => {
  it('lists the boards when opened', async () => {
    const service = makeService();
    const wrapper = mount(SelectBoardComponent, {
      props: { loreWeaveApiService: service, dismissable: true, activeBoardId: null, open: true },
    });
    await flushPromises();

    expect(service.getBoardsAsync).toHaveBeenCalled();
    expect(wrapper.find('#select-board-b1').text()).toBe('Curse of Strahd');
    expect(wrapper.find('#select-board-b2').text()).toBe('Waterdeep');
  });

  it('emits boardSelected and closes when a board is clicked', async () => {
    const wrapper = mount(SelectBoardComponent, {
      props: {
        loreWeaveApiService: makeService(),
        dismissable: true,
        activeBoardId: null,
        open: true,
      },
    });
    await flushPromises();

    await wrapper.find('#select-board-b2').trigger('click');

    expect(wrapper.emitted('boardSelected')).toEqual([['b2']]);
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('creates a board and emits its id', async () => {
    const service = makeService();
    const wrapper = mount(SelectBoardComponent, {
      props: { loreWeaveApiService: service, dismissable: false, activeBoardId: null, open: true },
    });
    await flushPromises();

    await wrapper.find('#select-board-new-name-input').setValue('  New Campaign  ');
    await wrapper.find('#select-board-create-button').trigger('click');
    await flushPromises();

    expect(service.createBoardAsync).toHaveBeenCalledWith('New Campaign', expect.anything());
    expect(wrapper.emitted('boardSelected')).toEqual([['new-board-id']]);
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('blocks creating a board with a blank name', async () => {
    const service = makeService();
    const wrapper = mount(SelectBoardComponent, {
      props: { loreWeaveApiService: service, dismissable: false, activeBoardId: null, open: true },
    });
    await flushPromises();

    await wrapper.find('#select-board-new-name-input').setValue('   ');
    expect(wrapper.find<HTMLButtonElement>('#select-board-create-button').element.disabled).toBe(
      true,
    );

    await wrapper.find('#select-board-create-button').trigger('click');
    expect(service.createBoardAsync).not.toHaveBeenCalled();
    expect(wrapper.emitted('boardSelected')).toBeUndefined();
  });

  it('hides Cancel for the non-dismissable initial pick', async () => {
    const wrapper = mount(SelectBoardComponent, {
      props: {
        loreWeaveApiService: makeService(),
        dismissable: false,
        activeBoardId: null,
        open: true,
      },
    });
    await flushPromises();

    expect(wrapper.find('#select-board-cancel-button').exists()).toBe(false);
  });

  it('Cancel closes the picker when switching boards', async () => {
    const wrapper = mount(SelectBoardComponent, {
      props: {
        loreWeaveApiService: makeService(),
        dismissable: true,
        activeBoardId: 'b1',
        open: true,
      },
    });
    await flushPromises();

    await wrapper.find('#select-board-cancel-button').trigger('click');

    expect(wrapper.emitted('update:open')).toEqual([[false]]);
    expect(wrapper.emitted('boardSelected')).toBeUndefined();
  });
});
