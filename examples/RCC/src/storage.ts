import { defineState, setupStorage } from "@yakocloud/state-vocab";
import { clientify } from "@yakocloud/state-vocab/client";
import { debouncedSetItem, globalDb, type Theme } from "./main.utils";

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
          return globalDb[key] ?? null
        },
        key: function (): string | null {
          throw new Error('Function not implemented.')
        },
        removeItem: function (key: string): void {
          delete globalDb[key]
        },
        setItem(key: string, value: string) {
          debouncedSetItem(key, value)
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
      bidirectional: true
    }),
  }
}, {
  ssr: false,
  // verbose: true,
  // verbosePath: "demo.pageProps"
})

export const clientStorage = clientify(storage)