# @yakocloud/state-vocab

A lightweight React state management library that synchronizes component state with any `Storage`-compatible backend (localStorage, sessionStorage, custom). Supports React Server Components and Next.js SSR out of the box.

## Why use state-vocab?

Most state managers treat persistence as an afterthought — you manage state first, then manually sync it to localStorage. **state-vocab flips this**: storage is defined upfront alongside the state itself, and synchronization is automatic.

**Storage-first by design.** Every state node declares its backend at definition time — localStorage, sessionStorage, or any custom adapter. No `useEffect(() => localStorage.setItem(...), [value])` scattered across components.

```ts
const storage = setupStorage({
  theme: defineState({ storage: localStorage, defaultValue: 'Dark' }),
  session: defineState({ storage: () => sessionStorage }),
  inMemory: defineState({ defaultValue: 0 }),
})
```

**Bring your own backend.** The `storage` option accepts any object implementing the [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage). Point state directly at a server, IndexedDB wrapper, or encrypted store — no extra adapters needed.

```ts
defineState({
  storage: {
    getItem: (key) => api.get(key),
    setItem: (key, value) => api.set(key, value),
    removeItem: (key) => api.delete(key),
    length: 0,
    clear: () => {},
    key: () => null,
  }
})
```

**No prop drilling.** State lives in a shared `storage` object imported directly into any component. No need to pass values down through layers of props or lift state up to a common ancestor.

```tsx
// ❌ without state-vocab — thread props through every layer
function Page({ theme, onThemeChange }) {
  return <Sidebar theme={theme} onThemeChange={onThemeChange} />
}
function Sidebar({ theme, onThemeChange }) {
  return <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
}
function ThemeToggle({ theme, onThemeChange }) {
  return <button onClick={() => onThemeChange('Dark')}>{theme}</button>
}

// ✅ with state-vocab — import storage, use directly
function ThemeToggle() {
  const [theme, setTheme] = storage.preference.theme.useState()
  return <button onClick={() => setTheme('Dark')}>{theme}</button>
}
```

**Initialize once at the root, read anywhere in the tree.** Call `.useState()` with a `defaultValue` at a parent component to seed the state — then call `.useState()` without arguments in any descendant to consume it. No context wiring, no prop passing.

```tsx
// Root component — initializes the state
function Page() {
  storage.demo.pageProps.useState({
    defaultValue: {
      a: 1,
      b: 2,
      c: ['one', 'two'],
    },
  })

  return <DeepChild />
}

// Somewhere deep in the tree — reads the same state
function DeepChild() {
  const [pageProps] = storage.demo.pageProps.useState()

  return (
    <div>
      <p>a: {pageProps.a}</p>
      <p>b: {pageProps.b}</p>
      <p>c: {pageProps.c.join(', ')}</p>
    </div>
  )
}
```

**React Server Components support.** Read state in async server components and seed it into client components — no extra API routes or serialization boilerplate.

**Dot-notation access with full TypeScript inference.** The state tree is navigated like a plain object — autocomplete guides you to the right node, and types flow from `defineState<T>` all the way to the hook return value without any manual annotations.

```ts
const [theme, setTheme] = storage.preference.theme.useState()
//     ^? 'Dark' | 'White' | 'System'

const [birthday, setBirthday] = storage.personal.birthday.useState()
//     ^? Date | null
```

If you rename or restructure a node in `setupStorage`, TypeScript immediately flags every broken reference across the codebase.

**Custom serialization per node.** Dates, Maps, class instances — define `serialize`/`deserialize` once and the hook handles the rest transparently.

```ts
defineState({
  storage: localStorage,
  deserialize: (raw) => new Date(JSON.parse(raw)),
})
```

**Minimal API surface.** `defineState` and `setupStorage` define the state tree; `clientify` from `@yakocloud/state-vocab/client` wires up React hooks. No actions, reducers, selectors, or stores to configure.

## Installation

```bash
npm install @yakocloud/state-vocab react react-dom
```

> `react` and `react-dom` are peer dependencies and must be installed separately.

## Quick Start

Define your storage tree once (`setupStorage`/`defineState`), call `clientify` to attach React hooks. If you use react server components (RSC) wrap your app with `StateVocabProvider` at the root and call `serverify` to attach RSC-methods. Use state anywhere in the tree

Library SSR-requirements:
- `Per-request store`: A Next.js server can handle multiple requests simultaneously. This means that the store should be created per request and should not be shared across requests.
- `SSR friendly`: Next.js applications are rendered twice, first on the server and again on the client. Having different outputs on both the client and the server will result in "hydration errors." The store will have to be initialized on the server and then re-initialized on the client with the same data in order to avoid that.

```tsx
import { setupStorage, defineState } from '@yakocloud/state-vocab'
import { clientify } from '@yakocloud/state-vocab/client'

type Theme = 'Dark' | 'White' | 'System'

const storage = setupStorage({
  path: {
    to: {
      theme: defineState<Theme>({
        storage: localStorage,
        defaultValue: 'Dark',
      }),
    },
  },
}, {
  ssr: false // by default true
})

const clientStorage = clientify(storage)

function Settings() {
  const [theme, setTheme] = clientStorage.path.to.theme.useState()

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
      <option value="Dark">Dark</option>
      <option value="White">White</option>
      <option value="System">System</option>
    </select>
  )
}
```

## Core Concepts

### `defineState(options?)`

Defines a state node. Options:

| Option | Type | Description |
|---|---|---|
| `storage` | `Storage \| (() => Storage) \| undefined` | Where to persist the value. Omit for in-memory only. |
| `defaultValue` | `T \| (() => T)` | Value used when storage has no entry. Accepts a factory function. |
| `bidirectional` | `true \| undefined` | Sync state across browser tabs via the `storage` event. |
| `serialize` | `(v: T) => string` | Custom serializer. Default: `JSON.stringify`. |
| `deserialize` | `(v: string) => T` | Custom deserializer. Default: `JSON.parse`. |

```ts
// In-memory (no persistence)
const counter = defineState({ defaultValue: 0 })

// localStorage with custom type
const theme = defineState<'Dark' | 'White'>({
  storage: () => localStorage,
  defaultValue: 'Dark',
})

// localStorage with custom deserialization
const birthday = defineState({
  storage: () => localStorage,
  deserialize: (raw) => new Date(JSON.parse(raw)),
})

// bidirectional — syncs value when changed in another tab
const note = defineState({
  storage: localStorage,
  bidirectional: true,
})
```

### `setupStorage(tree, options?)`

Wraps a nested object of `defineState()` nodes and injects dot-separated paths into each leaf. The returned object mirrors your tree structure.

| Option | Type | Description | Default |
|---|---|---|---|
| `verbose` | `boolean \| undefined` | Log current state to the browser console on every change | `false` |
| `verbosePath` | `string \| undefined` | Narrow verbose logging to a specific subtree (dot-separated path). When set, only that subtree is logged instead of the entire state. TypeScript will autocomplete valid paths based on your tree. | `undefined` |
| `ssr` | `boolean \| undefined` | Defer storage reads until after hydration (Next.js / SSR) | `true` |

```ts
const storage = setupStorage({
  user: {
    name: defineState({ storage: localStorage }),
    age: defineState({ defaultValue: 0 }),
  },
})

storage.user.name  // → path: "user.name"
storage.user.age   // → path: "user.age"
```

Enable verbose logging during development:

```ts
const storage = setupStorage({ ... }, { verbose: true })
```

Narrow verbose logging to a specific subtree:

```ts
const storage = setupStorage({
  user: {
    profile: defineState({ ... }),
    settings: defineState({ ... }),
  },
  cart: {
    items: defineState({ ... }),
  },
}, {
  verbose: true,
  verbosePath: "user", // only logs changes inside "user.*"
})
```

TypeScript will only accept paths that exist in your tree — `"user"`, `"user.profile"`, `"cart.items"`, etc. Invalid paths are caught at compile time.

### SSR / Next.js (client components)

When using localStorage or sessionStorage in a Next.js app, the server renders with `defaultValue` while the client reads the persisted value — causing a hydration mismatch. Pass `ssr: true` to fix this:

```ts
// lib/storage.ts
const storage = setupStorage({
  preference: {
    theme: defineState<Theme>({ storage: localStorage, defaultValue: 'Dark' }),
  },
})
```

By default `ssr: true`:
- **Server & first client render** — always use `defaultValue`, storage is not read
- **After hydration** — `useLayoutEffect` fires synchronously before paint, reads storage and updates state

This guarantees the server and client produce identical markup, and the value from storage is applied without a visible flash.

### Next.js Pages Router (SSR without RSC)

If you use Next.js with the **Pages Router** (or any SSR setup without React Server Components), you still need `ssr: true` to prevent hydration mismatches — but you don't have server components to wrap with `StateVocabProvider` from `serverify`.

In this case, wrap your app with `StateVocabClientProvider` from `@yakocloud/state-vocab/client`. It creates an isolated `VocabStore` per render, preventing state from leaking between concurrent SSR requests.

```tsx
// pages/_app.tsx
import type { AppProps } from 'next/app'
import { StateVocabClientProvider } from '@yakocloud/state-vocab/client'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <StateVocabClientProvider>
      <Component {...pageProps} />
    </StateVocabClientProvider>
  )
}
```

Storage is still configured with `ssr: true` (the default):

```ts
// lib/storage.ts
import { setupStorage, defineState } from '@yakocloud/state-vocab'
import { clientify } from '@yakocloud/state-vocab/client'

const storage = setupStorage({
  preference: {
    theme: defineState<'Dark' | 'White' | 'System'>({
      storage: localStorage,
      defaultValue: 'Dark',
    }),
  },
  // ssr: true is the default — storage reads are deferred until after hydration
})

export const clientStorage = clientify(storage)
```

Use `clientStorage` directly in any page or component — no additional wiring needed:

```tsx
// pages/settings.tsx
import { clientStorage } from '@/lib/storage'

export default function Settings() {
  const [theme, setTheme] = clientStorage.preference.theme.useState()

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value as 'Dark' | 'White' | 'System')}>
      <option value="Dark">Dark</option>
      <option value="White">White</option>
      <option value="System">System</option>
    </select>
  )
}
```

`StateVocabClientProvider` also accepts an optional `value` prop to pre-seed the store with server-fetched data (e.g., from `getServerSideProps`):

```tsx
// pages/_app.tsx
import type { AppProps } from 'next/app'
import { StateVocabClientProvider } from '@yakocloud/state-vocab/client'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <StateVocabClientProvider value={pageProps.initialVocab}>
      <Component {...pageProps} />
    </StateVocabClientProvider>
  )
}
```

### React Server Components (RSC)

For Next.js apps using the App Router, state-vocab provides dedicated server and client entry points that let you read state in async server components and pass it down to client components via `StateVocabProvider`.

**Package entry points:**

| Import path | Use in |
|---|---|
| `@yakocloud/state-vocab` | Shared files — `defineState`, `setupStorage` |
| `@yakocloud/state-vocab/server` | Server Components — `serverify` |
| `@yakocloud/state-vocab/client` | Client Components — `clientify`, `StateVocabClientProvider` |

**1. Define the shared storage schema** (used on both server and client):

```ts
// storage.ts
import { setupStorage, defineState } from '@yakocloud/state-vocab'

export const storage = setupStorage({
  user: {
    name: defineState<string>(),
    role: defineState<string>(),
  },
  person: {
    address: {
      city: defineState<string>(),
    },
  },
})
```

**2. Create a client context, then create server and client storage handles:**

Each storage tree needs its own React context so that multiple independent providers can coexist on the same page without their state bleeding into each other.

```ts
// storage.context.client.ts  ("use client")
"use client"

import { createContext } from 'react'

export const StorageClientContext = createContext({})
```

```ts
// storage.server.ts
import { storage } from '@/storage'
import { serverify } from '@yakocloud/state-vocab/server'
import { StorageClientContext } from '@/storage.context.client'

export const serverStorage = serverify(storage, {
  clientContext: StorageClientContext,
})
```

```ts
// storage.client.ts  ("use client")
"use client"

import { storage } from '@/storage'
import { clientify } from '@yakocloud/state-vocab/client'
import { StorageClientContext } from '@/storage.context.client'

export const clientStorage = clientify(storage, {
  clientContext: StorageClientContext,
})
```

**3. Seed initial state in the server component and read it in Server and Client children:**

```tsx
// app/page.tsx (Server Component)
import { serverStorage } from '@/storage.server'

const { StateVocabProvider } = serverStorage

export default async function Page() {
  // Call start() before rendering the provider — registers the store for this
  // request so child components can await getState() concurrently
  serverStorage.start()

  // Fetch data from DB / API
  const user = await db.getUser()

  return (
    <StateVocabProvider
      value={{
        user: { name: user.name, role: user.role },
        person: { address: { city: user.city } },
      }}
    >
      <UserInfo />
    </StateVocabProvider>
  )
}
```

```tsx
// app/user-info.server.tsx (Server Component)
import { serverStorage } from '@/storage.server'

export default async function UserInfo() {
  const name = await serverStorage.user.name.getState()
  const role = await serverStorage.user.role.getState()

  return <p>{name} — {role}</p>
}
```

```tsx
// app/user-info.tsx ("use client")
"use client"

import { clientStorage } from '@/storage.client'

export default function UserInfoClient() {
  const [name] = clientStorage.user.name.useState()
  const [role] = clientStorage.user.role.useState()

  return <p>{name} — {role}</p>
}
```

#### Multiple independent storage trees

Because each `serverify`/`clientify` pair is bound to its own context, you can have multiple independent providers active at the same time — for example, a layout-level store and a page-level store — without them interfering with each other:

```ts
// layout.context.client.ts ("use client")
export const LayoutClientContext = createContext({})

// page.context.client.ts ("use client")
export const PageClientContext = createContext({})

// layout.storage.server.ts
export const layoutServerStorage = serverify(layoutStorage, { 
  clientContext: LayoutClientContext 
})

// layout.storage.client.ts ("use client")
export const layoutClientStorage = clientify(layoutStorage, { 
  clientContext: LayoutClientContext 
})

// page.storage.server.ts
export const pageServerStorage = serverify(pageStorage, { 
  clientContext: PageClientContext 
})

// page.storage.client.ts ("use client")
export const pageClientStorage = clientify(pageStorage, { 
  clientContext: PageClientContext 
})
```

Each `StateVocabProvider` wraps its own subtree; a component that calls `pageClientStorage.user.name.useState()` reads only from the nearest `pageServerStorage.StateVocabProvider`, not from the layout provider.

#### `serverify(storage)`

Converts a storage tree into its server-side counterpart. Each leaf gains an async `.getState()` method that resolves once the nearest `StateVocabProvider` renders and provides its value. Each namespace node (including the root) gains a `.seed()` method that returns the input wrapped under its full ancestor path. The result also exposes `StateVocabProvider` and `start()` — call `start()` at the top of the component that renders `StateVocabProvider` so concurrent server children can await the value without timing out.

**`.seed()` syntax:**

```ts
// Full tree at once — root .seed() returns input as-is
serverStorage.seed({ user: { name: 'Alice', role: 'Admin' } })
// → { user: { name: 'Alice', role: 'Admin' } }

// Single namespace — wraps input under its key
serverStorage.user.seed({ name: 'Alice', role: 'Admin' })
// → { user: { name: 'Alice', role: 'Admin' } }

// Nested namespace — wraps up to the root
serverStorage.person.address.seed({ city: 'NY' })
// → { person: { address: { city: 'NY' } } }
```

**`node.getState()`** asynchronously reads the value for that leaf once the surrounding `StateVocabProvider` has rendered. Returns `Promise<V>` — always `await` it. Throws (rejects) if called outside a provider scope or if `serverTimeout` expires.

#### `clientify(storage)`

Converts a storage tree into its client-side counterpart. Each leaf gains `.useState()` and `.useInitialState()` hooks. The tree structure is identical to the original — same dot-notation access.

```ts
const clientStorage = clientify(storage)

// In a client component:
const [name] = clientStorage.user.name.useState()
```

## `useState` Hook

Each state node exposes a `.useState()` method that works like React's built-in `useState` but adds persistence and callbacks.

```ts
const [value, setValue, resetValue] = storage.path.to.node.useState(options?)
```

### Options

**`defaultValue`** — overrides the `defineState`-level default for this usage. Accepts a value or factory function:

```ts
const [alarm] = storage.alarm.useState({ defaultValue: () => new Date() })
```

**`delayedSet`** — debounces the `onSet` callback by N milliseconds:

```ts
const [note, setNote] = storage.note.useState({
  delayedSet: 1000,
  onSet: (value) => saveToServer(value),
})
```

**`onSet`** — called after every state change with `(nextValue, prevValue)`:

```ts
const [counter, setCounter] = storage.counter.useState({
  onSet(next, prev) {
    console.log(`Changed from ${prev} to ${next}`)
  },
})
```

**`bidirectional`** — enables cross-tab sync via the `storage` event. Can be set here or in `defineState`:

```ts
const [note, setNote] = storage.note.useState({ bidirectional: true })
```

### Return value

```ts
const [value, setValue, resetValue] = storage.node.useState()
```

- **`value`** — current state
- **`setValue(nextValue | updater)`** — set state; accepts a value or `(prev) => next` function
- **`resetValue()`** — restores the default value (removes the storage entry if no default is defined)

## Custom Storage

Any object implementing the [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage) works as a backend. This makes it easy to add debouncing, encryption, or remote persistence:

```ts
const db: Record<string, string> = {}

const storage = setupStorage({
  server: {
    data: defineState({
      defaultValue: '',
      storage: {
        length: 0,
        getItem: (key) => db[key] ?? null,
        setItem: (key, value) => debouncedSave(key, value),
        removeItem: (key) => { delete db[key] },
        clear: () => {},
        key: () => null,
      },
    }),
  },
})
```

## Full Example

```tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { setupStorage, defineState } from '@yakocloud/state-vocab'
import { clientify } from '@yakocloud/state-vocab/client'

type Theme = 'Dark' | 'White' | 'System'

const storage = setupStorage({
  preference: {
    theme: defineState<Theme>({ storage: localStorage, defaultValue: 'Dark' }),
    nightMode: defineState({ storage: sessionStorage, defaultValue: false }),
  },
  stats: {
    counter: defineState({ defaultValue: 0, storage: sessionStorage }),
  },
  personal: {
    note: defineState({ storage: localStorage, defaultValue: '' }),
    birthday: defineState({
      storage: localStorage,
      deserialize: (raw) => {
        try { return new Date(JSON.parse(raw)) } catch { return null }
      },
    }),
  },
  demo: {
    pageProps: defineState<{ title: string; count: number }>({
      storage: localStorage,
    }),
  },
}, {
  ssr: false // by default true
})

const clientStorage = clientify(storage)

// Root — initializes shared state for the whole subtree
function Page() {
  clientStorage.demo.pageProps.useState({
    defaultValue: { title: 'Hello', count: 42 },
  })

  return <Dashboard />
}

// Deep child — reads without re-specifying defaults
function PageHeader() {
  const [pageProps] = clientStorage.demo.pageProps.useState()
  return <h1>{pageProps.title} ({pageProps.count})</h1>
}

function Dashboard() {
  const [theme, setTheme] = clientStorage.preference.theme.useState()
  const [nightMode, setNightMode] = clientStorage.preference.nightMode.useState()
  const [counter, setCounter, resetCounter] = clientStorage.stats.counter.useState()
  const [note, setNote] = clientStorage.personal.note.useState({
    delayedSet: 500,
    onSet: (v) => console.log('Saving note:', v),
  })

  return (
    <div>
      <PageHeader />

      <select value={theme ?? ''} onChange={(e) => setTheme(e.target.value as Theme)}>
        <option value="Dark">Dark</option>
        <option value="White">White</option>
        <option value="System">System</option>
      </select>

      <input
        type="checkbox"
        checked={!!nightMode}
        onChange={(e) => setNightMode(e.target.checked)}
      />

      <input
        type="number"
        value={counter}
        onChange={(e) => setCounter(+e.target.value)}
      />
      <button onClick={resetCounter}>Reset</button>

      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>
)
```

## API Reference

### `defineState<T>(options?)`

| Option | Type | Default |
|---|---|---|
| `storage` | `Storage \| (() => Storage) \| undefined` | `undefined` (in-memory) |
| `defaultValue` | `T \| (() => T) \| undefined` | `undefined` |
| `bidirectional` | `true \| undefined` | `undefined` |
| `serialize` | `(v: T) => string` | `JSON.stringify` |
| `deserialize` | `(v: string) => T` | `JSON.parse` |

### `setupStorage<T>(tree: T, options?): T`

| Option | Type | Default |
|---|---|---|
| `verbose` | `boolean \| undefined` | `false` |
| `verbosePath` | `Path<T> \| undefined` | `undefined` |
| `ssr` | `boolean \| undefined` | `true` |

Returns a proxied copy of `tree` with paths injected into all leaf nodes.

### `StateVocabProvider`

A React context provider that initializes a `VocabStore` for its subtree. Only required in RSC / Next.js App Router contexts (where `ssr: true`). For standard SPAs without SSR, no provider is needed — hooks use a module-level store automatically.

In RSC contexts, `StateVocabProvider` is available on the `serverify()` result — it accepts an optional `value` prop to pre-seed the store with server-fetched data:

```tsx
const { StateVocabProvider } = serverStorage

<StateVocabProvider value={{ user: { name: 'Alice' } }}>
  <App />
</StateVocabProvider>
```

### `StateVocabClientProvider`

A client-only provider for SSR setups **without** React Server Components (e.g. Next.js Pages Router). Import from `@yakocloud/state-vocab/client` and place it at your app root to ensure per-request store isolation. Accepts an optional `value` prop to pre-seed the store.

```tsx
import { StateVocabClientProvider } from '@yakocloud/state-vocab/client'

<StateVocabClientProvider value={initialVocab}>
  <App />
</StateVocabClientProvider>
```

### `serverify<T>(storage: T, options)`

Converts a storage tree to its server-side counterpart. Available from `@yakocloud/state-vocab/server`.

| Option | Type | Description |
|---|---|---|
| `clientContext` | `Context<object>` | **Required.** A React context created with `createContext({})` in a `"use client"` file. Must match the `clientContext` passed to `clientify` for the same storage tree. |
| `serverTimeout` | `number \| undefined` | Timeout in ms for each `getState()` call. Defaults to `1000`. If the `StateVocabProvider` has not rendered within this window, `getState()` rejects with a descriptive error. |

The result exposes:

- **`start()`** — call once at the top of the component that renders `StateVocabProvider`, before any `await` expressions. It registers a pending promise in the per-request store (`React.cache()` scope), which lets concurrent server components `await getState()` without hanging. Must be called within a React render context.
- **`StateVocabProvider`** — synchronous server component that accepts a `value` prop and resolves the pending promise registered by `start()`.
- **`node.getState()`** — async; reads the value for that leaf once the nearest `StateVocabProvider` has rendered. Throws if called outside a provider scope or if the timeout expires.
- **`node.seed(input)`** — wraps `input` under the node's ancestor path, returning a plain object ready to pass as the `value` prop.

```ts
import { serverify } from '@yakocloud/state-vocab/server'
import { MyClientContext } from '@/storage.context.client'

const serverStorage = serverify(storage, {
  clientContext: MyClientContext,
  serverTimeout: 2000, // optional, default 1000
})

const { StateVocabProvider } = serverStorage

// In a Server Component:
serverStorage.start()                                  // register before rendering
await serverStorage.user.name.getState()               // reads "user.name" (async)
serverStorage.user.seed({ name: 'Alice' })             // → { user: { name: 'Alice' } }
serverStorage.person.address.seed({ city: 'NY' })      // → { person: { address: { city: 'NY' } } }
serverStorage.seed({ user: { name: 'Alice' } })        // → { user: { name: 'Alice' } } (identity)
```

### `clientify<T>(storage: T, options?)`

Converts a storage tree to its client-side counterpart. Available from `@yakocloud/state-vocab/client`.

| Option | Type | Description |
|---|---|---|
| `clientContext` | `Context<object> \| undefined` | The React context created with `createContext({})` for this storage tree. Must match the `clientContext` passed to `serverify`. Required when using RSC; omit for SPA-only setups. |

Each leaf gains `.useState()` and `.useInitialState()`. The tree structure mirrors the original.

```ts
import { clientify } from '@yakocloud/state-vocab/client'
import { MyClientContext } from '@/storage.context.client'

const clientStorage = clientify(storage, { clientContext: MyClientContext })

// In a "use client" component:
const [name] = clientStorage.user.name.useState()
```

### `node.useState(options?)`

| Option | Type | Description |
|---|---|---|
| `defaultValue` | `T \| (() => T) \| undefined` | Local default, overrides `defineState` default |
| `delayedSet` | `number \| undefined` | Debounce delay for `onSet` in ms |
| `onSet` | `(next: T, prev: T) => void \| undefined` | Callback after state change |
| `bidirectional` | `true \| undefined` | Sync state across browser tabs |

Returns `[value, setValue, resetValue]`

### `node.useInitialState(options)`

Initializes state without subscribing the caller component to re-renders. Use at layout or root components that only need to seed a value — not react to its changes.

| Option | Type | Description |
|---|---|---|
| `defaultValue` | `T \| (() => T)` | Value to seed. Required. |

```tsx
function Page() {
  // Seeds the value — this component will NOT re-render when pageProps changes
  storage.demo.pageProps.useInitialState({
    defaultValue: { title: 'Hello', count: 42 },
  })

  return <Dashboard />
}
```
