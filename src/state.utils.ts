import type { Vocab } from "./context"
import { set } from "./utils"

// embedding value: D into "a.b.c.d" => { a: { b: { c: { d: value } } } }
export const embed = <D>(statePath: string, value: D) => (vocab: Vocab<D>) => {
  const nextVocab = { ...vocab }
  set(nextVocab, statePath, value)
  return nextVocab
}

export const genDefaultValue = <D>(
  defaultValue: D | (() => D),
  superDefaltValue: unknown
) => {
  if (typeof defaultValue === "function") {
    const fn = defaultValue as () => D

    return fn()
  }

  return defaultValue ?? superDefaltValue as D
}

export const genStoredValue = <D>(
  options: {
    serialized: string | null,
    defaultValue: D | (() => D),
    superDefaultValue: unknown,
    deserialize: (v: string) => D
  }
) => {
  const { serialized, defaultValue, superDefaultValue, deserialize } = options

  if (serialized === null) {
    const nextValue = genDefaultValue(defaultValue, superDefaultValue)
      
    if (typeof nextValue === "undefined") {
      return undefined as D
    }
    
    return nextValue
  } 

  return deserialize(serialized) as D
}