import type { Deserialize, Serialize, ValueOrFactory, ValueOrTransformer } from "./state.types"

// useState
export type UseStateOptions<V> = {
  defaultValue?: ValueOrFactory<V>,
  delayedSet?: number
  bidirectional?: true
  onSet?(nextValue: NoInfer<V>, prevValue: NoInfer<V>): void
  storage?: unknown
  serialize?: Serialize<V>
  deserialize?: Deserialize<V>
}

type UseStateResult<V> = readonly [V, (nextValue: ValueOrTransformer<V>) => void, () => void]

// useInitialState
export type UseInitialStateOptions<V> = {
  defaultValue?: ValueOrFactory<V>,
  storage?: unknown
  serialize?: Serialize<V>
  deserialize?: Deserialize<V>
}

type Placeholder<V> = {
  useState(options?: UseStateOptions<V>): UseStateResult<V>
  useInitialState(options?: UseInitialStateOptions<V>): void
}

export type ClientSlot<V> = {
  clientSlot(input: Placeholder<V>): Placeholder<V>
}

type Clientified<R> =
  R extends ClientSlot<infer V>
    ? Placeholder<V>
    : R extends object
      ? { [K in keyof R]: Clientified<R[K]> }
      : R

export type ClientifyResult<R> = Clientified<R>