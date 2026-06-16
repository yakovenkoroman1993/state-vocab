# Changelog

All notable changes to this project will be documented in this file.

## [4.2.0] - 2026-06-16

### Added

- **`start()` on `serverify` result** — call `serverStorage.start()` at the top of the component that renders `StateVocabProvider`, before the provider renders. This registers a pending promise in the per-request store so that sibling or ancestor server components can `await getState()` concurrently, without waiting for the provider to finish rendering first:
  ```tsx
  // app/(dashboard)/layout.tsx (Server Component)
  export default async function DashboardLayout({ children }: PropsWithChildren) {
    layoutServerStorage.start()  // register the store for this request

    return (
      <LayoutStateVocabProvider value={{ session: { id: 12345 } }}>
        {children}
      </LayoutStateVocabProvider>
    )
  }
  ```

  Without `start()`, a child component calling `await getState()` for a store whose provider hasn't rendered. With `start()` the promise is registered immediately — the provider resolves it when it renders, and any concurrent `getState()` awaits just long enough.

- **`serverTimeout` option in `serverify`** — optional timeout in milliseconds (default `1000`) applied to each `getState()` call. If the `StateVocabProvider` does not render within the timeout window, `getState()` rejects with a descriptive error message:
  ```ts
  export const serverStorage = serverify(storage, {
    clientContext: MyClientContext,
    serverTimeout: 2000, // default: 1000
  })
  ```

### Breaking Changes

- **`getState()` now returns `Promise<V>`** — all `.getState()` calls in server components must be `await`ed:
  ```tsx
  // ❌ Old (4.1.0)
  const name = serverStorage.user.name.getState()

  // ✅ New
  const name = await serverStorage.user.name.getState()
  ```

### Changed

- **`StateVocabProvider` is now a synchronous component** — previously an async server component, it now returns `ReactNode` synchronously. Value resolution is handled via `Promise.withResolvers`: `start()` registers the pending promise and `StateVocabProvider` resolves it when it renders, decoupling registration from rendering.

- **Symbols are now debug-labeled** — `serverify()` now creates `Symbol(debugMarker)` where the marker includes the first few top-level keys of the storage tree (e.g. `Symbol(user-person-session)`). Makes storage trees easier to identify in stack traces and React DevTools.

---

## [4.1.0] - 2026-06-16

### Added

- **Multiple independent storage trees on the same page** — each `serverify`/`clientify` pair is now scoped to its own React context, so a `layoutStorage` provider and a `pageStorage` provider can coexist on the same page without their state bleeding into each other. Previously all providers shared the same implicit default context.

### Breaking Changes

- **`serverify` now requires a `clientContext` option** — pass a React context created with `createContext({})` in a `"use client"` file. This links the server and client sides of the same storage tree and enables per-tree context isolation:
  ```ts
  // my-storage.context.client.ts ("use client")
  import { createContext } from "react"
  export const MyClientContext = createContext({})

  // my-storage.server.ts
  import { serverify } from "@yakocloud/state-vocab/server"
  import { MyClientContext } from "./my-storage.context.client"
  export const serverStorage = serverify(storage, { clientContext: MyClientContext })
  ```

- **`clientify` now accepts a `clientContext` option** — pass the same context object used in `serverify` so that client hooks read from the correct store:
  ```ts
  // my-storage.client.ts ("use client")
  import { clientify } from "@yakocloud/state-vocab/client"
  import { MyClientContext } from "./my-storage.context.client"
  export const clientStorage = clientify(storage, { clientContext: MyClientContext })
  ```

### Changed

- **Server store isolation now uses `React.cache()` instead of `AsyncLocalStorage`** — the `node:async_hooks` dependency is removed. The per-request server store is backed by a `React.cache()`-scoped `Map<symbol, Vocab>`, keyed by a unique `Symbol` generated internally per `serverify()` call. Behavior is identical from the outside; no migration needed beyond the `clientContext` addition above.

---

## [4.0.2] - 2026-06-15

### Added

- **`StateVocabClientProvider` exported from `@yakocloud/state-vocab/client`** — for SSR setups that don't use React Server Components (e.g. Next.js Pages Router). Wrap your app root with it to get per-request store isolation on the server and prevent state leakage between concurrent requests. Accepts an optional `value` prop to pre-seed the store with server-fetched data:
  ```tsx
  // pages/_app.tsx
  import { StateVocabClientProvider } from '@yakocloud/state-vocab/client'

  export default function App({ Component, pageProps }: AppProps) {
    return (
      <StateVocabClientProvider>
        <Component {...pageProps} />
      </StateVocabClientProvider>
    )
  }
  ```

### Breaking Changes

- **Callable namespace syntax removed** — `serverify()` result namespaces are no longer callable. Use `.seed()` instead:
  ```ts
  // ❌ Old (4.0.0)
  serverStorage.user({ name: 'Alice', role: 'Admin' })
  serverStorage.person.address({ city: 'NY' })

  // ✅ New
  serverStorage.user.seed({ name: 'Alice', role: 'Admin' })
  serverStorage.person.address.seed({ city: 'NY' })
  ```
- **`StateVocabProvider` moved to `serverify()` result** — no longer a separate export from `@yakocloud/state-vocab/server`. Destructure it from the serverified storage instead:
  ```ts
  // ❌ Old (4.0.0)
  import { StateVocabProvider } from '@yakocloud/state-vocab/server'

  // ✅ New
  const { StateVocabProvider } = serverStorage
  ```
- **`StateVocabProvider` removed from `@yakocloud/state-vocab/client`** — no longer needed for standard SPAs. Hooks now fall back to a module-level store when no provider is present (requires `ssr: false`, ssr is `true` by default). Remove the import and wrapper:
  ```tsx
  // ❌ Old (4.0.0)
  import { clientify, StateVocabProvider } from '@yakocloud/state-vocab/client'
  // <StateVocabProvider><App /></StateVocabProvider>

  // ✅ New — no provider needed
  import { clientify } from '@yakocloud/state-vocab/client'
  // <App />
  ```
- **`StateVocabProvider` `value` prop takes a plain object** — pass the data directly instead of using a callable invocation:
  ```tsx
  // ❌ Old (4.0.0)
  <StateVocabProvider value={serverStorage({ user: { name: 'Alice' } })}>

  // ✅ New
  <StateVocabProvider value={{ user: { name: 'Alice' } }}>
  ```

---

## [4.0.0] - 2026-06-14

### Added

- **React Server Components support** — two new package entry points, each tree-shaken independently:
  - `@yakocloud/state-vocab/server` — `serverify`, `StateVocabProvider`
  - `@yakocloud/state-vocab/client` — `clientify`
- **`serverify(storage)`** — converts a storage tree into its server-side counterpart. Each leaf gains `.getState()` which reads the value injected by the nearest `StateVocabProvider`. Typical usage:
  ```ts
  // storage.server.ts
  export const serverStorage = serverify(storage)

  // Server Component
  const name = serverStorage.user.name.getState()
  ```
- **`.set()` on serverified namespaces** — every namespace node (including the root) exposes a `.set()` method that returns the input wrapped under its full ancestor path, ready to pass to `StateVocabProvider`'s `value` prop:
  ```ts
  serverStorage.set({ user: { name: 'Alice' } })           // → { user: { name: 'Alice' } }
  serverStorage.user.set({ name: 'Alice', role: 'Admin' }) // → { user: { name: 'Alice', role: 'Admin' } }
  serverStorage.person.address.set({ city: 'NY' })         // → { person: { address: { city: 'NY' } } }
  ```
- **`StateVocabProvider` `value` prop** — accepts an optional initial vocab object to pre-seed the store with server-fetched data. Values are available immediately to both server and client components inside the provider.
- **`clientify(storage)`** — converts a storage tree into its client-side counterpart. Each leaf gains `.useState()` and `.useInitialState()`. Replaces `setupClientStorage`.
- **Per-request server store isolation** — server-side store is isolated per request using React context backed by `AsyncLocalStorage`, preventing state from one concurrent request bleeding into another.

### Changed

- `defineState` no longer includes `.useState()` directly. Call `clientify(storage)` from `@yakocloud/state-vocab/client` to attach React hooks to all leaf nodes before using them in components.
- `StateVocabProvider` is available from `@yakocloud/state-vocab/client` (SPA / client-only apps) and `@yakocloud/state-vocab/server` (RSC / Next.js App Router). It is **not** exported from the main `@yakocloud/state-vocab` entry.

---

## [3.1.6] - 2026-06-11

### Fixed
- `"use client"` directive now emitted at the top of the bundle — prevents `createContext is not a function` error when the library is imported by a Next.js React Server Component

## [3.1.5] - 2026-05-29

### Changed

- `VocabStore` instance check added to `useState` — throws a clear error (`"Make sure your component is wrapped in StateVocabProvider"`) when called outside a provider

## [3.1.4] - 2026-05-29

### Added
- `useInitialState` method on state definitions — initializes state without subscribing the caller component to re-renders

## [3.1.3] - 2026-05-29

### Added
- `VocabStateProvider` — React context provider that creates an isolated `VocabStore` for its subtree; all components calling `.useState()` must be its descendants
- `verbose` option in `useVocabStoreContext` — logs store UID when enabled
- README: documented `VocabStateProvider` setup, SSR requirements, and multiple isolated provider trees

### Changed
- `useVocabStoreContext` now accepts an `options` object (`{ verbose?: boolean }`)

### Removed
- Dead commented-out `AsyncLocalStorage`-based server store code from `store.ts`
- Stale `TODO` comment in `state.ts`

## [3.1.2] - 2026-05-29

### Added
- `VocabStoreContextProvider` (exported as `VocabStateProvider`) — React context provider that creates an isolated `VocabStore` per subtree via `useMemo`
- `VocabStore.uid` — random identifier for debug/verbose purposes
- `useVocabStoreContext` hook for consuming the store from context

### Changed
- Store access in `useState` switched from global `getVocabStore()` to `useVocabStoreContext()` — store is now scoped to the nearest provider instead of being a singleton
- `runWithStateVocab` removed from public exports; replaced by `VocabStateProvider`
- `VocabStore` is now exported as `default`
- Tests updated to wrap hooks in `VocabStoreContextProvider` via a `makeWrapper` helper; cross-hook state sharing test rewritten to use a single `renderHook` call so both hooks share the same provider instance

### Removed
- `runWithStateVocab` and `getVocabStore` (global singleton / `AsyncLocalStorage`-based server store approach)

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