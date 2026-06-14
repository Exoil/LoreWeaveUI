/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  // Build-time host flag. Standalone build sets it to `false`; the Foundry
  // library build (vite.config.foundry.ts) sets it to `true`. Code reads it
  // via `isFoundry` from src/env.ts and Vite replaces the literal at build
  // time, so dead branches are tree-shaken from each bundle.
  define: {
    __IS_FOUNDRY__: JSON.stringify(false),
  },
  // Keep the standalone build out of `dist/` — that path is owned by the
  // Foundry library build (vite.config.foundry.ts) and is bind-mounted into
  // the rpgassistant-foundry container read-only. Writing the SPA on top
  // would silently break the running Foundry module on every standalone
  // build.
  build: {
    outDir: 'dist-standalone',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  test: {
    environment: 'jsdom',
    globals: false,
  },

  server: {
    proxy: {
      // Your API endpoints are /v1/...
      '/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false, // dev only: allows self-signed localhost cert
      },
    },
  },
});
