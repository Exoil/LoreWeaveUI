/// <reference types="node" />
import { fileURLToPath, URL } from 'node:url';
import { copyFileSync, cpSync, mkdirSync } from 'node:fs';

import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
// postcss-prefix-selector has no published types; the runtime API is one
// default export (factory returning a PostCSS plugin), which is all we need.
// @ts-expect-error -- no @types/postcss-prefix-selector package exists
import prefixSelector from 'postcss-prefix-selector';

// Wrap every selector in dist/style.css with `.loreweaveui-root` so the
// bundled Bulma + v-network-graph styles cannot escape and repaint Foundry's
// own UI.
//
// IMPORTANT: scope to the Vue mount host (`.loreweaveui-root`, the div
// created in LoreWeaveApp._renderHTML), NOT the ApplicationV2 window frame
// (`.loreweaveui`, set via `classes: [MODULE_ID]`). Foundry's window header
// — including its close button — lives inside the frame but OUTSIDE the mount
// host. Scoping to the frame leaks Bulma's `html`/`body`/`button` resets onto
// that header and the close button disappears; scoping to the host keeps our
// styles strictly inside the Vue content area.
//
// `html`/`body`/`:root` collapse to the prefix itself (you cannot scope a
// top-level rule to a descendant of itself), and rules already starting with
// the prefix are left alone so the plugin is idempotent on re-builds.
const SCOPE = '.loreweaveui-root';
// Copy module.json and lang/ into dist/ so the entire `dist` directory is a
// self-contained Foundry module: one bind mount serves the whole thing.
// (Bind-mounting individual files into a non-existent container path is
// flaky on Docker Desktop / virtiofs — directory mounts are reliable.)
const root = fileURLToPath(new URL('.', import.meta.url));
function foundryPackagingPlugin(): Plugin {
  return {
    name: 'loreweaveui:foundry-packaging',
    closeBundle() {
      mkdirSync(`${root}/dist`, { recursive: true });
      copyFileSync(`${root}/module.json`, `${root}/dist/module.json`);
      cpSync(`${root}/lang`, `${root}/dist/lang`, { recursive: true });
    },
  };
}

const cssPrefixPlugin = prefixSelector({
  prefix: SCOPE,
  transform(prefix: string, selector: string, prefixedSelector: string): string {
    if (selector.startsWith(prefix)) return selector;
    if (/^(html|body|:root)\b/.test(selector)) {
      return selector.replace(/^(html|body|:root)/, prefix);
    }
    return prefixedSelector;
  },
});

// Foundry VTT module build.
// Output:
//   dist/main.js  — ES module entry, referenced by module.json -> esmodules
//   dist/style.css — single CSS bundle, referenced by module.json -> styles
//
// `dist/` is bind-mounted at runtime into /data/Data/modules/loreweaveui
// (read-only) by the foundry service in docker-compose.yaml.
//
// Run with:  bun run build:foundry
export default defineConfig({
  plugins: [vue(), foundryPackagingPlugin()],
  // Vite library mode does NOT auto-replace `process.env.NODE_ENV` the way the
  // default app build does. Without this, Vue's reactivity bundle ships its
  // dev-mode conditionals into the browser; `process` is undefined inside
  // Foundry, the entry module throws on load, and our `init`/`ready`/scene-
  // control hooks never register — making the module appear "inactive" even
  // though Foundry has it enabled.
  //
  // `__IS_FOUNDRY__` is the build-time host flag (true here, false in
  // vite.config.ts). Code reads it via `isFoundry` from src/env.ts; Vite
  // replaces the literal so dead branches drop out of the bundle.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __IS_FOUNDRY__: JSON.stringify(true),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    postcss: { plugins: [cssPrefixPlugin] },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: fileURLToPath(new URL('./src/foundry/main.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: (asset) => {
          if (asset.names?.some((n) => n.endsWith('.css'))) return 'style.css';
          return 'assets/[name][extname]';
        },
      },
    },
    // Foundry serves modules off its own origin; the production build does
    // not need sourcemaps shipped, but they help debugging during the
    // initial conversion. Flip to false once the module is stable.
    sourcemap: true,
  },
});
