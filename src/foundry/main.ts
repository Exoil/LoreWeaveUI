/**
 * Foundry module entry point: registers settings + the module API on `init`,
 * adds the scene-control button that opens the LoreWeave window, and reacts to
 * the GM changing the API base URL. The standalone SPA uses `src/main.ts`
 * instead.
 */
import { LoreWeaveApp } from './LoreWeaveApp';
import { MODULE_ID } from './constants';
import { GRAPH_LAYOUT_SETTING } from './graph-layout-storage';
import { HIDDEN_GRAPH_ITEMS_SETTING } from './graph-visibility-host';
import {
  DOCUMENT_LINKS_SETTING,
  GRAPH_REVISION_SETTING,
  registerDocumentSyncHooks,
} from './document-sync';

export { MODULE_ID };

// Single instance — Foundry windows are cheap, but the graph state is
// expensive to rebuild, so we keep one across open/close cycles.
let appInstance: LoreWeaveApp | null = null;

/** Read the configured backend base URL from world settings (''. if unset/invalid). */
function getApiBaseUrl(): string {
  const value = game.settings.get(MODULE_ID, 'apiBaseUrl');
  return typeof value === 'string' ? value : '';
}

/** Lazily create (and reuse) the single {@link LoreWeaveApp} window instance. */
function getApp(): LoreWeaveApp {
  // The base URL is captured once on first open. If the GM changes the
  // setting they must close and reopen the window; we don't hot-swap the
  // service URL while a window is alive.
  if (!appInstance) appInstance = new LoreWeaveApp(getApiBaseUrl());
  return appInstance;
}

/**
 * Open (rendering) the LoreWeave window, surfacing any failure in both the
 * console and Foundry's notification toaster.
 *
 * Errors thrown during ApplicationV2 construction or render() are swallowed
 * silently when the scene-control click handler is fire-and-forget, leaving
 * the user with no feedback and a button that "does nothing". Funnelling both
 * the sync and async paths through here makes failures visible.
 */
function openWindow(): void {
  try {
    const app = getApp();
    console.log(`[${MODULE_ID}] opening window`);
    const result = app.render(true);
    Promise.resolve(result).catch((err) => {
      console.error(`[${MODULE_ID}] render() rejected:`, err);
      (
        globalThis as { ui?: { notifications?: { error?: (m: string) => void } } }
      ).ui?.notifications?.error?.(
        `LoreWeave failed to open: ${String((err as Error)?.message ?? err)}`,
      );
    });
  } catch (err) {
    console.error(`[${MODULE_ID}] open threw:`, err);
    (
      globalThis as { ui?: { notifications?: { error?: (m: string) => void } } }
    ).ui?.notifications?.error?.(
      `Loreweave failed to open: ${String((err as Error)?.message ?? err)}`,
    );
  }
}

Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'apiBaseUrl', {
    name: `${MODULE_ID}.settings.apiBaseUrl.name`,
    hint: `${MODULE_ID}.settings.apiBaseUrl.hint`,
    scope: 'world',
    config: true,
    type: String,
    default: 'http://localhost:8080',
  });

  // Cached graph node positions, hidden from the settings sheet. World scope:
  // the GM's arrangement is canonical for everyone — the layout cache writes
  // it when the GM closes the window, players only read it.
  game.settings.register(MODULE_ID, GRAPH_LAYOUT_SETTING, {
    scope: 'world',
    config: false,
    type: Object,
    default: null,
  });

  // Nodes/edges the GM hid from players. World scope: only the GM can write
  // it, players read it, and Foundry syncs changes to connected clients.
  game.settings.register(MODULE_ID, HIDDEN_GRAPH_ITEMS_SETTING, {
    scope: 'world',
    config: false,
    type: Object,
    default: null,
  });

  // Links between Foundry documents (actors/journals) and the backend ids
  // they were synced to, plus the hidden system character's id.
  game.settings.register(MODULE_ID, DOCUMENT_LINKS_SETTING, {
    scope: 'world',
    config: false,
    type: Object,
    default: null,
  });

  // Bumped by the GM's client after every document sync: `{ revision, change }`.
  // Open windows on all clients apply the carried change incrementally, or
  // re-fetch the whole graph when no change descriptor is present.
  game.settings.register(MODULE_ID, GRAPH_REVISION_SETTING, {
    scope: 'world',
    config: false,
    type: Object,
    default: null,
  });

  const mod = game.modules.get(MODULE_ID);
  if (mod) {
    mod.api = {
      version: '0.1.0',
      open: () => openWindow(),
      getApiBaseUrl,
    };
  }
});

// React when the GM changes the apiBaseUrl world setting: tear down the
// current window so the next open reconstructs the service with the new URL.
// Cheaper than plumbing a reactive ref into App.vue, and the UX is honest —
// the user sees the window close, knows the change took effect, reopens it.
Hooks.on('updateSetting', (setting: unknown) => {
  const key = (setting as { key?: string } | null)?.key;
  if (key !== `${MODULE_ID}.apiBaseUrl`) return;
  if (!appInstance) return;
  const closing = appInstance;
  appInstance = null;
  void closing.close();
});

Hooks.on('getSceneControlButtons', (controls: unknown) => {
  // Add our "open" action as a button-tool inside an existing group rather
  // than registering a new standalone group. A standalone group needs a real
  // canvas layer (tokens, walls, lighting, …); `layer: 'controls'` is not
  // one, so v14 silently fails to activate the group and the secondary
  // toolbar — which is where the actual click target lives — never appears.
  // The `tokens` group is always present and active by default, so a button
  // hosted there is reachable in one click on world load.
  const openTool = {
    name: `${MODULE_ID}-open`,
    title: `${MODULE_ID}.controls.open`,
    icon: 'fas fa-sitemap',
    button: true,
    visible: true,
    // v14 passes (event, active); we ignore both and just open the window.
    onChange: () => {
      console.log(`[${MODULE_ID}] tool onChange fired`);
      openWindow();
    },
    // v12 fallback — harmless on v14.
    onClick: () => {
      console.log(`[${MODULE_ID}] tool onClick fired`);
      openWindow();
    },
  };

  if (Array.isArray(controls)) {
    // v12: controls is an array of groups, each with a `tools` array.
    const tokens = controls.find((g) => g?.name === 'token' || g?.name === 'tokens');
    if (tokens && Array.isArray(tokens.tools)) tokens.tools.push(openTool);
    return;
  }

  if (controls && typeof controls === 'object') {
    // v13+: controls is a record keyed by group name; tools is a record too.
    const map = controls as Record<string, { tools?: Record<string, unknown> }>;
    console.log(`[${MODULE_ID}] getSceneControlButtons groups:`, Object.keys(map));
    const tokens = map.tokens ?? map.token;
    if (tokens && tokens.tools && typeof tokens.tools === 'object') {
      tokens.tools[`${MODULE_ID}-open`] = openTool;
      console.log(`[${MODULE_ID}] tool installed in 'tokens' group`);
    } else {
      console.warn(`[${MODULE_ID}] 'tokens' group has no tools record:`, tokens);
    }
  }
});

// Belt-and-braces: in v14 the SceneControls ApplicationV2 may render our
// tool but, depending on point-release internals, can drop the function
// references stored in the tool config. Attach a direct DOM listener to the
// rendered button after every SceneControls render so the click is caught
// even if Foundry's own dispatcher misses it.
Hooks.on('renderSceneControls', (_app: unknown, html: unknown) => {
  const root = html instanceof HTMLElement ? html : (html as { 0?: HTMLElement })?.[0];
  if (!(root instanceof HTMLElement)) return;
  // Foundry tools render with `data-tool="<tool name>"`.
  const btn = root.querySelector(`[data-tool="${MODULE_ID}-open"]`);
  if (!(btn instanceof HTMLElement)) return;
  if (btn.dataset.loreWeaveUiBound === '1') return;
  btn.dataset.loreWeaveUiBound = '1';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`[${MODULE_ID}] direct DOM click fired`);
    openWindow();
  });
  console.log(`[${MODULE_ID}] backup click listener attached`);
});

// Mirror Foundry actors and journal handouts into the backend graph. The
// handlers are GM-gated internally, so registering unconditionally is safe.
registerDocumentSyncHooks(getApiBaseUrl);

Hooks.once('ready', () => {
  console.log(`[${MODULE_ID}] ready — API base URL:`, getApiBaseUrl());
});

export { LoreWeaveApp };
