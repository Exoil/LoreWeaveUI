import { describe, it, expect, vi, afterEach } from 'vitest';
import { effectScope } from 'vue';
import type * as vNG from 'v-network-graph';
import {
  useGraphLayoutCache,
  createLocalStorageGraphLayoutStorage,
  type GraphLayoutStorage,
} from '@/composables/useGraphLayoutCache';

function makeStorage(saved: vNG.Layouts | null = null): GraphLayoutStorage {
  return {
    load: vi.fn().mockReturnValue(saved),
    save: vi.fn(),
  };
}

describe('useGraphLayoutCache', () => {
  it('starts with an empty layout when nothing is saved', () => {
    const { layouts } = useGraphLayoutCache(makeStorage());

    expect(layouts.value).toEqual({ nodes: {} });
  });

  it('restores saved positions and pins them so the force layout keeps them', () => {
    const storage = makeStorage({
      nodes: { 'char-1': { x: 10, y: 20 }, 'char-2': { x: -5, y: 40, fixed: false } },
    });

    const { layouts } = useGraphLayoutCache(storage);

    expect(layouts.value.nodes['char-1']).toEqual({ x: 10, y: 20, fixed: true });
    expect(layouts.value.nodes['char-2']).toEqual({ x: -5, y: 40, fixed: true });
  });

  it('saveNow persists the current positions', () => {
    const storage = makeStorage();
    const { layouts, saveNow } = useGraphLayoutCache(storage);
    layouts.value.nodes['char-1'] = { x: 1, y: 2 };

    saveNow();

    expect(storage.save).toHaveBeenCalledWith({ nodes: { 'char-1': { x: 1, y: 2 } } });
  });

  it('saves when the hosting scope is disposed (window closed)', () => {
    const storage = makeStorage();
    const scope = effectScope();
    scope.run(() => {
      const { layouts } = useGraphLayoutCache(storage);
      layouts.value.nodes['char-1'] = { x: 3, y: 4 };
    });

    scope.stop();

    expect(storage.save).toHaveBeenCalledWith({ nodes: { 'char-1': { x: 3, y: 4 } } });
  });

  it('saves on beforeunload (browser tab closed or reloaded)', () => {
    const storage = makeStorage();
    const scope = effectScope();
    scope.run(() => useGraphLayoutCache(storage));

    window.dispatchEvent(new Event('beforeunload'));

    expect(storage.save).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it('stops listening to beforeunload after the scope is disposed', () => {
    const storage = makeStorage();
    const scope = effectScope();
    scope.run(() => useGraphLayoutCache(storage));
    scope.stop();

    window.dispatchEvent(new Event('beforeunload'));

    // Only the dispose-time save; the unload listener is gone.
    expect(storage.save).toHaveBeenCalledTimes(1);
  });
});

describe('createLocalStorageGraphLayoutStorage', () => {
  const KEY = 'loreweaveui:graph-layout-test';

  afterEach(() => {
    window.localStorage.removeItem(KEY);
  });

  it('round-trips a layout through localStorage', () => {
    const storage = createLocalStorageGraphLayoutStorage(KEY);
    const layout: vNG.Layouts = { nodes: { 'char-1': { x: 7, y: 8, fixed: true } } };

    storage.save(layout);

    expect(storage.load()).toEqual(layout);
  });

  it('returns null when nothing is stored', () => {
    expect(createLocalStorageGraphLayoutStorage(KEY).load()).toBeNull();
  });

  it('returns null for corrupt stored data', () => {
    window.localStorage.setItem(KEY, 'not-json{');
    expect(createLocalStorageGraphLayoutStorage(KEY).load()).toBeNull();

    window.localStorage.setItem(KEY, '{"unexpected":true}');
    expect(createLocalStorageGraphLayoutStorage(KEY).load()).toBeNull();
  });
});
