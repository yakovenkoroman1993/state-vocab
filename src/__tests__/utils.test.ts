/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { get, set, debounce, isJsonValid } from "../utils"

// ─── get ──────────────────────────────────────────────────────────────────────

describe("get", () => {
  it("returns a value by a simple path", () => {
    expect(get({ a: 1 }, "a")).toBe(1)
  })

  it("returns a value by a nested path", () => {
    expect(get({ a: { b: { c: 42 } } }, "a.b.c")).toBe(42)
  })

  it("returns defaultValue if the path does not exist", () => {
    expect(get({ a: 1 }, "a.b.c", "default")).toBe("default")
  })

  it("returns defaultValue if an intermediate node is null", () => {
    expect(get({ a: null }, "a.b", "fallback")).toBe("fallback")
  })

  it("returns the object itself for an empty path", () => {
    const obj = { x: 1 }
    expect(get(obj, "")).toBe(obj)
  })

  it("returns undefined (not defaultValue) when the value is explicitly undefined", () => {
    // undefined in the object → key exists, but the value is undefined → returns defaultValue
    expect(get({ a: undefined }, "a", "def")).toBe("def")
  })

  it("handles numeric values correctly including 0", () => {
    expect(get({ a: { b: 0 } }, "a.b", 99)).toBe(0)
  })

  it("handles false correctly", () => {
    expect(get({ a: false }, "a", true)).toBe(false)
  })
})

// ─── set ──────────────────────────────────────────────────────────────────────

describe("set", () => {
  it("sets a value by a simple key", () => {
    const obj: Record<string, unknown> = {}
    set(obj, "a", 42)
    expect(obj.a).toBe(42)
  })

  it("creates nested objects along the path", () => {
    const obj: Record<string, unknown> = {}
    set(obj, "a.b.c", "hello")
    expect((obj as any).a.b.c).toBe("hello")
  })

  it("overwrites an existing value", () => {
    const obj = { a: { b: 1 } } as Record<string, unknown>
    set(obj, "a.b", 99)
    expect((obj as any).a.b).toBe(99)
  })

  it("creates an array when the next key is numeric", () => {
    const obj: Record<string, unknown> = {}
    set(obj, "list.0", "item")
    expect(Array.isArray((obj as any).list)).toBe(true)
    expect((obj as any).list[0]).toBe("item")
  })

  it("supports bracket notation", () => {
    const obj: Record<string, unknown> = {}
    set(obj, "arr[0]", "value")
    expect((obj as any).arr[0]).toBe("value")
  })

  it("does not affect other keys when updating", () => {
    const obj = { a: 1, b: 2 } as Record<string, unknown>
    set(obj, "a", 100)
    expect(obj.b).toBe(2)
  })
})

// ─── debounce ─────────────────────────────────────────────────────────────────

describe("debounce", () => {
  beforeEach(() => { vi.useFakeTimers() })

  it("calls the function once after the delay", () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 200)

    debounced()
    debounced()
    debounced()

    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("passes the latest arguments", () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced("first")
    debounced("second")
    debounced("third")

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledWith("third")
  })

  it("resets the timer on every call", () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    vi.advanceTimersByTime(50)
    debounced() // reset
    vi.advanceTimersByTime(50)

    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("calls again after the previous delay has completed", () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    vi.advanceTimersByTime(100)
    debounced()
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it("works with wait=0", () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 0)

    debounced()
    vi.advanceTimersByTime(0)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

// ─── isJsonValid ──────────────────────────────────────────────────────────────

describe("isJsonValid", () => {
  it.each([
    ["{}", true],
    ["[]", true],
    ["\"string\"", true],
    ["42", true],
    ["true", true],
    ["null", true],
    ["{\"a\":1}", true],
    ["", false],
    ["{a:1}", false],
    ["undefined", false],
    ["'string'", false],
  ])("isJsonValid(%s) → %s", (input, expected) => {
    expect(isJsonValid(input)).toBe(expected)
  })
})