import React, { cache } from "react"
import type { PropsWithChildren, ReactNode } from "react"
import type { Vocab } from "./state.types"

const serverOnlyCheck = (name: string) => {
  if (!React.useState) {
    return
  }

  throw new Error(`${name} only intended for Server Components`)
}

// Per-request Map keyed by opaque token — React.cache() creates a fresh Map per request
const getRequestStore = cache(() => new Map<symbol, Vocab>())

const NoopProvider = ({ children }: PropsWithChildren<{ value?: Vocab }>): ReactNode => children

// Important! The provider must always be asynchronous because child components can be async too
const RealProvider = async (
  props: PropsWithChildren<{
    serverContextKey: symbol
    value: Vocab
  }>
) => {
  serverOnlyCheck("StateVocabServerContext.Provider")

  const { serverContextKey, value, children } = props

  getRequestStore().set(serverContextKey, value)

  return children
}

export const getStateVocab = (serverContextKey: symbol) => {
  serverOnlyCheck("getStateVocab")

  return getRequestStore().get(serverContextKey)
}

export const StateVocabServerContext = {
  Provider: !React.useState ? RealProvider : NoopProvider
}
