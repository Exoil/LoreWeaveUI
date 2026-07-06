import { onScopeDispose, ref } from 'vue';

/** The persisted shape of the GM's hidden graph items. */
export interface HiddenGraphItems {
  /** Ids of hidden character/fact nodes. */
  nodeIds: string[];
  /** Directed edge keys (`<from><sep><to>`) of individually hidden edges. */
  edgeKeys: string[];
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

/** Narrow an untrusted persisted value into {@link HiddenGraphItems}, or `null`. */
export function parseHiddenGraphItems(value: unknown): HiddenGraphItems | null {
  if (!value || typeof value !== 'object') return null;
  const { nodeIds, edgeKeys } = value as { nodeIds?: unknown; edgeKeys?: unknown };
  if (!Array.isArray(nodeIds) || !Array.isArray(edgeKeys)) return null;
  return {
    nodeIds: nodeIds.filter((v): v is string => typeof v === 'string'),
    edgeKeys: edgeKeys.filter((v): v is string => typeof v === 'string'),
  };
}

/**
 * Owns which nodes and edges the GM has hidden from players. The GM still sees
 * hidden items (rendered faded by useGraphConfiguration); players never receive
 * them (useGraphData filters them out of the projected nodes/edges).
 *
 * Only the game master can toggle visibility — for players the toggle
 * functions are no-ops, and the Foundry world-scoped setting refuses non-GM
 * writes anyway.
 *
 * @param host role + persistence provided by the hosting environment
 *   (see {@link GraphVisibilityHost}).
 */
export function useGraphVisibility(host: GraphVisibilityHost) {
  const isGameMaster = host.isGameMaster;
  const hiddenNodeIds = ref<Set<string>>(new Set());
  const hiddenEdgeKeys = ref<Set<string>>(new Set());

  // Sets are replaced (not mutated) on every change so reactivity is driven by
  // plain ref reassignment.
  function apply(items: HiddenGraphItems): void {
    hiddenNodeIds.value = new Set(items.nodeIds);
    hiddenEdgeKeys.value = new Set(items.edgeKeys);
  }

  const saved = host.load();
  if (saved) apply(saved);

  // Players with an open window pick up the GM's changes live.
  const unsubscribe = host.subscribe?.((items) => apply(items));
  onScopeDispose(() => unsubscribe?.());

  function persist(): void {
    host.save({
      nodeIds: [...hiddenNodeIds.value],
      edgeKeys: [...hiddenEdgeKeys.value],
    });
  }

  /** Whether the given character/fact node is hidden from players. */
  function isNodeHidden(id: string): boolean {
    return hiddenNodeIds.value.has(id);
  }

  /** Whether the given edge key (`<from><sep><to>`) is individually hidden from players. */
  function isEdgeHidden(edgeKey: string): boolean {
    return hiddenEdgeKeys.value.has(edgeKey);
  }

  /** GM only: hide the node if visible, show it if hidden. */
  function toggleNodeVisibility(id: string): void {
    if (!isGameMaster) return;
    const next = new Set(hiddenNodeIds.value);
    if (!next.delete(id)) next.add(id);
    hiddenNodeIds.value = next;
    persist();
  }

  /** GM only: hide the edge if visible, show it if hidden. */
  function toggleEdgeVisibility(edgeKey: string): void {
    if (!isGameMaster) return;
    const next = new Set(hiddenEdgeKeys.value);
    if (!next.delete(edgeKey)) next.add(edgeKey);
    hiddenEdgeKeys.value = next;
    persist();
  }

  return {
    isGameMaster,
    hiddenNodeIds,
    hiddenEdgeKeys,
    isNodeHidden,
    isEdgeHidden,
    toggleNodeVisibility,
    toggleEdgeVisibility,
  };
}

/** Return type of {@link useGraphVisibility}, for passing the visibility around. */
export type GraphVisibility = ReturnType<typeof useGraphVisibility>;
