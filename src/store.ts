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

declare class AsyncLocalStorage<T> {
  run<R>(store: T, fn: () => R): R;
  getStore(): T | undefined;
}

let requestStorage: AsyncLocalStorage<VocabStore>
if (typeof window === "undefined") {
  requestStorage = new AsyncLocalStorage<VocabStore>();
}

const getServerStore = () => {
  const store = requestStorage.getStore();
  
  if (!store) {
    throw new Error(`${VocabStore.name} must be initialized for this request`);
  }

  return store;
};

let clientStore: VocabStore | null = null;

const getClientStore = () => {
  if (!clientStore) {
    clientStore = new VocabStore()
  }

  return clientStore;
};

export function runWithStateVocab<T>(fn: () => T) {
  return requestStorage.run(new VocabStore(), fn)
}

export const getVocabStore = () => {
  if (typeof window === "undefined") {
    return getServerStore()
  }
  
  return getClientStore()
}
  