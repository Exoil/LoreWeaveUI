import { getCurrentScope, onScopeDispose, ref } from 'vue';
import type * as vNG from 'v-network-graph';

/**
 * Persistence boundary for the graph node positions. The host decides where
 * the layout lives: the standalone SPA uses namespaced `localStorage`, the
 * Foundry module a client-scoped `game.settings` entry (see
 * `.claude/rules/foundry.md` — no raw localStorage inside Foundry).
 */
export interface GraphLayoutStorage {
  /** Previously saved layout, or `null` when absent/corrupt. */
  load(): vNG.Layouts | null;
  /** Persist the given layout (failures may be swallowed — it's just a cache). */
  save(layouts: vNG.Layouts): void;
}

/** `localStorage`-backed layout storage for the standalone SPA host. */
export function createLocalStorageGraphLayoutStorage(storageKey: string): GraphLayoutStorage {
  return {
    load(): vNG.Layouts | null {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        const nodes = (parsed as { nodes?: unknown }).nodes;
        if (!nodes || typeof nodes !== 'object') return null;
        return parsed as vNG.Layouts;
      } catch {
        return null;
      }
    },
    save(layouts: vNG.Layouts): void {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(layouts));
      } catch {
        // Quota/privacy-mode failures only cost the cached layout — not fatal.
      }
    },
  };
}

/**
 * Keeps the graph's node positions across window close/reopen. Bind the
 * returned `layouts` via `v-model:layouts` on `<v-network-graph>`.
 *
 * Restored nodes are pinned (`fixed: true`) so the d3-force simulation leaves
 * them exactly where the user arranged them; nodes without a saved position
 * (new characters/facts) still get auto-placed by the simulation. The layout
 * is saved when the hosting scope is disposed (window closed / app unmounted)
 * and on `beforeunload` (browser tab closed or reloaded).
 *
 * @param storage host-specific persistence (localStorage or Foundry settings).
 * @returns `layouts` to bind, plus `saveNow` for explicit saves.
 */
export function useGraphLayoutCache(storage: GraphLayoutStorage) {
  const saved = storage.load();
  const restoredNodes = Object.fromEntries(
    Object.entries(saved?.nodes ?? {}).map(([id, position]) => [id, { ...position, fixed: true }]),
  );
  const layouts = ref<vNG.Layouts>({ nodes: restoredNodes });

  /** Persist the current node positions immediately. */
  function saveNow(): void {
    storage.save(layouts.value);
  }

  const onBeforeUnload = () => saveNow();
  window.addEventListener('beforeunload', onBeforeUnload);

  // Guarded so the composable can also run outside a component (e.g. tests).
  if (getCurrentScope()) {
    onScopeDispose(() => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      saveNow();
    });
  }

  return { layouts, saveNow };
}
