# @yakocloud/state-vocab

A lightweight React state management library that synchronizes component state with any `Storage`-compatible (localStorage, sessionStorage, custom).

## Why use state-vocab?
 
Most state managers treat persistence as an afterthought — you manage state first, then manually sync it to localStorage. **state-vocab flips this**: storage is defined upfront alongside the state itself, and synchronization is automatic.
 
**Storage-first by design.** Every state node declares its backend at definition time — localStorage, sessionStorage, or any custom adapter. No `useEffect(() => localStorage.setItem(...), [value])` scattered across components.
 
```ts
// declare once — works everywhere
const storage = setupStorage({
  theme: defineState({ storage: localStorage, defaultValue: 'Dark' }),
  session: defineState({ storage: sessionStorage }),
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
    // ...
  }
})
```
 
**No prop drilling.** State lives in a shared `storage` object imported directly into any component. No need to pass values down through layers of props or lift state up to a common ancestor — any component in the tree can read and write the same node independently.
 
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
npm install @yakocloud/state-vocab
```

## Quick Start

```tsx
import { setupStorage, defineState, StorageProvider } from 'state-vocab'

const storage = setupStorage({
  path: {
    to: {
      theme: defineState<'Dark' | 'White' | 'System'>({
        storage: localStorage,
        defaultValue: 'Dark',
      })
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
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
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
| `storage` | `Storage` | Where to persist the value. Omit for in-memory only. |
| `defaultValue` | `T` | Value used when storage has no entry. |
| `serialize` | `(v: T) => string` | Custom serializer. Default: `JSON.stringify`. |
| `deserialize` | `(v: string) => T` | Custom deserializer. Default: `JSON.parse`. |

```ts
// In-memory (no persistence)
const counter = defineState({ defaultValue: 0 })

// localStorage with custom type
const theme = defineState<'Dark' | 'White'>({
  storage: localStorage,
  defaultValue: 'Dark',
})

// localStorage with custom serialization
const birthday = defineState({
  storage: localStorage,
  deserialize: (raw) => new Date(JSON.parse(raw)),
})
```

### `setupStorage(tree)`

Wraps a nested object of `defineState()` nodes and injects dot-separated paths into each leaf. The returned object mirrors your tree structure.

```ts
const storage = setupStorage({
  user: {
    name: defineState({ storage: localStorage }),
    age: defineState({ defaultValue: 0 }),
  },
})

// Access paths:
storage.user.name  // → path: "user.name"
storage.user.age   // → path: "user.age"
```

### `StorageProvider`

A React context provider that must wrap all components using `useState()` from any state node. Place it once near the top of your tree.

```tsx
createRoot(document.getElementById('root')!).render(
  <StorageProvider>
    <App />
  </StorageProvider>
)
```

## `useState` Hook

Each state node exposes a `.useState()` method that works like React's built-in `useState` but adds persistence and callbacks.

```ts
const [value, setValue, resetValue] = storage.path.to.node.useState(
  defaultValue?,
  options?
)
```

### Arguments

**`defaultValue`** — overrides the `defineState`-level default for this usage. Accepts a value or initializer function:

```ts
const [alarm] = storage.alarm.useState(() => new Date())
```

**`options.delayedSet`** — debounce the `onSet` callback by N milliseconds:

```ts
const [note, setNote] = storage.note.useState('', {
  delayedSet: 1000,
  onSet: (value) => saveToServer(value),
})
```

**`options.onSet`** — called after every state change with `(nextValue, prevValue)`:

```ts
const [counter, setCounter] = storage.counter.useState(0, {
  onSet(next, prev) {
    console.log(`Changed from ${prev} to ${next}`)
  },
})
```

### Return value

```ts
const [value, setValue, resetValue] = storage.node.useState()
```

- **`value`** — current state
- **`setValue(nextValue | updater)`** — set state; accepts a value or `(prev) => next` function
- **`resetValue()`** — restores the default value

## Custom Storage

Any object implementing the [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage) works as a backend:

```ts
const storage = setupStorage({
  server: defineState({
    storage: {
      length: 0,
      getItem: (key) => cache[key] ?? null,
      setItem: (key, value) => api.save(key, value),
      removeItem: (key) => { delete cache[key] },
      clear: () => {},
      key: () => null,
    },
  }),
})
```

## Full Example

```tsx
import { setupStorage, defineState, StorageProvider } from 'state-vocab'

type Theme = 'Dark' | 'White' | 'System'

const storage = setupStorage({
  preference: {
    theme: defineState<Theme>({ storage: localStorage, defaultValue: 'Dark' }),
    nightMode: defineState({ storage: sessionStorage }),
  },
  stats: {
    counter: defineState({ defaultValue: 0 }),
  },
  personal: {
    note: defineState({ storage: localStorage }),
    birthday: defineState({
      storage: localStorage,
      deserialize: (raw) => {
        try { return new Date(JSON.parse(raw)) } catch { return null }
      },
    }),
  },
})

function Dashboard() {
  const [theme, setTheme] = storage.preference.theme.useState()
  const [nightMode, setNightMode] = storage.preference.nightMode.useState(false)
  const [counter, setCounter, resetCounter] = storage.stats.counter.useState(0)
  const [note, setNote] = storage.personal.note.useState('', {
    delayedSet: 500,
    bidirectional: true,
    onSet: (v) => console.log('Saving note:', v),
  })

  return (
    <div>
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
    <Dashboard />
  </StorageProvider>
)
```

## API Reference

### `defineState<T>(options?)`

| Option | Type | Default |
|---|---|---|
| `storage` | `Storage \| undefined` | `undefined` (in-memory) |
| `defaultValue` | `T \| undefined` | `undefined` |
| `bidirectional` | `true \| undefined` | `undefined` |
| `serialize` | `(v: T) => string` | `JSON.stringify` |
| `deserialize` | `(v: string) => T` | `JSON.parse` |

### `setupStorage<T>(tree: T): T`

Returns a proxied copy of `tree` with paths injected into all leaf nodes.

### `StorageProvider`

React context provider. Must be an ancestor of any component using `.useState()`.

### `node.useState<D>(defaultValue?, options?)`

| Parameter | Type | Description |
|---|---|---|
| `defaultValue` | `D \| (() => D) \| undefined` | Local default, overrides `defineState` default |
| `options.delayedSet` | `number \| undefined` | Debounce delay for `onSet` in ms |
| `options.onSet` | `(next: D, prev: D) => void \| undefined` | Callback after state change |
| `options.bidirectional` | `true \| undefined` | bidirectional state update to sync tabs |

Returns `[value, setValue, resetValue]`.