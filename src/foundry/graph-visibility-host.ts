import type { GraphVisibilityHost, HiddenGraphItems } from '@/composables/useGraphVisibility';
import { parseHiddenGraphItems } from '@/composables/useGraphVisibility';
import { MODULE_ID } from './constants';

/** Settings key for the GM's hidden graph items (registered in `main.ts` on init). */
export const HIDDEN_GRAPH_ITEMS_SETTING = 'hiddenGraphItems';

/**
 * Foundry-hosted {@link GraphVisibilityHost}: persists the hidden node/edge
 * sets in the **world-scoped** `hiddenGraphItems` module setting. World scope
 * gives exactly the contract the feature needs — only the GM can write it,
 * every player's client can read it, and Foundry syncs changes to connected
 * clients (surfaced to the app via the `updateSetting` hook).
 */
export function createSettingsGraphVisibilityHost(): GraphVisibilityHost {
  return {
    isGameMaster: game.user?.isGM ?? false,
    load(): HiddenGraphItems | null {
      return parseHiddenGraphItems(game.settings.get(MODULE_ID, HIDDEN_GRAPH_ITEMS_SETTING));
    },
    save(items: HiddenGraphItems): void {
      // set() is async and rejects for non-GM users; toggles are GM-gated
      // upstream so a failed write only costs the persisted state.
      void game.settings.set(MODULE_ID, HIDDEN_GRAPH_ITEMS_SETTING, items);
    },
    subscribe(onChange: (items: HiddenGraphItems) => void): () => void {
      const hookId = Hooks.on('updateSetting', (setting: unknown) => {
        const key = (setting as { key?: string } | null)?.key;
        if (key !== `${MODULE_ID}.${HIDDEN_GRAPH_ITEMS_SETTING}`) return;
        // By the time updateSetting fires the local settings storage already
        // holds the new value — re-read it instead of parsing the raw document.
        onChange(
          parseHiddenGraphItems(game.settings.get(MODULE_ID, HIDDEN_GRAPH_ITEMS_SETTING)) ?? {
            nodeIds: [],
            edgeKeys: [],
          },
        );
      });
      return () => Hooks.off('updateSetting', hookId);
    },
  };
}
