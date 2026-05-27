import { cache } from "react";
import { get, set } from "./utils";
import type { ValueOrTransformer, Vocab } from "./state.types";
import { isTransformer } from "./state.utils";

type Listener = () => void

/***
 * https://react.dev/reference/react/useSyncExternalStore
 */
class VocabStore {
  #vocab: Vocab
  #listeners: Set<Listener>

  constructor() {
    this.#vocab = {}
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

const createStore = () => {
  return new VocabStore()
};

const getServerStore = cache(createStore);

let clientStore: VocabStore | null = null;

const getClientStore = () => {
  if (!clientStore) {
    clientStore = createStore();
  }

  return clientStore;
};

export const getVocabStore = () => {
  return typeof window === "undefined" ? getServerStore() : getClientStore()
}
  