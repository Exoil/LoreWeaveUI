import { getCurrentScope, onScopeDispose, type Ref } from 'vue';
import type * as vNG from 'v-network-graph';

/**
 * Realtime transport for the GM's node positions. The Foundry host backs this
 * with `game.socket` on the `module.<module-id>` event; the standalone SPA has
 * no other clients, so App.vue injects `null` and the composable no-ops.
 */
export interface GraphLayoutSyncChannel {
  /** Push the given layout to every other connected client. */
  broadcast(layouts: vNG.Layouts): void;
  /** Listen for layouts pushed by other clients. Returns an unsubscribe function. */
  subscribe(onLayouts: (layouts: vNG.Layouts) => void): () => void;
}

/**
 * Makes the GM's node dragging visible to every player live. One direction
 * only: the GM broadcasts the whole layout after each drag (wire
 * `broadcastLayouts` to the graph's `node:dragend`), players apply what
 * arrives into their bound `layouts` — pinned, so the d3-force simulation
 * leaves the GM's arrangement alone.
 *
 * @param layouts the `v-model:layouts` ref from {@link useGraphLayoutCache}.
 * @param channel host transport, or `null` when there is nobody to sync with.
 * @param isGameMaster the GM broadcasts and ignores incoming layouts; players
 *   only receive.
 */
export function useGraphLayoutSync(
  layouts: Ref<vNG.Layouts>,
  channel: GraphLayoutSyncChannel | null,
  isGameMaster: boolean,
) {
  /** GM only: push the current node positions to all connected players. */
  function broadcastLayouts(): void {
    if (!isGameMaster) return;
    channel?.broadcast(layouts.value);
  }

  // Players apply incoming positions pinned so the force layout keeps them.
  const unsubscribe =
    !isGameMaster && channel
      ? channel.subscribe((incoming) => {
          layouts.value = {
            nodes: Object.fromEntries(
              Object.entries(incoming.nodes ?? {}).map(([id, position]) => [
                id,
                { ...position, fixed: true },
              ]),
            ),
          };
        })
      : null;

  // Guarded so the composable can also run outside a component (e.g. tests).
  if (getCurrentScope()) {
    onScopeDispose(() => unsubscribe?.());
  }

  return { broadcastLayouts };
}
