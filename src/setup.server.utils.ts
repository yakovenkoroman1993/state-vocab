import type { ServerSlot } from "./setup.server.types"
import { getRequestStore } from "./context.server"

export function healtcheck(prefix = "") {
  const testContextKey = Symbol("test")
  
  const { size } = getRequestStore()
  getRequestStore().set(testContextKey, {})

  if (getRequestStore().size === size) {
    throw new Error([
      prefix,
      "Start execution only within a React render context (per-request)."
    ].join(" "))
  } else {
    getRequestStore().delete(testContextKey)
  }
}

export function isServerSlot(value: unknown): value is ServerSlot<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "serverSlot" in value
  )
}