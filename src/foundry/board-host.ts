import { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { NotificationService } from '@/services/NotificationService';
import { MODULE_ID } from './constants';

/**
 * Correlates the backend board with the Foundry world. Inside Foundry the
 * user never picks a board: the GM's client lazily creates one (named
 * {@link DEFAULT_BOARD_NAME}; the GM renames it in the board settings) and
 * stores its id in the world-scoped `boardId` setting; every client (GM and
 * players) then resolves the same board from that setting.
 */

/** Settings key for the backend board linked to this world (world scope). */
export const BOARD_ID_SETTING = 'boardId';

/** Name every auto-created world board starts with (renameable by the GM). */
export const DEFAULT_BOARD_NAME = 'NewWorld';

function readStoredBoardId(): string {
  const value = game.settings.get(MODULE_ID, BOARD_ID_SETTING);
  return typeof value === 'string' ? value : '';
}

/**
 * Resolve the backend board for this world, creating it when needed.
 *
 * - Players always trust the stored link — only the GM may create boards, so
 *   a missing link means the GM has not opened LoreWeave yet.
 * - The GM verifies the stored id on every resolve and recreates the board
 *   when the backend no longer knows it (e.g. the API database was reset) —
 *   same self-healing contract as the document-sync links.
 */
export async function ensureWorldBoardAsync(getApiBaseUrl: () => string): Promise<string> {
  const storedId = readStoredBoardId();

  if (!game.user?.isGM) {
    if (storedId) return storedId;
    throw new Error('LoreWeave: this world has no board yet — ask the GM to open LoreWeave once.');
  }

  if (storedId) {
    // Probe with a notification-less service: a 404 here is a normal
    // negative answer, not an error to toast at the GM.
    const probe = new LoreWeaveApiService(getApiBaseUrl());
    if (await probe.boardExistsAsync(storedId)) return storedId;
  }

  const notifications = new NotificationService();
  notifications.onNotification((n) => ui.notifications?.error(`LoreWeave: ${n.message}`));
  const service = new LoreWeaveApiService(getApiBaseUrl(), notifications);
  const boardId = await service.createBoardAsync(DEFAULT_BOARD_NAME);
  await game.settings.set(MODULE_ID, BOARD_ID_SETTING, boardId);
  return boardId;
}

/**
 * Board resolver provided to the Vue app (see `BOARD_RESOLVER_KEY`): App.vue
 * awaits it instead of showing the standalone board picker.
 */
export function createWorldBoardResolver(getApiBaseUrl: () => string): () => Promise<string> {
  return () => ensureWorldBoardAsync(getApiBaseUrl);
}
