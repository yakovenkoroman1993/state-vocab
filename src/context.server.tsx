import React from "react"
import * as asyncHooks from "node:async_hooks"
import type { AsyncLocalStorage } from "node:async_hooks"
import type { PropsWithChildren, ReactNode } from "react"
import type { Vocab } from "./state.types"

type AsyncStore = { value: Vocab }

const serverOnlyCheck = (name: string) => {
  if (!React.useState) {
    return
  }

  throw new Error(`${name} only intended for Server Components`)
}

let storage: AsyncLocalStorage<AsyncStore> | null = null
try {
  serverOnlyCheck("StateVocabServerContext")
  storage = new asyncHooks.AsyncLocalStorage<AsyncStore>()
} catch {
  // Running in client component context — server context unavailable
  storage = null
}

const Enter = ({ value }: { value: Vocab }) => {
  storage?.enterWith({ value })
  return null
}

const NoopProvider = ({ children }: PropsWithChildren<{ value?: Vocab }>): ReactNode => children

// Important! The provider must always be asynchronous because child components can be async too
const RealProvider = async (
  props: PropsWithChildren<{ value: Vocab }>
) => {
  serverOnlyCheck("StateVocabServerContext.Provider")

  const { value, children } = props
  
  return (
    <>
      <Enter value={value} />
      {children}
    </>
  )
}

export const getStateVocab = () => {
  serverOnlyCheck("getStateVocab")

  return storage?.getStore()?.value
}

export const StateVocabServerContext = {
  Provider: storage ? RealProvider : NoopProvider
}
