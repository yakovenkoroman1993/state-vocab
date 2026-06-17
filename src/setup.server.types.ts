import type { PropsWithChildren, ReactNode } from "react"
import type { Vocab } from "./state.types"

type Placeholder<V> = {
  getState(): V
}

export type ServerSlot<V> = {
  serverSlot(input: Placeholder<V>): Placeholder<V>
}

type ServerifiedValue<R> = {
  [K in keyof R]?:
    R[K] extends ServerSlot<infer V>
      ? V
      : R[K] extends object
        ? ServerifiedValue<R[K]>
        : R[K]
}

type Serverified<R> =
  R extends ServerSlot<infer V>
    ? Placeholder<V>
    : R extends object
      ? { 
        seed(input: ServerifiedValue<R>): Vocab
      } & { 
        [K in keyof R]: Serverified<R[K]>
      }
      : R

export type ServerifyResult<R extends object> =
  {
    seed(input: ServerifiedValue<R>): Vocab
    StateVocabProvider(props: PropsWithChildren<{ value?: ServerifiedValue<R> }>): ReactNode
  } & {
    [K in keyof R]: Serverified<R[K]>
  }