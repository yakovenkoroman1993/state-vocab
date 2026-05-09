import {  useCallback, useEffect, useEffectEvent, useRef, useSyncExternalStore } from "react";
import { STATE_DEFINITION, STATE_PATH, STATE_VERBOSE } from "./constants";
import { get, set, logStyled, useDebounce } from "./utils";
import { isTransformer, isValueDefined, valueOrFactory } from "./state.utils";
import type { Deserialize, Serialize, ValueOrFactory, ValueOrTransformer } from "./state.types";

type Vocab<T = unknown> = Record<string, T | null>

type Listener = () => void

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
  set<V>(statePath: string, value: ValueOrTransformer<V>) {
    const currentValue = get(this.#vocab, statePath) as V
    
    const resolvedValue = isTransformer(value)
      ? value(currentValue)
      : value
    
    
    const nextVocab = { ...this.#vocab }
    // Embedding value: D into "a.b.c.d" => { a: { b: { c: { d: value } } } }
    set(nextVocab, statePath, resolvedValue)

    this.#vocab = nextVocab
    this.#listeners.forEach((l) => l()) // emit
  }
}

// TODO: ! SUPPORT ASYNC STORAGE
export function defineState<D>(
  definitionOptions: {
    storage?: ValueOrFactory<Storage> // by default memory
    defaultValue?: ValueOrFactory<D>
    bidirectional?: true
    serialize?: Serialize<D>
    deserialize?: Deserialize<D>
  } = {}
) {
  const vocabStore = new VocabStore()

  return {
    [STATE_DEFINITION]: true,   // marks this object as a leaf in the router tree
    [STATE_PATH]: "",           // placeholder; injected at runtime by injectPaths()
    [STATE_VERBOSE]: false,     // placeholder

    useState(
      this: {
        [STATE_PATH]: string;
        [STATE_VERBOSE]: boolean;
      },
      options?: {
        defaultValue?: ValueOrFactory<D>,
        delayedSet?: number
        bidirectional?: true
        onSet?(nextValue: NoInfer<D>, prevValue: NoInfer<D>): void
      }
    ) {
      const storage = valueOrFactory(definitionOptions.storage)
      const serialize: Serialize<D> = definitionOptions.serialize ?? JSON.stringify
      const deserialize: Deserialize<D> = definitionOptions.deserialize ?? JSON.parse

      const superDefaultValue = valueOrFactory(definitionOptions.defaultValue)
      const superBidirectional = definitionOptions.bidirectional

      options ??= {}

      const defaultValue = valueOrFactory(options.defaultValue) ?? superDefaultValue
      const bidirectional = options.bidirectional ?? superBidirectional

      const onSet = useDebounce(
        options.onSet ?? (() => {}),
        options.delayedSet,
        []
      )

      const statePath = this[STATE_PATH];
      const verbose = this[STATE_VERBOSE];

      const prevValueRef = useRef<D>(undefined as D)

      const initializedRef = useRef(false)
      if (!initializedRef.current) {
        initializedRef.current = true

        let initialValue = get(vocabStore.getServerSnapshot(), statePath) as D | undefined

        if (!isValueDefined(initialValue)) {

          initialValue = defaultValue

          if (storage) {
            const serialized = storage.getItem(statePath)

            if (serialized === null) {
              if (isValueDefined(initialValue)) {
                storage.setItem(statePath, serialize(initialValue))
              }
            } else { 
              initialValue = deserialize(serialized)
            }
          }

          if (isValueDefined(initialValue)) {
            vocabStore.set(statePath, initialValue)
          }
        }
      }

      const vocab = useSyncExternalStore<Vocab<D>>(
        vocabStore.subscribe.bind(vocabStore),
        () => vocabStore.getClientSnapshot(),
        () => {
          // TODO: ! SSR
          return vocabStore.getServerSnapshot()
        }
      )

      if (verbose) {
        logStyled(vocab)
      }


      const value = get(vocab, statePath) as D
      prevValueRef.current = value

      const handleStorageChange = useEffectEvent((event: StorageEvent) => {
        if (event.key !== statePath) {
          return
        }

        const serialized = event.newValue
        const deserialized = serialized === null ? null : deserialize(serialized)
        const resolvedValue = deserialized ?? defaultValue
        
        if (!isValueDefined(resolvedValue)) {
          return
        }
        
        vocabStore.set(statePath, resolvedValue)

        onSet(resolvedValue, prevValueRef.current)
      })
      
      useEffect(() => {
        if (!bidirectional) {
          return
        }

        window.addEventListener("storage", handleStorageChange);

        return () => window.removeEventListener("storage", handleStorageChange)
      }, [bidirectional])

      const setValue = useCallback((nextValue: ValueOrTransformer<D>) => {
        const resolvedValue = isTransformer(nextValue)
          ? nextValue(prevValueRef.current)
          : nextValue
        
        vocabStore.set(statePath, resolvedValue)
        onSet(resolvedValue, prevValueRef.current)

        if (storage) {
          storage.setItem(statePath, serialize(resolvedValue))
        }
      }, [
        statePath,
        storage,
        serialize,
        onSet,
      ])
      
      const resetValue = useCallback(() => {
        const resolvedValue = defaultValue
        
        if (!isValueDefined(resolvedValue)) {
          storage?.removeItem(statePath)
          return
        }

        vocabStore.set(statePath, resolvedValue)
        onSet(resolvedValue, prevValueRef.current)

        if (storage) {
          storage.setItem(statePath, serialize(resolvedValue))
        }
      }, [
        statePath,
        defaultValue,
        storage,
        serialize,
        onSet,
      ])

      return [
        value,
        setValue,
        resetValue,
      ] as const
    },

    /** Returns the fully qualified job name (dot-separated path). */
    toString(this: { [STATE_PATH]: string }) {
      return this[STATE_PATH];
    },
  };
}