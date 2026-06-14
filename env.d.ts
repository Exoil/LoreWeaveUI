/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

// Build-time host flag injected via Vite `define`. See vite.config.ts /
// vite.config.foundry.ts. Prefer importing `isFoundry` from `@/env` over
// referencing this global directly — that keeps the surface searchable.
declare const __IS_FOUNDRY__: boolean;
