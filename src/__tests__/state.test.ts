import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { defineState } from "../state"
import { clientify } from "../setup.client"
import { setupStorage } from "../setup"
import React from "react"
import { StateVocabClientProvider } from "../provider.client"

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(StateVocabClientProvider, null, children)
}

function renderState<T>(
  stateNode: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useState: (...args: any[]) => readonly [T, (v: T | ((p: T) => T)) => void, () => void]
  },
  defaultValue?: T,
  options?: Parameters<typeof stateNode.useState>[0]
) {
  return renderHook(
    () => stateNode.useState({ ...options, defaultValue }),
    { wrapper: makeWrapper() }
  )
}

// ─── basic behaviour ─────────────────────────────────────────────────────────

describe("defineState — basic behaviour", () => {
  it("returns defaultValue from useState when no storage is provided", () => {
    const storage = clientify(setupStorage({ val1: defineState<number>() }))
    const { result } = renderState(storage.val1, 42)
    expect(result.current[0]).toBe(42)
  })

  it("setState updates the value", () => {
    const storage = clientify(setupStorage({ val2: defineState<string>() }))
    const { result } = renderState(storage.val2, "initial")

    act(() => result.current[1]("updated"))
    expect(result.current[0]).toBe("updated")
  })

  it("setState with an updater function", () => {
    const storage = clientify(setupStorage({ val3: defineState<number>() }))
    const { result } = renderState(storage.val3, 10)

    act(() => result.current[1]((prev: number) => prev + 5))
    expect(result.current[0]).toBe(15)
  })

  it("state initialized in one hook, setState called from another", () => {
    const storage = clientify(setupStorage({ val4: defineState<number>() }))
    const { result } = renderHook(
      () => ({
        a: storage.val4.useState({
          defaultValue: 10
        }),
        b: storage.val4.useState(),
      }),
      { wrapper: makeWrapper() }
    )

    act(() => result.current.b[1]((prev: number) => prev + 5))
    expect(result.current.a[0]).toBe(15)
    expect(result.current.b[0]).toBe(15)

    act(() => result.current.a[1]((prev: number) => prev + 5))
    expect(result.current.a[0]).toBe(20)
    expect(result.current.b[0]).toBe(20)

    act(() => result.current.b[1]((prev: number) => prev + 5))
    expect(result.current.a[0]).toBe(25)
    expect(result.current.b[0]).toBe(25)
  })

  it("resetState reverts to defaultValue", () => {
    const storage = clientify(setupStorage({ val5: defineState<number>() }))
    const { result } = renderState(storage.val5, 0)

    act(() => result.current[1](99))
    expect(result.current[0]).toBe(99)

    act(() => result.current[2]())
    expect(result.current[0]).toBe(0)
  })

  it("superDefaultValue from defineState is used as fallback", () => {
    const storage = clientify(setupStorage({ val6: defineState<string>({ defaultValue: "super" }) }))
    const { result } = renderState(storage.val6)
    expect(result.current[0]).toBe("super")
  })

  it("defaultValue from useState overrides superDefaultValue", () => {
    const storage = clientify(setupStorage({ val7: defineState<string>({ defaultValue: "super" }) }))
    const { result } = renderState(storage.val7, "local")
    expect(result.current[0]).toBe("local")
  })

  it("factory defaultValue is called on initialization", () => {
    const factory = vi.fn(() => [1, 2, 3])
    const storage = clientify(setupStorage({
      val: defineState<number[]>({
        defaultValue: factory
      })
    }))
    renderState(storage.val)
    expect(factory).toHaveBeenCalledTimes(1)
  })
})

// ─── localStorage ─────────────────────────────────────────────────────────────

describe("defineState — localStorage", () => {
  it("reads value from localStorage on initialization", () => {
    localStorage.setItem("pref.theme", JSON.stringify("Dark"))
    const storage = clientify(setupStorage({ pref: { theme: defineState<string>({ storage: localStorage }) } }))
    const { result } = renderState(storage.pref.theme, "Light")
    expect(result.current[0]).toBe("Dark")
  })

  it("writes value to localStorage on setState", () => {
    const storage = clientify(setupStorage({ note: defineState<string>({ storage: localStorage }) }))
    const { result } = renderState(storage.note, "")

    act(() => result.current[1]("hello"))
    expect(localStorage.getItem("note")).toBe("\"hello\"")
  })

  it("uses custom serialize/deserialize", () => {
    const storage = clientify(setupStorage({
      date: defineState<Date>({
        storage: localStorage,
        serialize: (d) => d.toISOString(),
        deserialize: (s) => new Date(s),
      })
    }))

    const date = new Date("2024-06-15")
    const { result } = renderState(storage.date)

    act(() => result.current[1](date))
    expect(localStorage.getItem("date")).toBe(date.toISOString())
  })

  it("uses defaultValue when key is not found in localStorage", () => {
    const storage = clientify(setupStorage({ count: defineState<number>({ storage: localStorage }) }))
    const { result } = renderState(storage.count, 7)
    expect(result.current[0]).toBe(7)
  })

  it("resetState removes key from localStorage when there is no defaultValue", () => {
    const storage = clientify(setupStorage({ tmp: defineState<string>({ storage: localStorage }) }))
    const { result } = renderState(storage.tmp)

    act(() => result.current[1]("value"))
    expect(localStorage.getItem("tmp")).toBe("\"value\"")

    act(() => result.current[2]())
    expect(localStorage.getItem("tmp")).toBeNull()
  })

  it("resetState writes superDefaultValue to localStorage", () => {
    const storage = clientify(setupStorage({
      theme: defineState<string>({ storage: localStorage, defaultValue: "Dark" })
    }))
    const { result } = renderState(storage.theme)

    act(() => result.current[1]("White"))
    act(() => result.current[2]())

    expect(localStorage.getItem("theme")).toBe("\"Dark\"")
    expect(result.current[0]).toBe("Dark")
  })
})

// ─── sessionStorage ───────────────────────────────────────────────────────────

describe("defineState — sessionStorage", () => {
  it("reads value from sessionStorage", () => {
    sessionStorage.setItem("flag", JSON.stringify(true))
    const storage = clientify(setupStorage({ flag: defineState<boolean>({ storage: sessionStorage }) }))
    const { result } = renderState(storage.flag, false)
    expect(result.current[0]).toBe(true)
  })

  it("writes value to sessionStorage", () => {
    const storage = clientify(setupStorage({ flag: defineState<boolean>({ storage: sessionStorage }) }))
    const { result } = renderState(storage.flag, false)

    act(() => result.current[1](true))
    expect(sessionStorage.getItem("flag")).toBe("true")
  })
})

// ─── memory (no storage) ─────────────────────────────────────────────────────

describe("defineState — memory (no storage)", () => {
  it("does not persist to localStorage", () => {
    const storage = clientify(setupStorage({ counter: defineState<number>() }))
    const { result } = renderState(storage.counter, 0)

    act(() => result.current[1](5))
    expect(localStorage.getItem("counter")).toBeNull()
  })

  it("resetState with memory reverts to defaultValue without touching storage", () => {
    const storage = clientify(setupStorage({ x: defineState<number>() }))
    const { result } = renderState(storage.x, 100)

    act(() => result.current[1](999))
    act(() => result.current[2]())
    expect(result.current[0]).toBe(100)
  })
})

// ─── onSet callback ───────────────────────────────────────────────────────────

describe("defineState — onSet callback", () => {
  beforeEach(() => { vi.useFakeTimers() })

  it("calls onSet on setState", () => {
    const onSet = vi.fn()
    const storage = clientify(setupStorage({ val8: defineState<number>() }))
    const { result } = renderState(storage.val8, 0, { onSet })

    act(() => result.current[1](5))
    vi.runAllTimers()
    expect(onSet).toHaveBeenCalledWith(5, 0)
  })

  it("passes prevValue correctly", () => {
    const onSet = vi.fn()
    const storage = clientify(setupStorage({ val9: defineState<number>() }))
    const { result } = renderState(storage.val9, 10, { onSet })

    act(() => result.current[1](20))
    vi.runAllTimers()
    act(() => result.current[1](30))
    vi.runAllTimers()

    expect(onSet).toHaveBeenNthCalledWith(1, 20, 10)
    expect(onSet).toHaveBeenNthCalledWith(2, 30, 20)
  })

  it("debounce — defers the onSet call", () => {
    const onSet = vi.fn()
    const storage = clientify(setupStorage({ val10: defineState<number>() }))
    const { result } = renderState(storage.val10, 0, { onSet, delayedSet: 300 })

    act(() => result.current[1](1))
    act(() => result.current[1](2))
    act(() => result.current[1](3))

    expect(onSet).not.toHaveBeenCalled()
    vi.advanceTimersByTime(300)

    // Due to debounce only the last value triggers the call
    expect(onSet).toHaveBeenCalledTimes(1)
  })

  it("onSet is called on resetState", () => {
    const onSet = vi.fn()
    const storage = clientify(setupStorage({ val11: defineState<number>() }))
    const { result } = renderState(storage.val11, 0, { onSet })

    act(() => result.current[1](42))
    vi.runAllTimers()
    onSet.mockClear()

    act(() => result.current[2]())
    vi.runAllTimers()
    expect(onSet).toHaveBeenCalledWith(0, 42)
  })
})

// ─── bidirectional (cross-tab sync) ──────────────────────────────────────────

describe("defineState — bidirectional", () => {
  it("updates state on StorageEvent (bidirectional in defineState)", () => {
    const storage = clientify(setupStorage({
      theme: defineState<string>({ storage: localStorage, bidirectional: true })
    }))
    const { result } = renderState(storage.theme, "Light")

    act(() => {
      window.dispatchEvent(new StorageEvent("storage", {
        key: "theme",
        newValue: "\"Dark\"",
      }))
    })

    expect(result.current[0]).toBe("Dark")
  })

  it("updates state on StorageEvent (bidirectional in useState)", () => {
    const storage = clientify(setupStorage({
      mode: defineState<string>({ storage: localStorage })
    }))
    const { result } = renderState(storage.mode, "off", { bidirectional: true })

    act(() => {
      window.dispatchEvent(new StorageEvent("storage", {
        key: "mode",
        newValue: "\"on\"",
      }))
    })

    expect(result.current[0]).toBe("on")
  })

  it("ignores StorageEvent with a different key", () => {
    const storage = clientify(setupStorage({
      a: defineState<string>({ storage: localStorage, bidirectional: true })
    }))
    const { result } = renderState(storage.a, "original")

    act(() => {
      window.dispatchEvent(new StorageEvent("storage", {
        key: "b",
        newValue: "\"changed\"",
      }))
    })

    expect(result.current[0]).toBe("original")
  })

  it("does not listen to StorageEvent when bidirectional is not set", () => {
    const storage = clientify(setupStorage({
      val12: defineState<string>({ storage: localStorage })
    }))
    const { result } = renderState(storage.val12, "original")

    act(() => {
      window.dispatchEvent(new StorageEvent("storage", {
        key: "val12",
        newValue: "\"changed\"",
      }))
    })

    expect(result.current[0]).toBe("original")
  })
})

// ─── custom storage ───────────────────────────────────────────────────────────

describe("defineState — custom storage", () => {
  it("reads and writes through a custom Storage", () => {
    const store: Record<string, string> = {}
    const customStorage: Storage = {
      length: 0,
      clear: () => {},
      key: () => null,
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => {
        store[k] = v
      },
      removeItem: (k) => {
        delete store[k]
      },
    }

    const appStorage = clientify(setupStorage({
      db: defineState<string>({ storage: customStorage })
    }))
    const { result } = renderState(appStorage.db, "")

    act(() =>
      result.current[1]("saved")
    )
    expect(store["db"]).toBe("\"saved\"")
  })
})

// ─── two components — shared context ─────────────────────────────────────────

describe("defineState — shared context sync", () => {
  it("two hooks with the same path share state within one context", () => {
    const storage = clientify(setupStorage({ shared: defineState<number>() }))

    // Both hooks must live in the same React tree, otherwise they get separate contexts
    const { result } = renderHook(
      () => ({
        a: storage.shared.useState({
          defaultValue: 0
        }),
        b: storage.shared.useState({
          defaultValue: 0
        }),
      }),
      { wrapper: makeWrapper() }
    )

    act(() => result.current.a[1](42))

    expect(result.current.b[0]).toBe(42)
  })
})

// ─── known bugs (documenting behaviour) ──────────────────────────────────────

describe("defineState — known issues", () => {
  beforeEach(() => { vi.useFakeTimers() })

  /**
   * BUG #2: onSet is captured in a closure with empty deps=[].
   * If the callback changes after mount, the stale one is called.
   * The test documents the current (broken) behaviour.
   */
  it("[BUG] onSet stale closure — original callback is called", () => {
    const first = vi.fn()
    const second = vi.fn()
    const storage = clientify(setupStorage({ v: defineState<number>() }))

    const { result, rerender } = renderHook(
      ({ cb }: { cb: (n: number, p: number) => void }) =>
        storage.v.useState({ defaultValue: 0, onSet: cb }),
      {
        initialProps: { cb: first },
        wrapper: makeWrapper(),
      }
    )

    rerender({ cb: second })

    act(() => result.current[1](1))
    vi.runAllTimers()

    // After the fix this should be second, not first
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(0)
  })

  /**
   * BUG #10: the default deserialize (JSON.parse) is not wrapped in try/catch.
   * If the stored value is invalid JSON the hook will throw.
   */
  it("[BUG] throws on invalid JSON in storage", () => {
    localStorage.setItem("broken", "not-json")
    const storage = clientify(setupStorage({
      broken: defineState<string>({ storage: localStorage })
    }))

    expect(() => renderState(storage.broken, "default")).toThrow()
  })
})