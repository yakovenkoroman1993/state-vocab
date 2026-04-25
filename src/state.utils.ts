import type { Vocab } from "./context"
import type { ValueOrTransformer, Transformer, ValueOrFactory, Factory } from "./types"
import { set } from "./utils"

// embedding value: D into "a.b.c.d" => { a: { b: { c: { d: value } } } }
export const embed = <D>(statePath: string, value: D) => (vocab: Vocab<D>) => {
  const nextVocab = { ...vocab }
  set(nextVocab, statePath, value)
  return nextVocab
}

export const genStoredValue = <V>(
  options: {
    serialized: string | null,
    defaultValue: ValueOrFactory<V>,
    superDefaultValue: unknown,
    deserialize: (v: string) => V
  }
) => {
  const { serialized, defaultValue, superDefaultValue, deserialize } = options

  if (serialized === null) {
    const nextValue = valueOrFactory(defaultValue) ?? superDefaultValue as V
      
    if (typeof nextValue === "undefined") {
      return undefined as V
    }

    return nextValue
  } 

  return deserialize(serialized)
}

export const isTransformer = <V>(v: ValueOrTransformer<V>): v is Transformer<V> => {
  return typeof v === "function";
}

const isFactory = <V>(v: ValueOrFactory<V>): v is Factory<V> => {
  return typeof v === "function";
}

export const valueOrFactory = <V>(input: ValueOrFactory<V>) => {
  return isFactory(input) ? input() : input
}