import React, { cache } from "react"
import type { Vocab } from "./state.types"

const serverOnlyCheck = (name: string) => {
  if (!React.useState) {
    return
  }

  throw new Error(`${name} only intended for Server Components`)
}

// Per-request Map keyed by opaque token — React.cache() creates a fresh Map per request
export const getRequestStore = cache(() => new Map<symbol, Promise<Vocab>>())

export const getStateVocab = async (serverContextKey: symbol) => {
  serverOnlyCheck("getStateVocab")
  return await getRequestStore().get(serverContextKey)
}

