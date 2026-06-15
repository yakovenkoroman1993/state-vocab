"use client"

import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { STATE_PATH, STATE_SSR, STATE_VERBOSE, STATE_VERBOSE_PATH } from "./constants";
import type { Deserialize, Serialize, ValueOrTransformer, Vocab, VocabThis } from "./state.types";
import { get, isTransformer, isValueDefined, logStyled, valueOrFactory } from "./utils";
import { useStateVocabClientContext } from "./context.client";
import VocabStore from "./store";
import { sync, useDebounce } from "./setup.client.utils";
import type { UseInitialStateOptions, UseStateOptions } from "./setup.types";

const isServer = typeof window === "undefined"
const useIsomorphicLayoutEffect = isServer ? useEffect : useLayoutEffect

const globalVocabStore = new VocabStore() // Important! only for disabled ssr. Don't use it for RSC's

const ERROR_MESSAGE = "Make sure your component is wrapped in StateVocabProvider (RSC) or disable ssr option in setupStorage for SPA (RCC only)"

function useState<V>(
  // eslint-disable-next-line react-hooks/unsupported-syntax
  this: VocabThis,
  options?: UseStateOptions<V>
) {
  options ??= {}

  const storage = isServer ? undefined : valueOrFactory(options.storage) as Storage

  const defaultValue = valueOrFactory(options.defaultValue)
  const bidirectional = options.bidirectional

  const statePath = this[STATE_PATH];
  const verbose = this[STATE_VERBOSE];
  const verbosePath = this[STATE_VERBOSE_PATH];
  const ssr = this[STATE_SSR];

  let vocabStore = useStateVocabClientContext({ verbose })

  if (!(vocabStore instanceof VocabStore)) {
    if (ssr) {
      throw new Error(ERROR_MESSAGE)
    }
    
    vocabStore = globalVocabStore
  } 

  const serialize: Serialize<V> = options.serialize ?? JSON.stringify
  const deserialize: Deserialize<V> = options.deserialize ?? JSON.parse

  const onSet = useDebounce(
    options.onSet ?? (() => {}),
    options.delayedSet,
    []
  )

  const prevValueRef = useRef<V>(undefined as V)

  const initializedRef = useRef(false)
  if (!initializedRef.current) {
    initializedRef.current = true

    let initialValue = vocabStore.get<V>(statePath)

    if (!isValueDefined(initialValue)) {
      initialValue = defaultValue

      if (isValueDefined(initialValue)) {
        vocabStore.set(statePath, initialValue)
      }
    }

    if (!ssr && storage) {
      sync({
        vocabStore,
        storage,
        statePath,
        value: initialValue,
        serialize,
        deserialize,
      })
    }
  }

  const vocab = useSyncExternalStore<Vocab<V>>(
    vocabStore.subscribe.bind(vocabStore),
    vocabStore.getClientSnapshot.bind(vocabStore),
    vocabStore.getServerSnapshot.bind(vocabStore),
  )

  if (verbose) {
    if (verbosePath) {
      const target = get(vocab, verbosePath)
      if (target) {
        logStyled(target)
      }
    } else {
      logStyled(vocab)
    }
  }

  const value = get(vocab, statePath, defaultValue) as V
  prevValueRef.current = value

  useIsomorphicLayoutEffect(() => {
    if (!ssr || !storage) {
      return
    }

    sync({
      vocabStore,
      storage,
      statePath,
      value,
      serialize,
      deserialize,
    })
  }, [])

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

  const setValue = useCallback((nextValue: ValueOrTransformer<V>) => {
    const resolvedValue = isTransformer(nextValue)
      ? nextValue(prevValueRef.current)
      : nextValue
    
    vocabStore.set(statePath, resolvedValue)
    onSet(resolvedValue, prevValueRef.current)

    if (storage) {
      storage.setItem(statePath, serialize(resolvedValue))
    }
  }, [vocabStore, statePath, onSet, storage, serialize])
  
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
  }, [defaultValue, vocabStore, statePath, onSet, storage, serialize])

  return [
    value,
    setValue,
    resetValue,
  ] as const
}

function useInitialState<V>(
  // eslint-disable-next-line react-hooks/unsupported-syntax
  this: VocabThis,
  options?: UseInitialStateOptions<V>
) {
  options ??= {}
  
  const storage = isServer ? undefined : valueOrFactory(options.storage) as Storage

  const defaultValue = valueOrFactory(options.defaultValue)

  const statePath = this[STATE_PATH];
  const verbose = this[STATE_VERBOSE];
  const ssr = this[STATE_SSR];

  let vocabStore = useStateVocabClientContext({ verbose })

  if (!(vocabStore instanceof VocabStore)) {
    if (ssr) {
      throw new Error(ERROR_MESSAGE)
    }
    
    vocabStore = globalVocabStore
  }

  const serialize: Serialize<V> = options.serialize ?? JSON.stringify
  const deserialize: Deserialize<V> = options.deserialize ?? JSON.parse

  const initializedRef = useRef(false)
  
  let initialValue: V | undefined
  if (!initializedRef.current) {
    initializedRef.current = true

    initialValue = vocabStore.get<V>(statePath)

    if (!isValueDefined(initialValue)) {
      initialValue = defaultValue

      if (isValueDefined(initialValue)) {
        vocabStore.set(statePath, initialValue)
      }
    }

    if (!ssr && storage) {
      sync({
        vocabStore,
        storage,
        statePath,
        value: initialValue,
        serialize,
        deserialize,
      })
    }
  }

  useIsomorphicLayoutEffect(() => {
    if (!ssr || !storage) {
      return
    }

    sync({
      vocabStore,
      storage,
      statePath,
      value: initialValue,
      serialize,
      deserialize,
    })
  }, [])
}

type Placeholder<V> = {
  useState(options?: UseStateOptions<V>): ReturnType<typeof useState<V>>
  useInitialState(options?: UseInitialStateOptions<V>): void
}

type Slot<V> = {
  clientSlot(input: Placeholder<V>): Placeholder<V>
}

type Clientified<R> =
  R extends Slot<infer TValue>
    ? Placeholder<TValue>
    : R extends object
      ? { [K in keyof R]: Clientified<R[K]> }
      : R

function isSlot(value: unknown): value is Slot<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "clientSlot" in value
  )
}

export function clientify<R extends object>(tree: R): Clientified<R> {
  const result: Record<string, unknown> = {}

  for (const key in tree) {
    const value = tree[key]

    if (isSlot(value)) {
      result[key] = value.clientSlot({
        useState(this: VocabThis, ...args) {
          return useState.apply(this, args)
        },
        useInitialState(this: VocabThis, ...args) {
          useInitialState.apply(this, args)
        },
      })

      delete (result[key] as Record<string, unknown>).serverSlot
      delete (result[key] as Record<string, unknown>).clientSlot
    } else if (
      value !== null &&
      typeof value === "object"
    ) {
      result[key] = clientify(value)
    } else {
      result[key] = value
    }
  }

  return result as Clientified<R>
}

