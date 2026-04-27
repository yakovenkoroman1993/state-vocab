import {  useEffect, useMemo, useRef, useState } from "react";
import { STATE_DEFINITION, STATE_PATH, STATE_SSR } from "./constants";
import { get, useDebounce } from "./utils";
import { useStateVocabContext } from "./context";
import { embed, isTransformer, isValueDefined, valueOrFactory } from "./state.utils";
import type { Deserialize, Serialize, ValueOrFactory, ValueOrTransformer } from "./state.types";

const isServer = typeof window === "undefined" // SSR

export function defineState<D>(
  definitionOptions: {
    storage?: ValueOrFactory<Storage> // by default memory
    defaultValue?: ValueOrFactory<D>
    bidirectional?: true
    serialize?: Serialize<D>
    deserialize?: Deserialize<D>
  } = {}
) {
  return {
    [STATE_DEFINITION]: true,   // marks this object as a leaf in the router tree
    [STATE_SSR]: false, // placeholder; injected at runtime by injectPaths()
    [STATE_PATH]: "",           // placeholder; injected at runtime by injectPaths()

    useState(
      this: {
        [STATE_PATH]: string;
        [STATE_SSR]: boolean;
      },
      options?: {
        defaultValue?: ValueOrFactory<D>,
        delayedSet?: number
        bidirectional?: true
        onSet?(nextValue: NoInfer<D>, prevValue: NoInfer<D>): void
      }
    ) {
      const storage = isServer ? undefined : valueOrFactory(definitionOptions.storage)

      const serialize: Serialize<D> = definitionOptions.serialize ?? JSON.stringify
      const deserialize: Deserialize<D> = definitionOptions.deserialize ?? JSON.parse

      const superDefaultValue = valueOrFactory(definitionOptions.defaultValue)
      const superBidirectional = definitionOptions.bidirectional
      
      options ??= {}

      const defaultValue = valueOrFactory(options.defaultValue)

      const onSet = useDebounce(
        options.onSet ?? (() => {}),
        options.delayedSet,
        []
      )
      const ctx = useStateVocabContext<D>()

      const statePath = this[STATE_PATH];
      const ssr = this[STATE_SSR];

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

          return serialized === null ? null : deserialize(serialized)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [mounted]
      );
      
      const value = useMemo(
        () => get(
          ctx.stateVocab,
          statePath,
          // 3rd argument in order to avoid waiting for useEffect execution
          storedValue ?? defaultValue ?? superDefaultValue 
        ) as D,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
          ctx.stateVocab,
          storedValue,
        ]
      )
      
      const prevValueRef = useRef(value)  

      useEffect(
        () => {
          if (!isValueDefined(value)) {
            return
          }

          ctx.setStateVocab(embed(statePath, value))

          if (storage && storedValue === null) {
            storage.setItem(statePath, serialize(value))
          }
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
          const deserialized = serialized === null ? null : deserialize(serialized)
          const resolvedValue = deserialized ?? defaultValue ?? superDefaultValue
          
          if (!isValueDefined(resolvedValue)) {
            return
          }
          
          ctx.setStateVocab(embed(statePath, resolvedValue))

          onSet(resolvedValue, prevValueRef.current)

          prevValueRef.current = resolvedValue
        }

        window.addEventListener("storage", handleStorageChange);

        return () => window.removeEventListener("storage", handleStorageChange)
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [
        options.bidirectional,
        superBidirectional,
      ])

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
        const resolvedValue = defaultValue ?? superDefaultValue
        
        if (!isValueDefined(resolvedValue)) {
          storage?.removeItem(statePath)
          return
        }

        ctx.setStateVocab(embed(statePath, resolvedValue))
        onSet(resolvedValue, prevValueRef.current)
        prevValueRef.current = resolvedValue

        if (storage) {
          storage.setItem(statePath, serialize(resolvedValue))
        }
      }
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