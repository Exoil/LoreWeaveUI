import { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { NotificationService } from '@/services/NotificationService';
import { BOARD_NAME_MAX_LENGTH, clampToLength } from '@/services/Models/ValidationRules';
import { MODULE_ID } from './constants';

/**
 * Correlates the backend board with the Foundry world. Inside Foundry the
 * user never picks a board: the GM's client lazily creates one named after
 * the world and stores its id in the world-scoped `boardId` setting; every
 * client (GM and players) then resolves the same board from that setting.
 */

/** Settings key for the backend board linked to this world (world scope). */
export const BOARD_ID_SETTING = 'boardId';

/** Fallback board name when the world carries no usable title. */
const FALLBACK_BOARD_NAME = 'LoreWeave Board';

function readStoredBoardId(): string {
  const value = game.settings.get(MODULE_ID, BOARD_ID_SETTING);
  return typeof value === 'string' ? value : '';
}

/** The board name for this world: its title, clamped to the contract limit. */
export function worldBoardName(): string {
  const title = game.world?.title?.trim();
  if (!title) return FALLBACK_BOARD_NAME;
  return clampToLength(title, BOARD_NAME_MAX_LENGTH);
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
  const boardId = await service.createBoardAsync(worldBoardName());
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
