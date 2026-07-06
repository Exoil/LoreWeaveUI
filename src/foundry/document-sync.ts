import { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { NotificationService } from '@/services/NotificationService';
import { UpdateCharacter } from '@/services/Models/UpdateCharacter';
import { UpdateFact } from '@/services/Models/UpdateFact';
import { parseHiddenGraphItems } from '@/composables/useGraphVisibility';
import {
  CHARACTER_NAME_MAX_LENGTH,
  FACT_TITLE_MAX_LENGTH,
  FACT_CONTENT_MAX_LENGTH,
  clampToLength,
} from '@/services/Models/ValidationRules';
import { MODULE_ID } from './constants';
import { HIDDEN_GRAPH_ITEMS_SETTING } from './graph-visibility-host';
import { subscribeToSettingChanges } from './setting-events';
import type { GraphDataChange, GraphRefreshSource } from './injection-keys';

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

/**
 * The fact content for a journal entry: the first page with text content
 * (Foundry v10+ journals are page collections), or '' for empty journals.
 */
export function extractJournalContent(journal: unknown): string {
  const pages = (journal as { pages?: { contents?: unknown[] } } | null)?.pages?.contents;
  if (!Array.isArray(pages)) return '';
  for (const page of pages) {
    const content = (page as { text?: { content?: unknown } } | null)?.text?.content;
    if (typeof content === 'string' && content.length > 0) return content;
  }
  return '';
}

/** Stand-in content for journals without any text yet (the contract requires 1+ chars). */
export const EMPTY_JOURNAL_FACT_CONTENT = '(empty handout)';

/**
 * Fit journal-derived text into the fact-content contract (1..3000): empty
 * journals get a placeholder, oversized ones are truncated — a Foundry
 * document must never make the sync 400.
 */
export function toFactContent(raw: string): string {
  if (raw.length === 0) return EMPTY_JOURNAL_FACT_CONTENT;
  return clampToLength(raw, FACT_CONTENT_MAX_LENGTH);
}

/** `{ id, name }` of a Foundry document, or null when the payload is malformed. */
function readDocumentIdentity(doc: unknown): { id: string; name: string } | null {
  const { id, name } = (doc ?? {}) as { id?: unknown; name?: unknown };
  if (typeof id !== 'string' || typeof name !== 'string') return null;
  return { id, name };
}

/**
 * The parent journal of a JournalEntryPage document (the page hooks hand us
 * the page; the fact is linked to the *entry*), or null when malformed.
 */
export function readPageParentJournal(
  page: unknown,
): { id: string; name: string; journal: unknown } | null {
  const journal = (page as { parent?: unknown } | null)?.parent;
  const identity = readDocumentIdentity(journal);
  return identity ? { ...identity, journal } : null;
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
 * in Foundry's toaster instead of the (possibly closed) Vue window.
 */
function makeService(getApiBaseUrl: () => string): LoreWeaveApiService {
  const notifications = new NotificationService();
  notifications.onNotification((n) => ui.notifications?.error(`LoreWeave sync: ${n.message}`));
  return new LoreWeaveApiService(getApiBaseUrl(), notifications);
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
    const actor = readDocumentIdentity(doc);
    if (!actor) return;
    runSync('createActor', async () => {
      const links = loadLinks();
      if (links.actors[actor.id]) return; // already linked (re-fired hook)
      const characterId = await makeService(getApiBaseUrl).createCharacterAsync(
        clampToLength(actor.name, CHARACTER_NAME_MAX_LENGTH),
      );
      links.actors[actor.id] = characterId;
      await saveLinks(links);
      await bumpGraphRevision({ kind: 'character', action: 'created', characterId });
    });
  });

  Hooks.on('updateActor', (doc: unknown, changes: unknown) => {
    const actor = readDocumentIdentity(doc);
    const newName = (changes as { name?: unknown } | null)?.name;
    if (!actor || typeof newName !== 'string') return;
    runSync('updateActor', async () => {
      const characterId = loadLinks().actors[actor.id];
      if (!characterId) return; // actor predates the module — not linked
      const service = makeService(getApiBaseUrl);
      // Renames need the character's current version (ETag) for the
      // backend's optimistic-concurrency check.
      const current = await service.getCharacterAsync(characterId);
      await service.updateCharacterAsync(
        new UpdateCharacter(
          characterId,
          clampToLength(newName, CHARACTER_NAME_MAX_LENGTH),
          current.version,
        ),
      );
      await bumpGraphRevision({ kind: 'character', action: 'updated', characterId });
    });
  });

  Hooks.on('deleteActor', (doc: unknown) => {
    const actor = readDocumentIdentity(doc);
    if (!actor) return;
    runSync('deleteActor', async () => {
      const links = loadLinks();
      const characterId = links.actors[actor.id];
      if (!characterId) return;
      await makeService(getApiBaseUrl).deleteCharacterAsync(characterId);
      delete links.actors[actor.id];
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
      // negative answer, not an error to toast at the GM.
      const probe = new LoreWeaveApiService(getApiBaseUrl());
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
    const journal = readDocumentIdentity(doc);
    if (!journal) return;
    runSync('createJournalEntry', async () => {
      const links = loadLinks();
      if (links.journals[journal.id]) return;
      const service = makeService(getApiBaseUrl);
      const systemCharacterId = await ensureSystemCharacterAsync(service);
      const factId = await service.addFactToCharacterAsync(
        systemCharacterId,
        clampToLength(journal.name, FACT_TITLE_MAX_LENGTH),
        toFactContent(extractJournalContent(doc)),
      );
      // Journals are private by default — the fact starts hidden and the GM
      // reveals it with "Show for players" when handing it out.
      await hideFromPlayers(factId);
      const updatedLinks = loadLinks(); // ensureSystemCharacter may have saved
      updatedLinks.journals[journal.id] = factId;
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
    const journal = readDocumentIdentity(doc);
    const newName = (changes as { name?: unknown } | null)?.name;
    if (!journal || typeof newName !== 'string') return;
    runSync('updateJournalEntry', async () => {
      const factId = loadLinks().journals[journal.id];
      if (!factId) return;
      const service = makeService(getApiBaseUrl);
      const current = await service.getFactAsync(factId);
      await service.updateFactAsync(
        new UpdateFact(
          factId,
          clampToLength(newName, FACT_TITLE_MAX_LENGTH),
          current.content,
          current.version,
        ),
      );
      await bumpGraphRevision({ kind: 'fact', action: 'updated', factId });
    });
  });

  Hooks.on('deleteJournalEntry', (doc: unknown) => {
    const journal = readDocumentIdentity(doc);
    if (!journal) return;
    runSync('deleteJournalEntry', async () => {
      const links = loadLinks();
      const factId = links.journals[journal.id];
      if (!factId) return;
      await makeService(getApiBaseUrl).deleteFactAsync(factId);
      delete links.journals[journal.id];
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
    const parent = readPageParentJournal(page);
    if (!parent) return;
    runSync(operation, async () => {
      const factId = loadLinks().journals[parent.id];
      if (!factId) return;
      const content = toFactContent(extractJournalContent(parent.journal));
      const service = makeService(getApiBaseUrl);
      const current = await service.getFactAsync(factId);
      if (current.content === content) return;
      await service.updateFactAsync(
        new UpdateFact(factId, current.title, content, current.version),
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
