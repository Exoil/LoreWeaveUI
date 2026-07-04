import type { InjectionKey } from 'vue';
import type { GraphLayoutStorage } from '@/composables/useGraphLayoutCache';

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
