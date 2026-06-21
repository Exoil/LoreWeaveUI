---
paths:
  - 'src/__tests__/**'
  - '**/*.spec.ts'
---

# Vitest rules

- Specs live under `src/__tests__/`, mirroring the src tree, with names
  `*.spec.ts`.
- Mount with `@vue/test-utils`:
  ```ts
  const wrapper = mount(MyComponent, { props: { ... } });
  await wrapper.find('#submit').trigger('click');
  await flushPromises();
  ```
- Mock the service with `vi.fn().mockResolvedValue(...)` via a small
  `makeService(overrides)` factory cast as `LoreWeaveApiService`.
- Target DOM with the same `id` attributes used in the component.
- Assert emitted events with `wrapper.emitted('eventName')`.
- Cover the happy path **and** at least one not-happy path (cancel, abort,
  validation, error response).
- Run `bun run test` (watch) or `bun run test:run` (single shot).
  `bun run coverage` for V8 coverage.
