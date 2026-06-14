import { STATE_PATH, STATE_SSR, STATE_VERBOSE, STATE_VERBOSE_PATH } from "./constants"

export type Serialize<V = unknown> = (v: V) => string
export type Deserialize<V = unknown> = (v: string) => V

export type Transformer<V> = (prev: V) => V
export type ValueOrTransformer<V> = V | Transformer<V>

export type Factory<V> = () => V
export type ValueOrFactory<V> = V | Factory<V>

export type Vocab<T = unknown> = Record<string, T | null>

export type VocabThis = {
  [STATE_PATH]: string;
  [STATE_VERBOSE]: boolean;
  [STATE_VERBOSE_PATH]: string;
  [STATE_SSR]: boolean;
}