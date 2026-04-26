import {  useEffect, useMemo, useRef, useState } from "react";
import { STATE_DEFINITION, STATE_PATH, STATE_SSR } from "./constants";
import { get, useDebounce } from "./utils";
import { useStateVocabContext } from "./context";
import { embed, genStoredValue, isTransformer, isValueDefined, valueOrFactory } from "./state.utils";
import type { Deserialize, Serialize, ValueOrFactory, ValueOrTransformer } from "./state.types";

const isServer = typeof window === "undefined" // SSR

export function defineState<T>(
  definitionOptions: {
    storage?: ValueOrFactory<Storage> // by default memory
    defaultValue?: T
    bidirectional?: true
    serialize?: Serialize<T>
    deserialize?: Deserialize<T>
  } = {}
) {
  const storage = isServer ? undefined : valueOrFactory(definitionOptions.storage)
  const superBidirectional = definitionOptions.bidirectional
  
  return {
    [STATE_DEFINITION]: true,   // marks this object as a leaf in the router tree
    [STATE_SSR]: false, // placeholder; injected at runtime by injectPaths()
    [STATE_PATH]: "",           // placeholder; injected at runtime by injectPaths()

    useState<D = T>(
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
      const serialize: Serialize<D> = definitionOptions.serialize ?? JSON.stringify
      const deserialize: Deserialize<D> = definitionOptions.deserialize ?? JSON.parse

      const superDefaultValue = definitionOptions.defaultValue as unknown as D | undefined // Conscious unsafe cast
      
      options ??= {}

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

          return genStoredValue({ deserialize, serialized })
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [mounted]
      );
      
      const value = useMemo(
        () => get(
          ctx.stateVocab,
          statePath,
          // 3rd argument in order to avoid waiting for useEffect execution
          storedValue ?? valueOrFactory(options.defaultValue) ?? superDefaultValue 
        ) as D,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
          ctx.stateVocab,
          storedValue,
        ]
      )
        
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
        [value]
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

          const resolvedValue = genStoredValue({ serialized, deserialize })
            ?? valueOrFactory(options.defaultValue)
            ?? superDefaultValue
          
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
        const resolvedValue = valueOrFactory(options.defaultValue) ?? superDefaultValue
        
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