// Build-time host flag. Vite's `define` replaces `__IS_FOUNDRY__` with the
// literal `true` in the Foundry-module bundle and `false` in the standalone
// SPA bundle, so any branch that gates on `isFoundry` is dead-code-eliminated
// from the bundle that doesn't need it.
//
// Use this rather than runtime probes (e.g. checking for `Hooks`, `game`, or
// a DOM mount node) — the runtime probes are fragile during tests and SSR,
// and they cannot drive tree-shaking.
export const isFoundry: boolean = __IS_FOUNDRY__;
export const isStandalone: boolean = !__IS_FOUNDRY__;
