import { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { NotificationService } from '@/services/NotificationService';
import { UpdateCharacter } from '@/services/Models/UpdateCharacter';
import { UpdateFact } from '@/services/Models/UpdateFact';
import { parseHiddenGraphItems } from '@/composables/useGraphVisibility';
import { MODULE_ID } from './constants';
import { ensureWorldBoardAsync } from './board-host';
import { ActorCharacter } from './ActorCharacter';
import { JournalFact, EMPTY_JOURNAL_FACT_CONTENT } from './JournalFact';
import { HIDDEN_GRAPH_ITEMS_SETTING } from './graph-visibility-host';
import { subscribeToSettingChanges } from './setting-events';
import type { GraphDataChange, GraphRefreshSource, LinkedDocumentUpdater } from './injection-keys';

/**
 * Mirrors Foundry documents into the RpgAssistant backend so the graph follows
 * the world's actual content:
 *
 *  - Actors (character sheets): create → new graph character, rename → node
 *    rename, delete → node removal. Purely additive — the GM can still manage
 *    characters directly on the graph.
 *  - JournalEntries (handouts): become facts. The backend cannot store a free
 *    fact, so they attach to a lazily created **hidden system character**;
 *    both the system character and each new handout-fact start hidden from
 *    players (journals are private by default) — the GM reveals a fact with
 *    "Show for players".
 *
 * Only the GM's client talks to the API (hooks fire on every client — the
 * others would duplicate the calls). After every successful sync the
 * `graphRevision` world setting is bumped; Foundry replicates the change to
 * every client and open LoreWeave windows re-fetch the graph.
 */

/** Settings key for the Foundry-document ↔ backend-id links (world scope). */
export const DOCUMENT_LINKS_SETTING = 'documentLinks';
/** Settings key for the bump-to-refresh graph revision counter (world scope). */
export const GRAPH_REVISION_SETTING = 'graphRevision';
/** Name of the hidden character that anchors handout-facts on the backend. */
export const SYSTEM_CHARACTER_NAME = 'LoreWeave System';

/** Persisted links between Foundry document ids and backend ids. */
export interface DocumentLinks {
  /** Foundry actor id → backend character id. */
  actors: Record<string, string>;
  /** Foundry journal-entry id → backend fact id. */
  journals: Record<string, string>;
  /** Backend id of the hidden system character ('' until first needed). */
  systemCharacterId: string;
}

function toStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

/** Narrow an untrusted persisted value into {@link DocumentLinks} (never null — links are additive). */
export function parseDocumentLinks(value: unknown): DocumentLinks {
  const { actors, journals, systemCharacterId } = (value ?? {}) as {
    actors?: unknown;
    journals?: unknown;
    systemCharacterId?: unknown;
  };
  return {
    actors: toStringRecord(actors),
    journals: toStringRecord(journals),
    systemCharacterId: typeof systemCharacterId === 'string' ? systemCharacterId : '',
  };
}

function loadLinks(): DocumentLinks {
  return parseDocumentLinks(game.settings.get(MODULE_ID, DOCUMENT_LINKS_SETTING));
}

async function saveLinks(links: DocumentLinks): Promise<void> {
  await game.settings.set(MODULE_ID, DOCUMENT_LINKS_SETTING, links);
}

/**
 * Narrow the persisted revision signal. Accepts the legacy plain-number shape
 * from earlier builds (treated as "full refresh").
 */
export function parseGraphChangeSignal(value: unknown): {
  revision: number;
  change: GraphDataChange | null;
} {
  if (typeof value === 'number') return { revision: value, change: null };
  if (!value || typeof value !== 'object') return { revision: 0, change: null };
  const { revision, change } = value as { revision?: unknown; change?: unknown };
  const parsedRevision = typeof revision === 'number' ? revision : 0;
  const { kind, action, characterId, factId } = (change ?? {}) as {
    kind?: unknown;
    action?: unknown;
    characterId?: unknown;
    factId?: unknown;
  };
  if (action === 'created' || action === 'updated' || action === 'deleted') {
    // `kind` may be absent on signals from builds that only knew characters.
    if ((kind === 'character' || kind === undefined) && typeof characterId === 'string') {
      return { revision: parsedRevision, change: { kind: 'character', action, characterId } };
    }
    if (kind === 'fact' && typeof factId === 'string') {
      return {
        revision: parsedRevision,
        change: {
          kind: 'fact',
          action,
          factId,
          ...(typeof characterId === 'string' ? { characterId } : {}),
        },
      };
    }
  }
  return { revision: parsedRevision, change: null };
}

/**
 * Signal every client's open window that the graph changed. With a
 * {@link GraphDataChange} the windows apply it via one targeted fetch;
 * without one they re-fetch the whole graph.
 */
async function bumpGraphRevision(change?: GraphDataChange): Promise<void> {
  const { revision } = parseGraphChangeSignal(game.settings.get(MODULE_ID, GRAPH_REVISION_SETTING));
  await game.settings.set(MODULE_ID, GRAPH_REVISION_SETTING, {
    revision: revision + 1,
    change: change ?? null,
  });
}

/** Add the element key to the GM's hidden set so players never see it. */
async function hideFromPlayers(key: string): Promise<void> {
  const items = parseHiddenGraphItems(game.settings.get(MODULE_ID, HIDDEN_GRAPH_ITEMS_SETTING)) ?? {
    keys: [],
  };
  if (items.keys.includes(key)) return;
  await game.settings.set(MODULE_ID, HIDDEN_GRAPH_ITEMS_SETTING, {
    keys: [...items.keys, key],
  });
}

/** The Foundry document id linked to the given backend id, or undefined. */
export function findLinkedDocumentId(
  links: Record<string, string>,
  backendId: string,
): string | undefined {
  return Object.keys(links).find((documentId) => links[documentId] === backendId);
}

/**
 * Foundry-hosted {@link LinkedDocumentUpdater}: mirrors graph-side edits back
 * onto the linked documents. Strictly link-gated (graph-only characters and
 * facts never touch Foundry) and loop-safe — the document update re-fires our
 * own sync hooks, whose no-change guards stop the echo.
 */
export function createLinkedDocumentUpdater(): LinkedDocumentUpdater {
  return {
    renameLinkedActor(characterId: string, name: string): void {
      if (!game.user?.isGM) return;
      const actorId = findLinkedDocumentId(loadLinks().actors, characterId);
      if (!actorId) return;
      const actor = game.actors?.get(actorId);
      if (!actor || actor.name === name) return;
      void actor.update({ name });
    },
    updateLinkedJournal(factId: string, title: string, content: string): void {
      if (!game.user?.isGM) return;
      const journalId = findLinkedDocumentId(loadLinks().journals, factId);
      if (!journalId) return;
      const journal = game.journal?.get(journalId);
      if (!journal) return;
      if (journal.name !== title) void journal.update({ name: title });
      // Never write the empty-journal placeholder back into the handout.
      if (content === EMPTY_JOURNAL_FACT_CONTENT) return;
      // Update the first text page, or create one for a page-less journal.
      const pages = journal.pages?.contents ?? [];
      const textPage = pages.find(
        (page) => typeof (page as { text?: { content?: unknown } } | null)?.text === 'object',
      ) as
        | { text?: { content?: string }; update?(data: Record<string, unknown>): Promise<unknown> }
        | undefined;
      if (textPage?.update) {
        if (textPage.text?.content === content) return;
        void textPage.update({ text: { content } });
        return;
      }
      void journal.createEmbeddedDocuments?.('JournalEntryPage', [
        { name: title, type: 'text', text: { content } },
      ]);
    },
  };
}

/**
 * Accessor for the hidden system character's backend id ('' while none
 * exists). A getter, not a value: the character is created lazily by the
 * first handout sync, possibly while a window is already open.
 */
export function createSystemCharacterIdAccessor(): () => string {
  return () => loadLinks().systemCharacterId;
}

/**
 * Foundry-hosted refresh signal for the Vue app: fires whenever any client
 * bumps `graphRevision` (Foundry replicates world-setting updates to every
 * connected client, including the initiator), handing over the incremental
 * change descriptor when the signal carries one.
 */
export function createSettingsGraphRefreshSource(): GraphRefreshSource {
  return {
    subscribe(onRefresh: (change: GraphDataChange | null) => void): () => void {
      return subscribeToSettingChanges(`${MODULE_ID}.${GRAPH_REVISION_SETTING}`, () => {
        const { change } = parseGraphChangeSignal(
          game.settings.get(MODULE_ID, GRAPH_REVISION_SETTING),
        );
        onRefresh(change);
      });
    },
  };
}

/**
 * A fresh API service per operation: sync events are rare, and rebuilding the
 * service means an apiBaseUrl change is always picked up. HTTP errors surface
 * in Foundry's toaster instead of the (possibly closed) Vue window. The
 * service is scoped to the world's board (created on first use — only the
 * GM's client runs sync operations, and the GM may create boards).
 */
async function makeServiceAsync(getApiBaseUrl: () => string): Promise<LoreWeaveApiService> {
  const notifications = new NotificationService();
  notifications.onNotification((n) => ui.notifications?.error(`LoreWeave sync: ${n.message}`));
  const service = new LoreWeaveApiService(getApiBaseUrl(), notifications);
  service.setActiveBoard(await ensureWorldBoardAsync(getApiBaseUrl));
  return service;
}

/**
 * Register the Actor and JournalEntry sync hooks. Call once at module load;
 * every handler no-ops for non-GM users, so registration order is safe.
 *
 * @param getApiBaseUrl reads the backend base URL from world settings at call
 *   time (the GM can change it without reloading).
 */
export function registerDocumentSyncHooks(getApiBaseUrl: () => string): void {
  /** Shared guard + error funnel: sync must never break the Foundry UI. */
  function runSync(operation: string, work: () => Promise<void>): void {
    if (!game.user?.isGM) return;
    work().catch((err) => {
      // HTTP errors already toast via the service; log everything for triage.
      console.error(`[${MODULE_ID}] ${operation} sync failed:`, err);
    });
  }

  // --- Actors (character sheets) → graph characters -----------------------
  Hooks.on('createActor', (doc: unknown) => {
    const actor = ActorCharacter.fromDocument(doc);
    if (!actor) return;
    runSync('createActor', async () => {
      const links = loadLinks();
      if (links.actors[actor.actorId]) return; // already linked (re-fired hook)
      const service = await makeServiceAsync(getApiBaseUrl);
      const characterId = await service.createCharacterAsync(actor.name);
      links.actors[actor.actorId] = characterId;
      await saveLinks(links);
      await bumpGraphRevision({ kind: 'character', action: 'created', characterId });
    });
  });

  Hooks.on('updateActor', (doc: unknown, changes: unknown) => {
    // The hook fires for any actor change; only renames concern the graph.
    if (typeof (changes as { name?: unknown } | null)?.name !== 'string') return;
    const actor = ActorCharacter.fromDocument(doc); // doc already carries the new name
    if (!actor) return;
    runSync('updateActor', async () => {
      const characterId = loadLinks().actors[actor.actorId];
      if (!characterId) return; // actor predates the module — not linked
      const service = await makeServiceAsync(getApiBaseUrl);
      // Renames need the character's current version (ETag) for the
      // backend's optimistic-concurrency check.
      const current = await service.getCharacterAsync(characterId);
      // Loop breaker: a graph-side rename mirrored onto the actor re-fires
      // this hook with a name the backend already has.
      if (current.name === actor.name) return;
      await service.updateCharacterAsync(
        new UpdateCharacter(characterId, actor.name, current.version),
      );
      await bumpGraphRevision({ kind: 'character', action: 'updated', characterId });
    });
  });

  Hooks.on('deleteActor', (doc: unknown) => {
    const actor = ActorCharacter.fromDocument(doc);
    if (!actor) return;
    runSync('deleteActor', async () => {
      const links = loadLinks();
      const characterId = links.actors[actor.actorId];
      if (!characterId) return;
      const service = await makeServiceAsync(getApiBaseUrl);
      await service.deleteCharacterAsync(characterId);
      delete links.actors[actor.actorId];
      await saveLinks(links);
      await bumpGraphRevision({ kind: 'character', action: 'deleted', characterId });
    });
  });

  // --- JournalEntries (handouts) → facts on the hidden system character ---

  /**
   * Backend id of the hidden system character, creating (and hiding) it on
   * first use. The world setting only stores a *reference* — the character
   * itself lives in the backend database (the API assigns the id). The stored
   * id is verified on every use and the character is recreated when the
   * backend no longer knows it (e.g. the API database was reset).
   */
  async function ensureSystemCharacterAsync(service: LoreWeaveApiService): Promise<string> {
    const links = loadLinks();
    if (links.systemCharacterId) {
      // Probe with a notification-less service: a 404 here is a normal
      // negative answer, not an error to toast at the GM. Same board as the
      // syncing service — the system character lives on the world's board.
      const probe = new LoreWeaveApiService(getApiBaseUrl());
      probe.setActiveBoard(service.activeBoardId);
      if (await probe.characterExistsAsync(links.systemCharacterId)) {
        return links.systemCharacterId;
      }
    }
    const id = await service.createCharacterAsync(SYSTEM_CHARACTER_NAME);
    const fresh = loadLinks();
    fresh.systemCharacterId = id;
    await saveLinks(fresh);
    await hideFromPlayers(id);
    return id;
  }

  Hooks.on('createJournalEntry', (doc: unknown) => {
    const fact = JournalFact.fromJournal(doc);
    if (!fact) return;
    runSync('createJournalEntry', async () => {
      const links = loadLinks();
      if (links.journals[fact.journalId]) return;
      const service = await makeServiceAsync(getApiBaseUrl);
      const systemCharacterId = await ensureSystemCharacterAsync(service);
      const factId = await service.addFactToCharacterAsync(
        systemCharacterId,
        fact.title,
        fact.content,
      );
      // Journals are private by default — the fact starts hidden and the GM
      // reveals it with "Show for players" when handing it out.
      await hideFromPlayers(factId);
      const updatedLinks = loadLinks(); // ensureSystemCharacter may have saved
      updatedLinks.journals[fact.journalId] = factId;
      await saveLinks(updatedLinks);
      await bumpGraphRevision({
        kind: 'fact',
        action: 'created',
        factId,
        characterId: systemCharacterId,
      });
    });
  });

  Hooks.on('updateJournalEntry', (doc: unknown, changes: unknown) => {
    // The hook fires for any journal change; only renames concern the title.
    if (typeof (changes as { name?: unknown } | null)?.name !== 'string') return;
    const fact = JournalFact.fromJournal(doc); // doc already carries the new name
    if (!fact) return;
    runSync('updateJournalEntry', async () => {
      const factId = loadLinks().journals[fact.journalId];
      if (!factId) return;
      const service = await makeServiceAsync(getApiBaseUrl);
      const current = await service.getFactAsync(factId);
      // Loop breaker: a graph-side fact edit mirrored onto the journal
      // re-fires this hook with a title the backend already has.
      if (current.title === fact.title) return;
      await service.updateFactAsync(
        new UpdateFact(factId, fact.title, current.content, current.version),
      );
      await bumpGraphRevision({ kind: 'fact', action: 'updated', factId });
    });
  });

  Hooks.on('deleteJournalEntry', (doc: unknown) => {
    const fact = JournalFact.fromJournal(doc);
    if (!fact) return;
    runSync('deleteJournalEntry', async () => {
      const links = loadLinks();
      const factId = links.journals[fact.journalId];
      if (!factId) return;
      const service = await makeServiceAsync(getApiBaseUrl);
      await service.deleteFactAsync(factId);
      delete links.journals[fact.journalId];
      await saveLinks(links);
      await bumpGraphRevision({ kind: 'fact', action: 'deleted', factId });
    });
  });

  // --- Journal pages → fact content ---------------------------------------
  // A journal is created empty and its text arrives as pages afterwards, so
  // the fact's content must follow the page lifecycle, not just the entry's.

  /**
   * Re-derive the linked fact's content from the page's parent journal and
   * push it when it changed. The fact keeps its current title — renames are
   * handled by the updateJournalEntry hook.
   */
  function syncJournalContent(operation: string, page: unknown): void {
    const fact = JournalFact.fromPage(page);
    if (!fact) return;
    runSync(operation, async () => {
      const factId = loadLinks().journals[fact.journalId];
      if (!factId) return;
      const service = await makeServiceAsync(getApiBaseUrl);
      const current = await service.getFactAsync(factId);
      if (current.content === fact.content) return;
      await service.updateFactAsync(
        new UpdateFact(factId, current.title, fact.content, current.version),
      );
      await bumpGraphRevision({ kind: 'fact', action: 'updated', factId });
    });
  }

  Hooks.on('createJournalEntryPage', (page: unknown) =>
    syncJournalContent('createJournalEntryPage', page),
  );
  Hooks.on('updateJournalEntryPage', (page: unknown) =>
    syncJournalContent('updateJournalEntryPage', page),
  );
  Hooks.on('deleteJournalEntryPage', (page: unknown) =>
    syncJournalContent('deleteJournalEntryPage', page),
  );
}
