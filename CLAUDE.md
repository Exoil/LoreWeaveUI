# CLAUDE.md — Loreweave UI

This file applies to **every** file in the repo and holds only cross-cutting
rules. Path-scoped guidance lives in `.claude/rules/` and loads only when
Claude reads matching files:

| Topic                      | Rule file                      | Loads for                                  |
| -------------------------- | ------------------------------ | ------------------------------------------ |
| HTTP / API client layering | `.claude/rules/http-client.md` | `src/services/**`                          |
| Components                 | `.claude/rules/components.md`  | `src/components/**`, `src/App.vue`         |
| Composables                | `.claude/rules/composables.md` | `src/composables/**`                       |
| Models (API vs UI)         | `.claude/rules/models.md`      | `src/models/**`, `src/services/Models/**`  |
| Testing (Vitest)           | `.claude/rules/testing.md`     | `src/__tests__/**`, `*.spec.ts`            |
| Foundry VTT module         | `.claude/rules/foundry.md`     | `**/module.json`, `**/foundry/**`          |

## Context

You are an expert **Vue 3** / **TypeScript** developer helping build
**Loreweave UI** — a Foundry VTT v14 module that visualizes tabletop-RPG
characters and the relationships between them as a graph. The module consumes
the RpgAssistant backend REST API (separate repo). Follow the official Vue,
Vite, and TypeScript documentation for best practices.

## Stack

| Concern                   | Tool                                      |
| ------------------------- | ----------------------------------------- |
| Framework                 | Vue 3 (Composition API, `<script setup>`) |
| Language                  | TypeScript (strict)                       |
| Build / dev server        | Vite                                      |
| Package manager / runtime | Bun (`bun.lock` is the lockfile)          |
| Router                    | `vue-router`                              |
| HTTP                      | `axios` (via an NSwag-generated client)   |
| Event bus                 | `mitt`                                    |
| Styling                   | Bulma                                     |
| Graph rendering           | `v-network-graph` (+ `d3-force` layout)   |
| Linting / formatting      | ESLint, Prettier                          |
| Type check                | `vue-tsc`                                 |
| Tests                     | Vitest, `@vue/test-utils`, jsdom          |

## Directory layout

```
src/
├── App.vue                         <- root component
├── main.ts                         <- bootstrap (createApp, router, mount)
├── router/                         <- vue-router config
├── components/                     <- reusable Vue components
│   └── menus/                      <- context menus
├── composables/                    <- reusable composition functions (use*)
├── foundry/                        <- Foundry-host glue (ApplicationV2, hooks, constants)
├── models/                         <- UI-only models (e.g. CharacterNode, KnowEdge for v-network-graph)
├── services/
│   ├── RpgAssistantService.ts      <- friendly wrapper used by UI (talks to the backend)
│   ├── Models/                     <- API/domain models (Character, RelationPath, PageQuery, ...)
│   └── httpClients/
│       └── RpgAssistantClient.ts   <- NSwag-generated (do not hand-edit)
└── __tests__/                      <- Vitest specs, mirroring src layout
    ├── components/
    ├── composables/
    └── models/
```

Path alias: `@/<x>` resolves to `src/<x>` (configured in `tsconfig.app.json`
and `vite.config.ts`).

The names `RpgAssistantService` / `RpgAssistantClient` refer to the **backend
API** this module talks to. The backend is a separate project still called
RpgAssistant; do not rename those identifiers when refactoring this repo.

## General rules

- Always give generated code for review. Help the user understand it.
- Before you edit/create a file you must plan each step and inform the user about the plan.
- Answers must be short and understandable.
- Use the latest Vue 3 features. Single-file components with `<script setup lang="ts">`, Composition API only — no Options API.
- If you do not know the answer, write "Don't know."

### TypeScript

- `strict` mode is on; do not weaken it.
- Avoid `any`; prefer `unknown` + narrowing or precise types.
- Type all props, emits, and composable return values explicitly.

### Naming

- Components: `PascalCase.vue`.
- Composables: `useXxx.ts`, returning a plain object of refs / functions.
- UI models in `models/`: `PascalCase.ts` classes.
- API/domain models in `services/Models/`: `PascalCase.ts` classes mirroring backend payloads.
- Service: `XxxService.ts` (single instance, wraps an http client).

### Tooling

- Run `bun run lint` and `bun run format` before finishing work.
- Run `bun run type-check` and ensure it passes.
- Do not disable ESLint or Prettier rules without a comment explaining why.

## Performance

- Use `computed` for derived state; do not duplicate reactive sources.
- Prefer `shallowRef` / `shallowReactive` for large external objects
  (e.g. graph data, `v-network-graph` configs).
- Lazy-load route components via dynamic `import()`.
- Avoid `watch(..., { deep: true })` — use targeted watchers or `computed`.
- Cancel in-flight requests (`AbortController`) before starting a new one.

## Commands

```bash
# Install
bun install

# Dev server (standalone SPA, useful for component work)
bun run dev

# Type check
bun run type-check

# Lint / format
bun run lint
bun run format

# Tests (Vitest)
bun run test
bun run test:run
bun run coverage

# Production build (standalone SPA → dist-standalone/)
bun run build

# Foundry module build (→ dist/, a self-contained Foundry module folder)
bun run build:foundry
```
