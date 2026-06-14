import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import VNetworkGraph from 'v-network-graph';
import 'v-network-graph/lib/style.css';
import 'bulma/css/bulma.min.css';
import { API_BASE_URL_KEY } from './foundry/injection-keys';

// Standalone SPA path. The Foundry-module build bypasses this file entirely
// and bootstraps from src/foundry/main.ts via Vite library mode.
const host = document.getElementById('app');
if (host) {
  // Fill the page; index.html does not constrain html/body/#app.
  document.documentElement.style.height = '100%';
  document.body.style.height = '100%';
  document.body.style.margin = '0';
  host.style.height = '100%';

  const app = createApp(App);
  app.use(router).use(VNetworkGraph);
  // Empty string = same-origin; nginx gateway proxies /v1/.
  app.provide(API_BASE_URL_KEY, '');
  app.mount(host);
}
