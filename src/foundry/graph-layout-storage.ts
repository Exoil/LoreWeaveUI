import type * as vNG from 'v-network-graph';
import type { GraphLayoutStorage } from '@/composables/useGraphLayoutCache';
import { MODULE_ID } from './constants';

/** Settings key for the cached graph layout (registered in `main.ts` on init). */
export const GRAPH_LAYOUT_SETTING = 'graphLayout';

/**
 * Foundry-hosted {@link GraphLayoutStorage}: persists the layout in the
 * client-scoped `graphLayout` module setting (a per-user UI preference —
 * see `.claude/rules/foundry.md`, no raw localStorage inside Foundry).
 */
export function createSettingsGraphLayoutStorage(): GraphLayoutStorage {
  return {
    load(): vNG.Layouts | null {
      const value = game.settings.get(MODULE_ID, GRAPH_LAYOUT_SETTING);
      if (!value || typeof value !== 'object') return null;
      const nodes = (value as { nodes?: unknown }).nodes;
      if (!nodes || typeof nodes !== 'object') return null;
      return value as vNG.Layouts;
    },
    save(layouts: vNG.Layouts): void {
      // set() is async; a failed write only costs the cached layout.
      void game.settings.set(MODULE_ID, GRAPH_LAYOUT_SETTING, layouts);
    },
  };
}
