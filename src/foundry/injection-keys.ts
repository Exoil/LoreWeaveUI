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

/**
 * Host-resolved board id. The Foundry module correlates the board with the
 * world (the GM's client creates it on demand — see foundry/board-host), so
 * the user never picks one there. The standalone SPA falls back to `null`
 * and lets the user choose a board via the picker instead.
 */
export const BOARD_RESOLVER_KEY: InjectionKey<(() => Promise<string>) | null> =
  Symbol('loreWeaveBoardResolver');

/**
 * Incremental description of a change synced by the GM's client (Foundry
 * actor/journal → backend). Carried with the refresh signal so open windows
 * can apply it with one targeted fetch instead of re-walking every page.
 * Fact creations name the character the fact is anchored to (the hidden
 * system character) so the window can draw the connection edge.
 */
export type GraphDataChange =
  | { kind: 'character'; action: 'created' | 'updated' | 'deleted'; characterId: string }
  | {
      kind: 'fact';
      action: 'created' | 'updated' | 'deleted';
      factId: string;
      characterId?: string;
    };

/**
 * Host signal that the backend graph data changed (e.g. the GM's client
 * synced a Foundry actor/journal). With a {@link GraphDataChange} the window
 * applies it incrementally; with `null` (legacy/unrecognised signals) it
 * re-fetches the whole graph. The standalone SPA has no external writers, so
 * App.vue falls back to `null` (no subscription).
 */
export interface GraphRefreshSource {
  subscribe(onRefresh: (change: GraphDataChange | null) => void): () => void;
}

export const GRAPH_REFRESH_KEY: InjectionKey<GraphRefreshSource | null> =
  Symbol('loreWeaveGraphRefresh');

// Getter for the hidden system character's backend id ('' when none). The
// system character anchors handout-facts (see foundry/document-sync) and is
// protected in the UI: no delete/rename/reveal. Standalone SPA default: no
// system character.
export const SYSTEM_CHARACTER_ID_KEY: InjectionKey<() => string> = Symbol(
  'loreWeaveSystemCharacterId',
);

/**
 * Mirrors graph-side edits back onto the linked Foundry documents: renaming a
 * character node renames its actor, editing a handout-fact updates its
 * journal. Strictly link-gated — graph-only characters/facts never touch
 * Foundry. The standalone SPA has no documents, so App.vue falls back to
 * `null`.
 */
export interface LinkedDocumentUpdater {
  renameLinkedActor(characterId: string, name: string): void;
  updateLinkedJournal(factId: string, title: string, content: string): void;
}

export const LINKED_DOCUMENT_UPDATER_KEY: InjectionKey<LinkedDocumentUpdater | null> = Symbol(
  'loreWeaveLinkedDocumentUpdater',
);
