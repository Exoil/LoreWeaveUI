import type * as vNG from 'v-network-graph';
import type { GraphLayoutStorage } from '@/composables/useGraphLayoutCache';
import { MODULE_ID } from './constants';

/** Settings key for the cached graph layout (registered in `main.ts` on init). */
export const GRAPH_LAYOUT_SETTING = 'graphLayout';

/**
 * Foundry-hosted {@link GraphLayoutStorage}: persists the layout in the
 * **world-scoped** `graphLayout` module setting (no raw localStorage inside
 * Foundry — see `.claude/rules/foundry.md`). The GM's arrangement is the
 * canonical one: every client loads it, only the GM writes it (players are
 * view-only and the world scope would reject their writes anyway).
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
      if (!game.user?.isGM) return;
      // set() is async; a failed write only costs the cached layout.
      void game.settings.set(MODULE_ID, GRAPH_LAYOUT_SETTING, layouts);
    },
  };
}
