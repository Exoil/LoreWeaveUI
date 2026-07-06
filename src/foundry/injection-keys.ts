import type { InjectionKey } from 'vue';
import type { GraphLayoutStorage } from '@/composables/useGraphLayoutCache';
import type { GraphVisibilityHost } from '@/composables/useGraphVisibility';
import type { GraphLayoutSyncChannel } from '@/composables/useGraphLayoutSync';

// Injection keys shared between hosts (standalone SPA / Foundry module) and
// App.vue. Living under foundry/ because they primarily exist to let the
// Foundry host feed configuration into the otherwise host-agnostic SPA.

// The HTTP base URL the LoreWeaveApiService should prefix to its requests.
// Empty string = same origin (standalone SPA behind nginx). Non-empty =
// absolute URL to the gateway (Foundry module path).
export const API_BASE_URL_KEY: InjectionKey<string> = Symbol('loreWeaveApiBaseUrl');

// Where the graph layout (node positions) is persisted. The Foundry host
// provides a game.settings-backed implementation; when absent App.vue falls
// back to namespaced localStorage (standalone SPA).
export const GRAPH_LAYOUT_STORAGE_KEY: InjectionKey<GraphLayoutStorage> = Symbol(
  'loreWeaveGraphLayoutStorage',
);

// Role + persistence for the GM's hidden nodes/edges. The Foundry host backs
// it with the world-scoped `hiddenGraphItems` setting (GM-writable, player-
// readable, live-synced); when absent App.vue falls back to localStorage with
// the user treated as GM (standalone SPA).
export const GRAPH_VISIBILITY_HOST_KEY: InjectionKey<GraphVisibilityHost> = Symbol(
  'loreWeaveGraphVisibilityHost',
);

// Realtime transport for the GM's node positions. The Foundry host backs it
// with `game.socket`; the standalone SPA has no other clients, so App.vue
// falls back to `null` (sync disabled).
export const GRAPH_LAYOUT_SYNC_KEY: InjectionKey<GraphLayoutSyncChannel | null> = Symbol(
  'loreWeaveGraphLayoutSync',
);
