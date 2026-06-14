import { get, set } from "./utils";
import type { ValueOrTransformer, Vocab } from "./state.types";
import { isTransformer } from "./utils";

type Listener = () => void

/***
 * https://react.dev/reference/react/useSyncExternalStore
 */
export default class VocabStore {
  uid: string
  #vocab: Vocab
  #listeners: Set<Listener>

  constructor(value?: Vocab) {
    this.uid = Math.random().toString(36).slice(2)
    this.#vocab = value ?? {}
    this.#listeners = new Set<Listener>()
  }
  subscribe(listener: Listener) {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener);
  }
  getClientSnapshot<V>() {
    return this.#vocab as Vocab<V>;
  }
  getServerSnapshot<V>() {
    return this.#vocab as Vocab<V>;
  }
  get<V>(statePath: string) {
    return get(this.#vocab, statePath) as V | undefined
  }
  set<V>(statePath: string, value: ValueOrTransformer<V>) {
    const currentValue = get(this.#vocab, statePath) as V
    
    const resolvedValue = isTransformer(value)
      ? value(currentValue)
      : value
    
    const nextVocab = { ...this.#vocab }

    // Embedding value: 
    // V into "a.b.c.d" => { a: { b: { c: { d: value } } } }
    set(nextVocab, statePath, resolvedValue)

    this.#vocab = nextVocab
    this.#listeners.forEach((l) => l()) // emit
  }
}