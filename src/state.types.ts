export type Serialize<V = unknown> = (v: V) => string
export type Deserialize<V = unknown> = (v: string) => V

export type Transformer<V> = (prev: V) => V
export type ValueOrTransformer<V> = V | Transformer<V>

export type Factory<V> = () => V
export type ValueOrFactory<V> = V | Factory<V>