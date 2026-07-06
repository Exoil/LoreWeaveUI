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

    expect(visibility.hiddenKeys.value.size).toBe(0);
  });

  it('restores the saved hidden items', () => {
    const visibility = useGraphVisibility(makeHost({}, { keys: ['char-1', 'char-1_char-2'] }));

    expect(visibility.isHidden('char-1')).toBe(true);
    expect(visibility.isHidden('char-1_char-2')).toBe(true);
    expect(visibility.isHidden('char-2')).toBe(false);
  });

  it('GM toggling an element hides it and persists the change', () => {
    const host = makeHost();
    const visibility = useGraphVisibility(host);

    visibility.toggleVisibility('char-1');

    expect(visibility.isHidden('char-1')).toBe(true);
    expect(host.save).toHaveBeenCalledWith({ keys: ['char-1'] });
  });

  it('GM toggling a hidden element shows it again', () => {
    const host = makeHost({}, { keys: ['char-1'] });
    const visibility = useGraphVisibility(host);

    visibility.toggleVisibility('char-1');

    expect(visibility.isHidden('char-1')).toBe(false);
    expect(host.save).toHaveBeenCalledWith({ keys: [] });
  });

  it('node ids and edge keys live in one namespace without clashing', () => {
    const host = makeHost();
    const visibility = useGraphVisibility(host);

    visibility.toggleVisibility('char-1_char-2');

    expect(visibility.isHidden('char-1_char-2')).toBe(true);
    expect(visibility.isHidden('char-1')).toBe(false);
    expect(host.save).toHaveBeenCalledWith({ keys: ['char-1_char-2'] });
  });

  it('players cannot toggle anything', () => {
    const host = makeHost({ isGameMaster: false });
    const visibility = useGraphVisibility(host);

    visibility.toggleVisibility('char-1');
    visibility.toggleVisibility('char-1_char-2');

    expect(visibility.isHidden('char-1')).toBe(false);
    expect(visibility.isHidden('char-1_char-2')).toBe(false);
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

    push!({ keys: ['char-9'] });

    expect(visibility.isHidden('char-9')).toBe(true);
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
  it('accepts the current shape and drops non-string entries', () => {
    expect(parseHiddenGraphItems({ keys: ['a', 1, 'a_b', null] })).toEqual({
      keys: ['a', 'a_b'],
    });
  });

  it('accepts the legacy { nodeIds, edgeKeys } shape from earlier builds', () => {
    expect(parseHiddenGraphItems({ nodeIds: ['a', 1], edgeKeys: ['a_b', null] })).toEqual({
      keys: ['a', 'a_b'],
    });
  });

  it('rejects null, primitives and malformed shapes', () => {
    expect(parseHiddenGraphItems(null)).toBeNull();
    expect(parseHiddenGraphItems('nope')).toBeNull();
    expect(parseHiddenGraphItems({ nodeIds: 'a' })).toBeNull();
    expect(parseHiddenGraphItems({ nodeIds: [], edgeKeys: 'a_b' })).toBeNull();
    expect(parseHiddenGraphItems({ keys: 'a' })).toBeNull();
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
    const items: HiddenGraphItems = { keys: ['char-1', 'char-1_char-2'] };

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
