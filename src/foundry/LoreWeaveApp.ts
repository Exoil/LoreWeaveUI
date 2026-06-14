import { createApp, type App as VueApp } from 'vue';
import VNetworkGraph from 'v-network-graph';
import 'v-network-graph/lib/style.css';
import 'bulma/css/bulma.min.css';

import RootComponent from '@/App.vue';
import router from '@/router';

import { MODULE_ID } from './constants';
import { API_BASE_URL_KEY } from './injection-keys';

const { ApplicationV2 } = foundry.applications.api;

// ApplicationV2 window that owns one Vue app instance for its lifetime.
// Vite library mode bundles Vue + v-network-graph + Bulma into the module
// itself — Foundry does not provide any of these at runtime.
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

  constructor(
    private readonly apiBaseUrl: string,
    options?: Record<string, unknown>,
  ) {
    super(options);
  }

  protected override async _renderHTML(): Promise<HTMLElement> {
    const host = document.createElement('div');
    host.classList.add(`${MODULE_ID}-root`);
    host.style.width = '100%';
    host.style.height = '100%';
    return host;
  }

  protected override _replaceHTML(result: HTMLElement | string, content: HTMLElement): void {
    content.replaceChildren(result as HTMLElement);
  }

  protected override async _onRender(): Promise<void> {
    if (this.vueApp) return;

    const host = this.element.querySelector(`.${MODULE_ID}-root`);
    if (!host) return;

    this.vueApp = createApp(RootComponent);
    this.vueApp.use(router).use(VNetworkGraph);
    this.vueApp.provide(API_BASE_URL_KEY, this.apiBaseUrl);
    this.vueApp.mount(host);
  }

  protected override async _onClose(): Promise<void> {
    if (!this.vueApp) return;
    this.vueApp.unmount();
    this.vueApp = null;
  }
}
