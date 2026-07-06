import type * as vNG from 'v-network-graph';
import type { GraphLayoutSyncChannel } from '@/composables/useGraphLayoutSync';
import { MODULE_ID } from './constants';

// All module socket traffic travels on this one event (see
// `.claude/rules/foundry.md`); the payload `type` field discriminates.
const SOCKET_EVENT = `module.${MODULE_ID}`;
const LAYOUT_UPDATED = 'layoutUpdated';

interface LayoutUpdatedMessage {
  type: typeof LAYOUT_UPDATED;
  layouts: vNG.Layouts;
}

/**
 * Narrow an incoming socket payload to a {@link LayoutUpdatedMessage}. The
 * sender is a peer client, not a trusted backend — every field is checked and
 * only numeric positions survive.
 */
function parseLayoutUpdatedMessage(data: unknown): LayoutUpdatedMessage | null {
  if (!data || typeof data !== 'object') return null;
  const { type, layouts } = data as { type?: unknown; layouts?: unknown };
  if (type !== LAYOUT_UPDATED || !layouts || typeof layouts !== 'object') return null;
  const nodes = (layouts as { nodes?: unknown }).nodes;
  if (!nodes || typeof nodes !== 'object') return null;
  const safeNodes: vNG.Layouts['nodes'] = {};
  for (const [id, position] of Object.entries(nodes)) {
    const { x, y } = (position ?? {}) as { x?: unknown; y?: unknown };
    if (typeof x !== 'number' || typeof y !== 'number') continue;
    safeNodes[id] = { x, y };
  }
  return { type: LAYOUT_UPDATED, layouts: { nodes: safeNodes } };
}

/**
 * Foundry-hosted {@link GraphLayoutSyncChannel}: broadcasts the GM's node
 * positions over `game.socket` (requires `"socket": true` in module.json) so
 * every player with an open LoreWeave window sees the GM rearranging the graph
 * live. Foundry relays the message to every *other* connected client.
 */
export function createSocketGraphLayoutSyncChannel(): GraphLayoutSyncChannel | null {
  const socket = game.socket;
  if (!socket) return null;
  return {
    broadcast(layouts: vNG.Layouts): void {
      socket.emit(SOCKET_EVENT, { type: LAYOUT_UPDATED, layouts } satisfies LayoutUpdatedMessage);
    },
    subscribe(onLayouts: (layouts: vNG.Layouts) => void): () => void {
      const handler = (data: unknown) => {
        const message = parseLayoutUpdatedMessage(data);
        if (message) onLayouts(message.layouts);
      };
      socket.on(SOCKET_EVENT, handler);
      return () => socket.off(SOCKET_EVENT, handler);
    },
  };
}
