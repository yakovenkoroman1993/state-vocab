import type { ValueOrTransformer, Transformer, ValueOrFactory, Factory } from "./state.types"

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