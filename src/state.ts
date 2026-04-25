import {  useEffect, useMemo, useRef, useState } from "react";
import { STATE_DEFINITION, STATE_PATH, STATE_SSR_SUPPORT } from "./constants";
import { get, useDebounce } from "./utils";
import { useStateVocabContext } from "./context";
import { embed, genStoredValue, isTransformer, valueOrFactory } from "./state.utils";
import type { ValueOrFactory, ValueOrTransformer } from "./types";

const isServer = typeof window === "undefined" // SSR

export function defineState<T>(
  definitionOptions: {
    storage?: ValueOrFactory<Storage> // by default memory
    defaultValue?: T
    bidirectional?: true
    autoSet?: true
    serialize?: (v: T) => string
    deserialize?: (v: string) => T
  } = {}
) {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = definitionOptions
  
  const superDefaultValue = definitionOptions.defaultValue
  const superBidirectional = definitionOptions.bidirectional
  const superAutoSet = definitionOptions.autoSet
  const storage = isServer ? undefined : valueOrFactory(definitionOptions.storage)

  return {
    [STATE_DEFINITION]: true,   // marks this object as a leaf in the router tree
    [STATE_SSR_SUPPORT]: false, // placeholder; injected at runtime by injectPaths()
    [STATE_PATH]: "",           // placeholder; injected at runtime by injectPaths()

    useState<D = T>(
      this: {
        [STATE_PATH]: string;
        [STATE_SSR_SUPPORT]: boolean;
      },
      options?: {
        defaultValue?: ValueOrFactory<D>,
        delayedSet?: number
        bidirectional?: true
        autoSet?: true
        onSet?(nextValue: NoInfer<D>, prevValue: NoInfer<D>): void
      }
    ) {
      options ??= {}

      const onSet = useDebounce(
        options.onSet ?? (() => {}),
        options.delayedSet,
        []
      )
      const ctx = useStateVocabContext<D>()

      const statePath = this[STATE_PATH];
      const ssr = this[STATE_SSR_SUPPORT];

      const [mounted, setMounted] = useState(ssr ? false : true)

      useEffect(() => setMounted(true), [])

      const storedValue = useMemo(
        () => {
          if (!mounted) {
            return undefined
          }

          if (!storage) {
            return undefined
          }
          
          const serialized = storage.getItem(statePath)

          return genStoredValue({
            defaultValue: options.defaultValue,
            serialized,
            superDefaultValue,
            deserialize,
          })
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [statePath, mounted]
      );
      
      const value = useMemo(
        () => get(
          ctx.stateVocab,
          statePath,
          storedValue ?? valueOrFactory(options.defaultValue) ?? superDefaultValue 
        ) as D,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
          ctx.stateVocab,
          storedValue,
          statePath
        ]
      )
        
      useEffect(
        () => {
          if (!storage || typeof storedValue === "undefined") {
            return
          }

          ctx.setStateVocab(embed<D>(statePath, storedValue))
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [storedValue]
      );

      useEffect(() => {
        if (!options.bidirectional && !superBidirectional) {
          return
        }

        const handleStorageChange = (event: StorageEvent) => {
          if (event.key !== statePath) {
            return
          }

          const serialized = event.newValue

          const resolvedValue = genStoredValue({
            defaultValue: options.defaultValue,
            superDefaultValue,
            serialized,
            deserialize,
          })
          
          ctx.setStateVocab(embed(statePath, resolvedValue))

          onSet(resolvedValue, prevValueRef.current)

          prevValueRef.current = resolvedValue
        }

        window.addEventListener("storage", handleStorageChange);

        return () => window.removeEventListener("storage", handleStorageChange)
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [
        statePath,
        options.bidirectional,
        superBidirectional,
      ])

      const prevValueRef = useRef(value)

      const setValue = (nextValue: ValueOrTransformer<D>) => {
        const resolvedValue = isTransformer(nextValue)
          ? nextValue(prevValueRef.current)
          : nextValue
        
        ctx.setStateVocab(embed(statePath, resolvedValue))
        onSet(resolvedValue, prevValueRef.current)

        if (storage) {
          storage.setItem(statePath, serialize(resolvedValue))
        }

        prevValueRef.current = resolvedValue
      }
      
      const resetValue = () => {
        const resolvedValue = valueOrFactory(options.defaultValue)
          ?? superDefaultValue as unknown as D
        
        if (typeof resolvedValue === "undefined") {
          storage?.removeItem(statePath)
          return
        }

        ctx.setStateVocab(embed<D>(statePath, resolvedValue))
        onSet(resolvedValue, prevValueRef.current)
        prevValueRef.current = resolvedValue

        if (storage) {
          storage.setItem(statePath, serialize(resolvedValue))
        }
      }

      useEffect(() => {
        if (options.autoSet || superAutoSet) {
          setValue(value)
        }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])
      
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