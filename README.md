# LoreWeave UI

A Foundry VTT v14 module that visualizes tabletop-RPG characters and the
relationships between them as an interactive graph. LoreWeave UI is the
frontend for the [RpgAssistant](https://github.com/Exoil) backend API.

## Module id

`loreweaveui` — used throughout `module.json`, settings keys, hook names,
CSS scope, and i18n keys.

## Requirements

- [Bun](https://bun.sh/) (latest)
- Node `^20.19.0 || >=22.12.0` for tooling that shells out to Node
- A running RpgAssistant backend API reachable from Foundry (default
  `http://localhost:8080`, configurable via the world setting
  _Backend API base URL_)

## Commands

```bash
bun install                # install dependencies
bun run dev                # dev server (standalone SPA) with HMR
bun run type-check         # vue-tsc
bun run lint               # ESLint
bun run format             # Prettier
bun run test:run           # Vitest (single run)

bun run build              # standalone SPA build → dist-standalone/
bun run build:foundry      # Foundry-module build  → dist/ (self-contained module folder)
```

The `dist/` directory is laid out so it can be dropped into a Foundry data
folder verbatim at `Data/modules/loreweaveui/`. For local docker-compose
work-flows, mount `dist/` read-only into the Foundry container at
`/data/Data/modules/loreweaveui`.

## Settings

| Setting (id)             | Scope | Default                 | Purpose                                         |
| ------------------------ | ----- | ----------------------- | ----------------------------------------------- |
| `loreweaveui.apiBaseUrl` | world | `http://localhost:8080` | URL the module uses to reach the LoreWeave API. |

## Layout

```
.
├── module.json              <- Foundry manifest (id: loreweaveui)
├── lang/                    <- i18n catalogs
├── src/
│   ├── foundry/             <- Foundry-host glue (ApplicationV2, hooks, constants)
│   ├── components/          <- Vue SFCs
│   ├── composables/         <- reusable composition functions
│   ├── services/            <- HTTP client + service wrapper that talks to the backend API
│   └── ...
├── vite.config.ts           <- standalone SPA build
└── vite.config.foundry.ts   <- Foundry library-mode build (lib output → dist/)
```

## CI

`.github/workflows/ci.yml` runs lint + type-check + build + Vitest on every
push and PR.

## License

Licensed under the [PolyForm Noncommercial License 1.0.0](./LICENSE.md).
Noncommercial use is permitted; for commercial use, contact the author.
