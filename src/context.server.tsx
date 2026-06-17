import type { Vocab } from "./state.types"
import { cache } from "react"

// Per-request Map keyed by opaque token — React.cache() creates a fresh Map per request
export const getRequestStore = cache(() => (
  new Map<symbol, Vocab>()
))

export const getStateVocab = (serverContextKey: symbol) => {
  return getRequestStore().get(serverContextKey)
}

export const setStateVocab = (serverContextKey: symbol, value: Vocab) => {
  return getRequestStore().set(serverContextKey, value)
}

