import type { Deserialize, Serialize, ValueOrFactory } from "./state.types"

export type UseStateOptions<V> = {
  defaultValue?: ValueOrFactory<V>,
  delayedSet?: number
  bidirectional?: true
  onSet?(nextValue: NoInfer<V>, prevValue: NoInfer<V>): void
  storage?: unknown
  serialize?: Serialize<V>
  deserialize?: Deserialize<V>
}

export type UseInitialStateOptions<V> = {
  defaultValue?: ValueOrFactory<V>,
  storage?: unknown
  serialize?: Serialize<V>
  deserialize?: Deserialize<V>
}
