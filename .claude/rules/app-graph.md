---
paths:
  - 'src/App.vue'
  - 'src/composables/useGraph*.ts'
---

# App.vue & the graph composables

`App.vue` is the screen that renders the character/relationship graph. To keep
it readable it is **thin wiring only** — all the heavy logic lives in four
composables under `src/composables/`. Think of `App.vue` as a `Program.cs` /
controller that news up its dependencies and connects them to the view.

## What lives where

| File                                   | Responsibility                                                                                                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `App.vue`                              | Creates `LoreWeaveApiService`, loads the initial data on mount, holds modal open/close flags + their `open*` guards, and lays out the template.                                                         |
| `composables/useGraphConfiguration.ts` | Builds the `<v-network-graph>` config: all node/edge colours, widths, dash styles, and the d3-force layout. Pure styling — no app state.                                                                |
| `composables/useGraphSelection.ts`     | Owns selection state (up to two nodes + one edge), the `v-model` array bindings, the split edge endpoint ids, and `clearSelection()`. Exports `EDGE_ID_SEPARATOR` and the `GraphSelection` type.        |
| `composables/useGraphData.ts`          | Owns the graph data (`nodeList`, `edges`, highlighted path), projects it into `Nodes`/`Edges` for the graph, and exposes every create/update/delete/path mutation handler. Depends on `GraphSelection`. |
| `composables/useGraphInteractions.ts`  | Turns raw graph pointer events into selection changes + context-menu openings, and bundles them into the `eventHandlers` object. Depends on `GraphSelection` and the menu component refs.               |

## Dependency direction

```
useGraphConfiguration   (standalone)
useGraphSelection       (standalone)  ──┐
                                        ├─►  useGraphData
                                        └─►  useGraphInteractions ──► context-menu refs
App.vue wires all four together.
```

`useGraphData` and `useGraphInteractions` both take the single `selection`
object returned by `useGraphSelection` so they share one source of truth. Do not
create a second selection.

## Conventions for this area

- Keep `App.vue` thin. New graph behaviour goes into the matching composable, not
  inline in `App.vue`. Styling → `useGraphConfiguration`; selection → `useGraphSelection`;
  data/mutations → `useGraphData`; pointer-event handling → `useGraphInteractions`.
- Composables return a **plain object** of refs/computeds/functions (see
  `.claude/rules/composables.md`). Because they're returned in a plain object,
  the template accesses them as `selection.firstSelectedNodeId.value` /
  `graph.nodesForGraph.value` (nested refs are not auto-unwrapped).
- The service is created in `App.vue` and passed **down to components as the
  `loreWeaveApiService` prop** (see `.claude/rules/http-client.md` and
  `.claude/rules/components.md`) — composables here do not call the backend.
- Public functions and composables carry a short JSDoc (`/** ... */`) describing
  what they do and their params — treat it like a C# XML doc comment.
