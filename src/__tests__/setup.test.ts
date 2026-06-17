import { describe, it, expect } from "vitest"
import { setupStorage } from "../setup"
import { clientify } from "../setup.client"
import { defineState } from "../state"

// ─── path injection ───────────────────────────────────────────────────────────
function setupClientStorage<T extends object>(tree: T) {
  return clientify(setupStorage(tree, { ssr: false }))
}

describe("setupStorage / injectPaths", () => {
  it("injects a path into a first-level leaf node", () => {
    const storage = setupClientStorage({ foo: defineState() })
    expect(storage.foo.toString()).toBe("foo")
  })

  it("injects a nested dot-separated path", () => {
    const storage = setupClientStorage({
      a: { b: { c: defineState() } }
    })
    expect(storage.a.b.c.toString()).toBe("a.b.c")
  })

  it("assigns different paths to different leaves", () => {
    const storage = setupClientStorage({
      x: defineState(),
      y: defineState(),
    })
    expect(storage.x.toString()).toBe("x")
    expect(storage.y.toString()).toBe("y")
  })

  it("handles deeply nested leaves", () => {
    const storage = setupClientStorage({
      preference: {
        theme: defineState<string>(),
        ui: {
          nightMode: defineState<boolean>(),
        }
      }
    })
    expect(storage.preference.theme.toString()).toBe("preference.theme")
    expect(storage.preference.ui.nightMode.toString()).toBe("preference.ui.nightMode")
  })

  // ─── caching ──────────────────────────────────────────────────────────────

  it("returns the same leaf object on repeated access (leafCache)", () => {
    const storage = setupClientStorage({ item: defineState() })
    const first = storage.item
    const second = storage.item
    expect(first).toBe(second)
  })

  it("returns the same intermediate proxy on repeated access (proxyCache)", () => {
    const storage = setupClientStorage({ a: { b: defineState() } })
    const first = storage.a
    const second = storage.a
    expect(first).toBe(second)
  })

  // ─── leaf methods ─────────────────────────────────────────────────────────

  it("useState on a leaf is a function", () => {
    const storage = setupClientStorage({ val: defineState() })
    expect(typeof storage.val.useState).toBe("function")
  })

  it("toString returns the correct path", () => {
    const storage = setupClientStorage({ deep: { path: defineState() } })
    expect(storage.deep.path.toString()).toBe("deep.path")
    expect(`${storage.deep.path}`).toBe("deep.path")
  })

  it("reuses the same leaf object independently across different paths", () => {
    const leaf = defineState<string>()
    const storage = setupClientStorage({ a: leaf, b: leaf })
    // Each path should receive its own STATE_PATH
    expect(storage.a.toString()).toBe("a")
    expect(storage.b.toString()).toBe("b")
  })

  // ─── primitives and non-leaf values ──────────────────────────────────────

  it("returns primitive values as-is", () => {
    const storage = setupClientStorage({ version: 1 })
    expect(storage.version).toBe(1)
  })

  it("does not wrap plain objects without STATE_DEFINITION", () => {
    const config = { timeout: 500 }
    const storage = setupClientStorage({ config })
    // Returned through a proxy, but values remain accessible
    expect(storage.config.timeout).toBe(500)
  })
})