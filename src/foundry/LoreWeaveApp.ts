import { createApp, type App as VueApp } from 'vue';
import VNetworkGraph from 'v-network-graph';
import 'v-network-graph/lib/style.css';
import 'bulma/css/bulma.min.css';

import RootComponent from '@/App.vue';
import router from '@/router';

import { MODULE_ID } from './constants';
import {
  API_BASE_URL_KEY,
  GRAPH_LAYOUT_STORAGE_KEY,
  GRAPH_LAYOUT_SYNC_KEY,
  GRAPH_VISIBILITY_HOST_KEY,
} from './injection-keys';
import { createSettingsGraphLayoutStorage } from './graph-layout-storage';
import { createSettingsGraphVisibilityHost } from './graph-visibility-host';
import { createSocketGraphLayoutSyncChannel } from './graph-layout-sync';

const { ApplicationV2 } = foundry.applications.api;

/**
 * Foundry `ApplicationV2` window that owns a single Vue app instance for its
 * lifetime: it creates the app on render and unmounts it on close. Vite library
 * mode bundles Vue + v-network-graph + Bulma into the module — Foundry provides
 * none of these at runtime. The API base URL is injected into the Vue app so the
 * host (not `App.vue`) decides where the backend lives.
 */
export class LoreWeaveApp extends ApplicationV2 {
  static override DEFAULT_OPTIONS = {
    // Distinct from the module id — using the module id verbatim collides
    // with selectors Foundry itself uses (`#loreweaveui` is also where the
    // module's settings panel injects markup).
    id: `${MODULE_ID}-app`,
    window: {
      title: `${MODULE_ID}.title`,
      icon: 'fas fa-sitemap',
      resizable: true,
    },
    position: {
      width: 1100,
      height: 750,
    },
    classes: [MODULE_ID],
  };

  private vueApp: VueApp | null = null;

  /** @param apiBaseUrl backend base URL captured at construction and provided to the Vue app. */
  constructor(
    private readonly apiBaseUrl: string,
    options?: Record<string, unknown>,
  ) {
    super(options);
  }

  /** Build the host element Vue mounts into (carries the `.<id>-root` class for Bulma). */
  protected override async _renderHTML(): Promise<HTMLElement> {
    const host = document.createElement('div');
    host.classList.add(`${MODULE_ID}-root`);
    host.style.width = '100%';
    host.style.height = '100%';
    return host;
  }

  /** Swap our host element into the window's content area. */
  protected override _replaceHTML(result: HTMLElement | string, content: HTMLElement): void {
    content.replaceChildren(result as HTMLElement);
  }

  /** Create + mount the Vue app on first render; subsequent renders are no-ops. */
  protected override async _onRender(): Promise<void> {
    if (this.vueApp) return;

    const host = this.element.querySelector(`.${MODULE_ID}-root`);
    if (!host) return;

    this.vueApp = createApp(RootComponent);
    this.vueApp.use(router).use(VNetworkGraph);
    this.vueApp.provide(API_BASE_URL_KEY, this.apiBaseUrl);
    this.vueApp.provide(GRAPH_LAYOUT_STORAGE_KEY, createSettingsGraphLayoutStorage());
    this.vueApp.provide(GRAPH_VISIBILITY_HOST_KEY, createSettingsGraphVisibilityHost());
    this.vueApp.provide(GRAPH_LAYOUT_SYNC_KEY, createSocketGraphLayoutSyncChannel());
    this.vueApp.mount(host);
  }

  /** Unmount the Vue app when the window closes so a reopen rebuilds cleanly. */
  protected override async _onClose(): Promise<void> {
    if (!this.vueApp) return;
    this.vueApp.unmount();
    this.vueApp = null;
  }
}
