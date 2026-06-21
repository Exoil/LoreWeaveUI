---
paths:
  - 'frontend/**'
  - '**/module.json'
  - '**/foundry/**'
---

# Foundry VTT module rules

These rules apply when editing the RpgAssistant frontend in its role as a
**Foundry VTT v14 module**. Foundry is the runtime host; the SPA boots inside
a Foundry world via the manifest at `frontend/module.json`. The conversion
itself was scaffolded by the `/foundry-module` skill — these rules govern the
ongoing code.

For the canonical API see [Foundry's API docs](https://foundryvtt.com/api/)
(currently targeting **v14.360 Stable**) and the
[community package best-practices wiki](https://foundryvtt.wiki/en/development/guides/package-best-practices).

## Hard rules

- **Target Foundry v14.** Use only the v2 application stack — namely
  `foundry.applications.api.ApplicationV2`, `DialogV2`, and
  `foundry.applications.sheets.*V2`. The legacy `Application` / `FormApplication`
  / `ActorSheet` (V1) classes are deprecated; do not introduce new code that
  extends them.
- **One namespace, one id.** Every settings key, hook name, socket event,
  CSS class, DOM id, and `localStorage` fallback must start with the module
  id from `module.json`. If you reference the id, import it from a single
  constant — never inline the string twice.
- **ESM only.** Add new entry points to `module.json` under `esmodules`,
  never `scripts`. The Vite build emits ES modules; the legacy `scripts`
  array exists only for old packages and has different load semantics.
- **No `localStorage` for persisted state.** Use `game.settings.register(...)`
  in the `init` hook and `game.settings.get/set(...)` thereafter. World-scoped
  settings are saved server-side; `localStorage` is per-browser and breaks
  the moment a GM moves machines.
- **Localise every user-visible string.** Wrap with `game.i18n.localize(key)`
  or `game.i18n.format(key, data)` and add the key to `frontend/lang/en.json`.
  Hard-coded English in a template or `.vue` file is a regression.
- **Cross-module API only via `game.modules.get(id).api`.** Do not attach
  globals to `window` or `globalThis`. Do not reach into another module's
  internals; if you need data from one, request that they expose it on
  their own `api` object.
- **Do not mutate `CONFIG`, `foundry.*`, or core document classes outside
  a Hook.** Anything that monkey-patches the core platform must go through
  `libWrapper` (declared in `module.json` → `relationships.requires`) — and
  even then, prefer the documented Hook before reaching for a wrapper.
- **Never write to `/data` from build tooling.** The container's `/data`
  volume is owned by Foundry; the only path our module touches is its own
  folder under `/data/Data/modules/<id>`, and that path is mounted **read-only**
  from `frontend/dist`. If a script appears to need to write into `/data`,
  redesign — that's a sign work is being done in the wrong layer.

## Manifest (`frontend/module.json`)

- `id` is final once published. Do not rename without a migration story for
  existing users' world settings.
- `compatibility.verified` reflects the highest Foundry version the module
  has actually been **tested** against — not the highest one we want to
  support. Bumping `verified` without testing is the most common cause of
  "this worked yesterday" bug reports.
- Keep `esmodules` pointed at Vite's library-mode output (currently
  `dist/main.js`). Keep `styles` pointed at the single bundled CSS file.
  If Vite's output filenames drift, fix the Vite config — do not add a
  second entry to `module.json` to paper over it.
- `relationships.requires` lists hard dependencies (e.g. `libWrapper`).
  `relationships.systems` lists game systems the module specifically
  targets — leave empty if the module is system-agnostic.

## Vue inside Foundry

- Mount each Vue app inside an `ApplicationV2` window. Treat the
  ApplicationV2 instance as the lifecycle owner: `_onRender` creates the
  Vue app, `_onClose` calls `app.unmount()`. Do not mount Vue directly on
  `document.body` — Foundry will hand you a per-window container element.
- Single-page-app patterns do not translate cleanly. `vue-router` only
  makes sense if every route runs inside one window; for multi-window flows
  (e.g. a separate "character sheet" window), open a new ApplicationV2
  instance instead of pushing a route.
- Use `shallowRef` for any reactive holder that wraps a Foundry document —
  Foundry's documents are large, observable objects and deep reactivity
  causes measurable jank on the canvas.
- Cancel in-flight `axios` requests on `_onClose` via `AbortController`,
  same rule as the standalone SPA — Foundry reuses windows and a stale
  request landing after close will throw.

## Hooks

- Use `Hooks.once("init", …)` for synchronous setup (settings registration,
  API surface declaration). At this point `game.actors` and friends do not
  exist yet — do not touch them here.
- Use `Hooks.once("ready", …)` for anything that needs world data. By
  `ready` the canvas is up and all collections are loaded.
- Custom hooks our module fires must be prefixed with the module id, e.g.
  `rpg-assistant.characterLinked`. Other modules need a stable contract to
  hook into.
- Prefer `Hooks.once` over `Hooks.on` for one-shot lifecycle events. A
  forgotten `Hooks.on("ready", …)` fires every time the GM reloads.

## Settings

- Register every setting in `init` exactly once. Calling `register` twice
  with the same key throws.
- Use `scope: "world"` for anything a GM should configure once for the
  game; `scope: "client"` for per-user UI preferences. Don't put auth
  tokens or API keys in `client` — they need to be world-scoped.
- Setting `name` and `hint` are i18n keys, not literal strings. Follow the
  pattern `<module-id>.settings.<key>.name` / `.hint` and add both to
  `lang/en.json`.

## Sockets

- All socket events must travel on `module.<module-id>`. Foundry routes
  socket messages by event name; using a bare event name collides with
  other modules.
- Validate every payload arriving from a socket. The sender is a peer
  client, not a trusted backend — treat input the same way the C# API
  treats request bodies.

## CSS

- Every selector must start with `.<module-id>` or live inside a
  scoped block. A bare `.window` or `.button` selector in our CSS will
  break Foundry's own UI.
- Bulma is fine to import but **scoped to our component tree only**.
  Foundry's core styling uses its own reset; a global Bulma import will
  cascade into core windows and is the single most common source of
  "the module broke the sidebar" reports.

## What does not belong in this repo

- Foundry's own assets (`fonts/`, core icons, sound packs). Reference them
  by their Foundry paths (e.g. `icons/svg/d20.svg`); do not vendor them.
- Game-system-specific actor data. This module is a tracker, not a system —
  if a feature only makes sense for D&D 5e, put it behind a
  `game.system.id === "dnd5e"` guard rather than hard-coding the schema.
