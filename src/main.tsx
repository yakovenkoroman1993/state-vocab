import { StrictMode, useId } from 'react'
import { createRoot } from 'react-dom/client'
import { StateVocabContextProvider } from './context'
import { setupStorage } from './setup'
import { defineState } from './state'
import { debounce, isJsonValid } from './utils'

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
    theme: defineState<Theme>({ storage: localStorage, defaultValue: "Dark" }),
    nightMode: defineState({ storage: sessionStorage }),
  },
  personal: {
    note: defineState({ storage: localStorage }),
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
    counter: defineState({ defaultValue: 0 }),
    list: defineState({
      storage: localStorage
    }),
  },
  json: {
    objectDraft: defineState(),
    object: defineState({
      storage: sessionStorage,
    })
  },
  server: {
    db: defineState({
      // customStorage
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
})

const debouncedSetItem = debounce(async (key: string, value: string) => {
  const data = await fetchMock(value)
  db[key] = data
}, 300)
function Test() {
  // localStorage, literal string
  const [theme, setTheme] = storage.preference.theme.useState()
  
  // sessionStorage, boolean
  const [nightMode, setNightMode] = storage.preference.nightMode.useState(false)
  
  // memoryStorage, number
  const [counter, setCounter, resetCounter] = storage.stats.counter.useState(0, {
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
  const [note, setNote] = storage.personal.note.useState("", {
    delayedSet: 1000,
    onSet: fetchMock,
    bidirectional: true,
  })

  // customStorage, string
  const [db, setDb] = storage.server.db.useState("")

  // sessionStorage, object
  const [json, setJson] = storage.json.object.useState<object>({}, {
    delayedSet: 1000,
    onSet: fetchMock
  })

  const [objectDraft, setObjectDraft] = storage.json.objectDraft.useState(
    () => JSON.stringify(json)
  )

  // localStorage, Date
  const [birthday, setBirthday] = storage.personal.birthday.useState()
  
  const toDateString = (date: Date | null) => {
    if (!date) {
      return
    }
    const offset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - offset).toISOString().slice(0, 10)
  }

  
  // localStorage, Date
  const [alarm, setAlarm] = storage.personal.alarm.useState(() => new Date())
  const toLocalDatetimeString = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - offset).toISOString().slice(0, 16)
  }

  // memoryStorage, array
  const [list, setList] = storage.stats.list.useState<{ 
    id: number
    label: string
  }[]>([])

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
