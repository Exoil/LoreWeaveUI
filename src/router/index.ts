import { createRouter, createMemoryHistory, createWebHistory } from 'vue-router';
import { isFoundry } from '@/env';

// Two host modes — selected at build time via `isFoundry` (see src/env.ts):
//   - Standalone SPA (vite dev / static build behind nginx): web history so
//     URLs reflect routes.
//   - Foundry VTT module: no URL bar to mirror — Foundry windows live inside
//     a Foundry page at /game. Use in-memory history so vue-router can still
//     manage navigation without touching window.location.
/**
 * The app's vue-router instance. History mode is chosen at build time:
 * web history for the standalone SPA, in-memory history inside Foundry (no URL
 * bar to mirror). `routes` is empty today — the whole UI lives in `App.vue`.
 */
const router = createRouter({
  history: isFoundry ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL),
  routes: [],
});

export default router;
