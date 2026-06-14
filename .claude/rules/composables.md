---
paths:
  - 'src/composables/**'
---

# Composable rules

- Filename and export are `useXxx`.
- Return a plain object of refs / computeds / functions — no classes.
- Manage their own `AbortController` and debounce timer; expose `cancel()` and
  `reset()` helpers when long-running.
- Read-only outputs should be `computed` (not raw refs); accept inputs as refs
  or option callbacks (e.g. `excludeId: () => string | null | undefined`).
- Swallow `CanceledError` / `AbortError` from axios; rethrow everything else.

## Reference shape

```ts
export interface UseXxxOptions {
  /* options with sensible defaults */
}

export function useXxx(service: RpgAssistantService, options: UseXxxOptions = {}) {
  const query = ref('');
  const items = ref<Foo[]>([]);
  const loading = ref(false);
  // ... internal state, AbortController, debounce, watcher ...
  return { query, items, loading, cancel, reset, loadMore };
}
```
