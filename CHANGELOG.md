# Changelog

All notable changes to this project will be documented in this file.

## [3.0.6] - 2025-05-28

### Changed
- Replaced `react.cache` with `AsyncLocalStorage` for server-side store management.
- `runWithStateVocab()` exported from `store.ts` — callers must wrap their request handler to initialize the per-request store.
- `getServerStore()` now throws if called outside of a `runWithStateVocab()` context.

## [3.0.5] - 2025-05-28

### Changed
- Extracted `VocabStore` class out of `state.ts` into a dedicated `store.ts` module.
- `getVocabStore()` now handles store lifecycle: per-request singleton on the server via `react.cache`, module-level singleton on the client.
- `serialize` / `deserialize` / `sync` moved inside `useState()` hook call — scoped to the hook, access `vocabStore` via `getVocabStore()`.
- `Vocab` type moved to `state.types.ts`.

### Fixed
- SSR state leak between requests — `vocabStore` is now isolated per request via `react.cache`, preventing state from one request bleeding into the next.
- Removed `isServer` guard on `vocabStore.get()` during initialization — no longer necessary since server-side store isolation is handled at the store level.
- Cross-test state leakage — renamed shared `val` state paths to unique keys (`val1`–`val12`) in the test suite to prevent state bleeding between test cases through the shared store.

## [3.0.4] - 2025-05-22

### Fixed
- SSR state leak between requests — `vocabStore` is no longer read on the server during initialization. Each server render now always starts from `defaultValue`, preventing state from a previous request bleeding into the next one.

---

## [3.0.3] - 2025-05-22

### Added
- `verbosePath` option in `setupStorage` — narrows verbose logging to a specific subtree instead of the entire state. Accepts a dot-separated path (e.g. `"user.profile"`). TypeScript autocompletes valid paths based on your tree.

### Fixed
- Removed `serialize` from `useCallback` dependency arrays in `setValue` and `resetValue` — `serialize` is a stable reference and its inclusion caused unnecessary re-renders.

---

## [3.0.2] - 2025-05-22

### Added
- `ssr` option in `setupStorage` — defers storage reads until after hydration to prevent mismatches in Next.js / SSR environments. With `ssr: true`, server and first client render always use `defaultValue`; storage is read synchronously via `useIsomorphicLayoutEffect` before paint.
- `STATE_SSR` symbol re-introduced and injected into leaf nodes at runtime by `injectPaths`.
- `VocabStore.get` method for reading a single path from the store without subscribing.
- `useIsomorphicLayoutEffect` helper — uses `useLayoutEffect` on the client and `useEffect` on the server.
- `sync` helper inside `defineState` — encapsulates the read/write logic between `VocabStore` and `Storage`.
- Proxy and leaf caches moved into `setupStorage` as instance-level `WeakMap`s passed via `cache` option — fixes cache leaking between multiple `setupStorage` calls.

### Changed
- `injectPaths` now requires an explicit `cache` argument instead of relying on module-level `WeakMap`s.
- Storage reads on non-SSR paths now happen during initialization (synchronous ref block) instead of in an effect.
- `toDateString` returns `""` instead of `undefined` when date is null.
- SSR test simplified — removed the separate `ssr html matches client html` test case, kept only the hydration mismatch check.

### Fixed
- Hydration mismatch when using `localStorage`/`sessionStorage` in Next.js — `ssr: true` ensures server and client produce identical markup on first render.

---

## [3.0.1] - 2025-05-22

### Added
- `verbose` option in `setupStorage` — replaces the `verbose` prop on the removed `StorageProvider`. Pass `{ verbose: true }` to log state to the browser console on every change.
- `useSyncExternalStore`-based `VocabStore` class — state is now stored in a per-node external store inside `defineState` instead of React context. No provider required.
- `bidirectional` option support in `defineState` and `useState` for cross-tab sync via the `storage` event.
- SSR test suite (`state.ssr.test.tsx`) covering hydration match between server and client renders.

### Changed
- **Breaking:** `StorageProvider` (`StateVocabContextProvider`) removed. Wrapping your app with it is no longer necessary.
- **Breaking:** `StorageProvider` no longer exported. Update imports: `import { setupStorage, defineState, StorageProvider }` → `import { setupStorage, defineState }`.
- State initialization moved from `useEffect` to a synchronous ref-guarded block — eliminates the extra render on mount.
- `defaultValue` resolution merges local (`useState`) and definition-level (`defineState`) defaults at hook call time.
- `serialize`/`deserialize` moved to `defineState` closure — called once, not re-created on every render.

### Removed
- `StorageProvider` / `StateVocabContextProvider` React context provider.
- `StateVocabContext` and `useStateVocabContext` internal utilities.
- `embed` helper from `state.utils.ts` — replaced by `VocabStore.set`.
- `state.utils.test.ts` — tests for the removed `embed` utility.

### Fixed
- `logStyled` now accepts `unknown` instead of `object`.
- Factory function for `defaultValue` is now called once per initialization instead of on every render.