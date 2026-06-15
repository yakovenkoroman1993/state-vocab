import React, { useId } from "react"
import { createRoot } from "react-dom/client"
import { toDateString, toLocalDatetimeString, isJsonValid, fetchMock, Theme } from "./main.utils"
import { clientStorage } from "./storage";

function Main() {
  clientStorage.demo.pageProps.useState({
    defaultValue: {
      a: 1,
      b: 2,
      c: ["1", "2"]
    },
  });

  // literal string
  const [theme, setTheme] = clientStorage.preference.theme.useState()
  
  // boolean
  const [nightMode, setNightMode] = clientStorage.preference.nightMode.useState()
  
  // number
  const [counter, setCounter, resetCounter] = clientStorage.stats.counter.useState({
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

  // string + debounced fetch
  const [note, setNote] = clientStorage.personal.note.useState({
    defaultValue: "",
    delayedSet: 1000,
    onSet: fetchMock,
    bidirectional: true,
  })

  // customStorage, string
  const [db, setDb] = clientStorage.server.db.useState()

  // object
  const [json, setJson] = clientStorage.json.object.useState({
    defaultValue: {},
    delayedSet: 1000,
    onSet: fetchMock
  })

  const [objectDraft, setObjectDraft] = clientStorage.json.objectDraft.useState({
    defaultValue: () => JSON.stringify(json)
  })

  // Date
  const [birthday, setBirthday] = clientStorage.personal.birthday.useState()

  // Date
  const [alarm, setAlarm] = clientStorage.personal.alarm.useState({
    defaultValue: () => new Date()
  })

  // array
  const [list, setList] = clientStorage.stats.list.useState({
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
  const [pageProps, setPageProps] = clientStorage.demo.pageProps.useState()

  const gena = () => Math.random().toString().slice(2, 3)
  
  const handleRandom = () => {
    setPageProps((all) => {
      return { 
        ...all,
        b: +gena(),
        c: [gena(), gena()],
      }
    })
  }
  
  return (
    <div>
      <p>a: {pageProps.a}</p>
      <p>b: {pageProps.b}</p>
      <p>c: {pageProps.c.join(", ")}</p>
      <button onClick={handleRandom}>random</button>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Main />
    <br />
    <br />
    <br />
    <br />
    <Main />
  </React.StrictMode>,
)
