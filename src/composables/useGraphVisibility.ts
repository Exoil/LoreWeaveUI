import { onScopeDispose, ref } from 'vue';

/**
 * The persisted shape of the GM's hidden graph items: the {@link GraphElement}
 * keys of everything hidden — node ids and edge keys share one namespace
 * (edge keys always contain the separator, node ids never do).
 */
export interface HiddenGraphItems {
  keys: string[];
}

/**
 * Host-provided access to the hidden-items store and the current user's role.
 * The Foundry host backs this with a world-scoped setting (GM-writable, synced
 * to every client); the standalone SPA falls back to localStorage with the
 * user treated as the game master.
 */
export interface GraphVisibilityHost {
  /** Whether the current user is the game master (may hide/show items and sees everything). */
  isGameMaster: boolean;
  load(): HiddenGraphItems | null;
  save(items: HiddenGraphItems): void;
  /**
   * Optional live updates for when another client (the GM) changes the hidden
   * set while this app is open. Returns an unsubscribe function.
   */
  subscribe?(onChange: (items: HiddenGraphItems) => void): () => void;
}

/** localStorage-backed {@link GraphVisibilityHost} for the standalone SPA (always GM). */
export function createLocalStorageGraphVisibilityHost(storageKey: string): GraphVisibilityHost {
  return {
    isGameMaster: true,
    load(): HiddenGraphItems | null {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      try {
        return parseHiddenGraphItems(JSON.parse(raw));
      } catch {
        return null;
      }
    },
    save(items: HiddenGraphItems): void {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    },
  };
}

/**
 * Narrow an untrusted persisted value into {@link HiddenGraphItems}, or `null`.
 * Also accepts the legacy `{ nodeIds, edgeKeys }` shape written by earlier
 * builds of this branch, folding both lists into the unified key set.
 */
export function parseHiddenGraphItems(value: unknown): HiddenGraphItems | null {
  if (!value || typeof value !== 'object') return null;
  const { keys, nodeIds, edgeKeys } = value as {
    keys?: unknown;
    nodeIds?: unknown;
    edgeKeys?: unknown;
  };
  if (Array.isArray(keys)) {
    return { keys: keys.filter((v): v is string => typeof v === 'string') };
  }
  if (Array.isArray(nodeIds) && Array.isArray(edgeKeys)) {
    return {
      keys: [...nodeIds, ...edgeKeys].filter((v): v is string => typeof v === 'string'),
    };
  }
  return null;
}

/**
 * Owns which graph elements the GM has hidden from players, addressed by
 * their {@link GraphElement} key — one API for character nodes, fact nodes
 * and edges alike. The GM still sees hidden items (rendered faded by
 * useGraphConfiguration); players never receive them (useGraphData filters
 * them out of the projected nodes/edges).
 *
 * Only the game master can toggle visibility — for players the toggle is a
 * no-op, and the Foundry world-scoped setting refuses non-GM writes anyway.
 *
 * @param host role + persistence provided by the hosting environment
 *   (see {@link GraphVisibilityHost}).
 */
export function useGraphVisibility(host: GraphVisibilityHost) {
  const isGameMaster = host.isGameMaster;
  const hiddenKeys = ref<Set<string>>(new Set());

  // The set is replaced (not mutated) on every change so reactivity is driven
  // by plain ref reassignment.
  function apply(items: HiddenGraphItems): void {
    hiddenKeys.value = new Set(items.keys);
  }

  const saved = host.load();
  if (saved) apply(saved);

  // Players with an open window pick up the GM's changes live.
  const unsubscribe = host.subscribe?.((items) => apply(items));
  onScopeDispose(() => unsubscribe?.());

  function persist(): void {
    host.save({ keys: [...hiddenKeys.value] });
  }

  /** Whether the element with the given {@link GraphElement} key is hidden from players. */
  function isHidden(key: string): boolean {
    return hiddenKeys.value.has(key);
  }

  /** GM only: hide the element if visible, show it if hidden. */
  function toggleVisibility(key: string): void {
    if (!isGameMaster) return;
    const next = new Set(hiddenKeys.value);
    if (!next.delete(key)) next.add(key);
    hiddenKeys.value = next;
    persist();
  }

  return {
    isGameMaster,
    hiddenKeys,
    isHidden,
    toggleVisibility,
  };
}

/** Return type of {@link useGraphVisibility}, for passing the visibility around. */
export type GraphVisibility = ReturnType<typeof useGraphVisibility>;
