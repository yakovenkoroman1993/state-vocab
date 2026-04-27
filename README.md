# @yakocloud/state-vocab

A lightweight React state management library that synchronizes component state with any `Storage`-compatible backend (localStorage, sessionStorage, custom).

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

**Initialize once at the root, read anywhere in the tree.** Call `.useState()` with a `defaultValue` at a parent component to seed the state — then call `.useState()` without arguments in any descendant to consume it. No context wiring, no prop passing. Convenient in NextJs

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

The `defaultValue` at the root acts as the initializer — subsequent `.useState()` calls in children pick up the shared value automatically without re-specifying defaults.

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

**Minimal API surface.** Three exports: `defineState`, `setupStorage`, `StorageProvider`. No actions, reducers, selectors, or stores to configure.

## Installation

```bash
npm install @yakocloud/state-vocab react react-dom
```

> `react` and `react-dom` are peer dependencies and must be installed separately.

## Quick Start

```tsx
import { setupStorage, defineState, StorageProvider } from '@yakocloud/state-vocab'

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
})

function App() {
  return (
    <StorageProvider>
      <Settings />
    </StorageProvider>
  )
}

function Settings() {
  const [theme, setTheme] = storage.path.to.theme.useState()

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
| `ssr` | `boolean \| undefined` | Defer storage reads until after mount (SSR support) | `false` |

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

### `StorageProvider`

A React context provider that must wrap all components using `.useState()` from any state node. Place it once near the top of your tree.

```tsx
createRoot(document.getElementById('root')!).render(
  <StorageProvider>
    <App />
  </StorageProvider>
)
```

Accepts an optional `verbose` prop that logs the current state vocab to the browser console on every change — useful during development.

```tsx
<StorageProvider verbose>
  <App />
</StorageProvider>
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
import { setupStorage, defineState, StorageProvider } from '@yakocloud/state-vocab'

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
})

// Root — initializes shared state for the whole subtree
function Page() {
  storage.demo.pageProps.useState({
    defaultValue: { title: 'Hello', count: 42 },
  })

  return <Dashboard />
}

// Deep child — reads without re-specifying defaults
function PageHeader() {
  const [pageProps] = storage.demo.pageProps.useState()
  return <h1>{pageProps.title} ({pageProps.count})</h1>
}

function Dashboard() {
  const [theme, setTheme] = storage.preference.theme.useState()
  const [nightMode, setNightMode] = storage.preference.nightMode.useState()
  const [counter, setCounter, resetCounter] = storage.stats.counter.useState()
  const [note, setNote] = storage.personal.note.useState({
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
  <StorageProvider>
    <Page />
  </StorageProvider>
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
| `ssr` | `boolean \| undefined` | `false` |

Returns a proxied copy of `tree` with paths injected into all leaf nodes.

### `StorageProvider`

React context provider. Must be an ancestor of any component using `.useState()`.

| Prop | Type | Description |
|---|---|---|
| `verbose` | `boolean \| undefined` | Log state vocab to console on every change |

### `node.useState(options?)`

| Option | Type | Description |
|---|---|---|
| `defaultValue` | `T \| (() => T) \| undefined` | Local default, overrides `defineState` default |
| `delayedSet` | `number \| undefined` | Debounce delay for `onSet` in ms |
| `onSet` | `(next: T, prev: T) => void \| undefined` | Callback after state change |
| `bidirectional` | `true \| undefined` | Sync state across browser tabs |

Returns `[value, setValue, resetValue]`.