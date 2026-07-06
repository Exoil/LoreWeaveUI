import { describe, it, expect, vi, afterEach } from 'vitest';
import { effectScope } from 'vue';
import {
  useGraphVisibility,
  createLocalStorageGraphVisibilityHost,
  parseHiddenGraphItems,
  type GraphVisibilityHost,
  type HiddenGraphItems,
} from '@/composables/useGraphVisibility';

function makeHost(
  overrides: Partial<GraphVisibilityHost> = {},
  saved: HiddenGraphItems | null = null,
): GraphVisibilityHost {
  return {
    isGameMaster: true,
    load: vi.fn().mockReturnValue(saved),
    save: vi.fn(),
    ...overrides,
  };
}

describe('useGraphVisibility', () => {
  it('starts with nothing hidden when nothing is saved', () => {
    const visibility = useGraphVisibility(makeHost());

    expect(visibility.hiddenNodeIds.value.size).toBe(0);
    expect(visibility.hiddenEdgeKeys.value.size).toBe(0);
  });

  it('restores the saved hidden items', () => {
    const visibility = useGraphVisibility(
      makeHost({}, { nodeIds: ['char-1'], edgeKeys: ['char-1_char-2'] }),
    );

    expect(visibility.isNodeHidden('char-1')).toBe(true);
    expect(visibility.isEdgeHidden('char-1_char-2')).toBe(true);
    expect(visibility.isNodeHidden('char-2')).toBe(false);
  });

  it('GM toggling a node hides it and persists the change', () => {
    const host = makeHost();
    const visibility = useGraphVisibility(host);

    visibility.toggleNodeVisibility('char-1');

    expect(visibility.isNodeHidden('char-1')).toBe(true);
    expect(host.save).toHaveBeenCalledWith({ nodeIds: ['char-1'], edgeKeys: [] });
  });

  it('GM toggling a hidden node shows it again', () => {
    const host = makeHost({}, { nodeIds: ['char-1'], edgeKeys: [] });
    const visibility = useGraphVisibility(host);

    visibility.toggleNodeVisibility('char-1');

    expect(visibility.isNodeHidden('char-1')).toBe(false);
    expect(host.save).toHaveBeenCalledWith({ nodeIds: [], edgeKeys: [] });
  });

  it('GM toggling an edge hides it and persists the change', () => {
    const host = makeHost();
    const visibility = useGraphVisibility(host);

    visibility.toggleEdgeVisibility('char-1_char-2');

    expect(visibility.isEdgeHidden('char-1_char-2')).toBe(true);
    expect(host.save).toHaveBeenCalledWith({ nodeIds: [], edgeKeys: ['char-1_char-2'] });
  });

  it('players cannot toggle anything', () => {
    const host = makeHost({ isGameMaster: false });
    const visibility = useGraphVisibility(host);

    visibility.toggleNodeVisibility('char-1');
    visibility.toggleEdgeVisibility('char-1_char-2');

    expect(visibility.isNodeHidden('char-1')).toBe(false);
    expect(visibility.isEdgeHidden('char-1_char-2')).toBe(false);
    expect(host.save).not.toHaveBeenCalled();
  });

  it('applies live updates pushed by the host subscription', () => {
    let push: ((items: HiddenGraphItems) => void) | undefined;
    const host = makeHost({
      subscribe(onChange) {
        push = onChange;
        return () => undefined;
      },
    });
    const visibility = useGraphVisibility(host);

    push!({ nodeIds: ['char-9'], edgeKeys: [] });

    expect(visibility.isNodeHidden('char-9')).toBe(true);
  });

  it('unsubscribes from the host when the hosting scope is disposed', () => {
    const unsubscribe = vi.fn();
    const host = makeHost({ subscribe: () => unsubscribe });
    const scope = effectScope();
    scope.run(() => useGraphVisibility(host));

    scope.stop();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('parseHiddenGraphItems', () => {
  it('accepts a well-formed value and drops non-string entries', () => {
    expect(parseHiddenGraphItems({ nodeIds: ['a', 1, 'b'], edgeKeys: ['a_b', null] })).toEqual({
      nodeIds: ['a', 'b'],
      edgeKeys: ['a_b'],
    });
  });

  it('rejects null, primitives and malformed shapes', () => {
    expect(parseHiddenGraphItems(null)).toBeNull();
    expect(parseHiddenGraphItems('nope')).toBeNull();
    expect(parseHiddenGraphItems({ nodeIds: 'a' })).toBeNull();
    expect(parseHiddenGraphItems({ nodeIds: [], edgeKeys: 'a_b' })).toBeNull();
  });
});

describe('createLocalStorageGraphVisibilityHost', () => {
  const KEY = 'loreweaveui:hidden-graph-items-test';

  afterEach(() => {
    window.localStorage.removeItem(KEY);
  });

  it('treats the standalone user as the game master', () => {
    expect(createLocalStorageGraphVisibilityHost(KEY).isGameMaster).toBe(true);
  });

  it('round-trips hidden items through localStorage', () => {
    const host = createLocalStorageGraphVisibilityHost(KEY);
    const items: HiddenGraphItems = { nodeIds: ['char-1'], edgeKeys: ['char-1_char-2'] };

    host.save(items);

    expect(host.load()).toEqual(items);
  });

  it('returns null when nothing is stored or the data is corrupt', () => {
    const host = createLocalStorageGraphVisibilityHost(KEY);
    expect(host.load()).toBeNull();

    window.localStorage.setItem(KEY, 'not-json{');
    expect(host.load()).toBeNull();

    window.localStorage.setItem(KEY, '{"unexpected":true}');
    expect(host.load()).toBeNull();
  });
});
