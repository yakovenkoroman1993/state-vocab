import { StrictMode, useId } from 'react'
import { createRoot } from 'react-dom/client'
import { StateVocabContextProvider } from './context'
import { setupStorage } from './setup'
import { defineState } from './state'
import { debounce, isJsonValid } from './utils'
import { toDateString, toLocalDatetimeString } from './main.utils'

type Theme = "Dark" | "White" | "System"

const db: Record<string, string> = {}

function fetchMock(value: unknown) {
  console.log("[UI]: Send request", value)
  return new Promise<string>((resolve) =>
    setTimeout(() => {
      const rnd = Math.random().toString()
      resolve(rnd)
      console.log("[UI]: Fetched: ", rnd)
    }, 1000)
  )
}

const storage = setupStorage({
  preference: {
    theme: defineState<Theme>({ storage: () => localStorage, defaultValue: "Dark" }),
    nightMode: defineState({ storage: sessionStorage, defaultValue: false }),
  },
  personal: {
    note: defineState({ storage: localStorage, defaultValue: "" }),
    birthday: defineState({
      storage: localStorage,
      bidirectional: true,
      deserialize(raw) {
        try {
          const date = JSON.parse(raw)
          
          return new Date(date)
        } catch {
          return null
        }
      }
    }),
    alarm: defineState({
      storage: localStorage,
      deserialize(raw) {
        try {
          const date = JSON.parse(raw)
          
          return new Date(date)
        } catch {
          return null
        }
      }
    }),
  },
  stats: {
    counter: defineState({
      defaultValue: 0,
      storage: sessionStorage
    }),
    list: defineState<{ 
      id: number
      label: string
    }[]>({
      storage: sessionStorage
    }),
  },
  json: {
    objectDraft: defineState<string>(),
    object: defineState<object>({
      storage: sessionStorage,
    })
  },
  server: {
    db: defineState({
      // customStorage
      defaultValue: "",
      storage: {
        length: 0,
        clear: function (): void {
          throw new Error('Function not implemented.')
        },
        getItem: function (key: string): string | null {
          return db[key] ?? null
        },
        key: function (): string | null {
          throw new Error('Function not implemented.')
        },
        removeItem: function (key: string): void {
          delete db[key]
        },
        setItem(...args) {
          debouncedSetItem(...args)
        }
      }
    })
  },
  demo: {
    pageProps: defineState<{
      a: number;
      b: number;
      c: string[];
    }>({
      storage: localStorage,
    }),
  }
}, {
  // ssr: true
})

const debouncedSetItem = debounce(async (key: string, value: string) => {
  const data = await fetchMock(value)
  db[key] = data
}, 300)

function Test() {
  storage.demo.pageProps.useState({
    defaultValue: {
      a: 1,
      b: 2,
      c: ["1", "2"]
    },
  });

  // localStorage, literal string
  const [theme, setTheme] = storage.preference.theme.useState()
  
  // sessionStorage, boolean
  const [nightMode, setNightMode] = storage.preference.nightMode.useState()
  
  // memoryStorage, number
  const [counter, setCounter, resetCounter] = storage.stats.counter.useState({
    defaultValue: 0,
    onSet(nextValue, prevValue) {
      setList((prevList) => {
        if (nextValue <= 0) {
          return []
        }

        return nextValue > prevValue
          ? [...prevList, {
            id: prevList.length,
            label: `Counter #${nextValue}`,
          }]
          : prevList.slice(0, nextValue)
      })
    }
  })

  // localStorage, string + debounced fetch
  const [note, setNote] = storage.personal.note.useState({
    defaultValue: "",
    delayedSet: 1000,
    onSet: fetchMock,
    bidirectional: true,
  })

  // customStorage, string
  const [db, setDb] = storage.server.db.useState()

  // sessionStorage, object
  const [json, setJson] = storage.json.object.useState({
    defaultValue: {},
    delayedSet: 1000,
    onSet: fetchMock
  })

  const [objectDraft, setObjectDraft] = storage.json.objectDraft.useState({
    defaultValue: () => JSON.stringify(json)
  })

  // localStorage, Date
  const [birthday, setBirthday] = storage.personal.birthday.useState()

  // localStorage, Date
  const [alarm, setAlarm] = storage.personal.alarm.useState({
    defaultValue: () => new Date()
  })

  // memoryStorage, array
  const [list, setList] = storage.stats.list.useState({
    defaultValue: []
  })

  const prefix = useId()

  return (
    <div>
      <label htmlFor={`${prefix}-theme`}>Theme: </label>
      <select
        id={`${prefix}-theme`}
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
      >
        <option value="Dark" >Dark</option>
        <option value="White" >White</option>
        <option value="System" >System</option>
      </select>
      
      <hr />
      
      <label htmlFor={`${prefix}-night-mode`}>flag: </label>
      <input
        id={`${prefix}-night-mode`}
        type="checkbox"
        checked={!!nightMode}
        onChange={(e) => setNightMode(e.target.checked)}
      />

      <hr />

      <label htmlFor={`${prefix}-counter`}>counter: </label>
      <input
        id={`${prefix}-counter`}
        type="number"
        value={counter}
        onChange={(e) => setCounter(+e.target.value)}
      />
      <button onClick={resetCounter}>Reset counter</button>

      <div>
        {list.map((item, idx) => (
          <p key={idx}>{ item.id } - { item.label }</p>
        ))}
      </div>
      

      <hr />

      <label htmlFor={`${prefix}-note`}>Note:</label>
      <input
        id={`${prefix}-note`}
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <hr />

      <label htmlFor={`${prefix}-db`}>db:</label>
      <textarea
        id={`${prefix}-db`}
        value={db}
        onChange={(e) => setDb(e.target.value)}
      />

      <hr />

      <label htmlFor={`${prefix}-draft-object`}>object:</label>
      <textarea
        id={`${prefix}-draft-object`}
        value={objectDraft}
        onChange={(e) => {
          setObjectDraft(e.target.value)
        }}
      />
      <button
        disabled={!isJsonValid(objectDraft)}
        onClick={() => {
          try {
            setJson(JSON.parse(objectDraft))
          } catch { 
            // nope
          }
        }}
      >
        Save json
      </button>
      
      <hr />

      <label htmlFor={`${prefix}-birthday`}>Birthday:</label>
      <input
        type="date"
        id={`${prefix}-birthday`}
        value={toDateString(birthday)}
        onChange={(e) => setBirthday(new Date(e.target.value))}
      />
      
      <hr />

      <label htmlFor={`${prefix}-alarm`}>Alarm:</label>
      <input
        type="datetime-local"
        id={`${prefix}-alarm`}
        value={toLocalDatetimeString(alarm)}
        onChange={(e) => setAlarm(new Date(e.target.value))}
      />
      <Inside />
    </div>
  )
}

function Inside() {
  return (
    <DeepInside />
  )
}

function DeepInside() {
  const [pageProps] = storage.demo.pageProps.useState()

  return (
    <div>
      <p>a: {pageProps.a}</p>
      <p>b: {pageProps.b}</p>
      <p>c: {pageProps.c.join(", ")}</p>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StateVocabContextProvider verbose>
      <Test />
      <br />
      <br />
      <br />
      <br />
      <Test />
    </StateVocabContextProvider>
  </StrictMode>,
)
