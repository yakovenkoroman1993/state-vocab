import type { Vocab } from "./context"
import type { ValueOrTransformer, Transformer, ValueOrFactory, Factory } from "./state.types"
import { set } from "./utils"

// Embedding value: D into "a.b.c.d" => { a: { b: { c: { d: value } } } }
export const embed = <D>(statePath: string, value: D) => (vocab: Vocab<D>) => {
  const nextVocab = { ...vocab }
  set(nextVocab, statePath, value)
  return nextVocab
}

export const genStoredValue = <V>(
  options: {
    serialized: string | null,
    deserialize: (v: string) => V
  }
) => {
  const { serialized, deserialize } = options

  if (serialized === null) {
    return null
  } 

  return deserialize(serialized)
}

export const isTransformer = <V>(v: ValueOrTransformer<V>): v is Transformer<V> => {
  return typeof v === "function";
}

const isFactory = <V>(v: ValueOrFactory<V>): v is Factory<V> => {
  return typeof v === "function";
}

export const isValueDefined = <V>(v: V | undefined): v is V => {
  return typeof v !== "undefined"
}

export const valueOrFactory = <V>(input: ValueOrFactory<V>) => {
  return isFactory(input) ? input() : input
}