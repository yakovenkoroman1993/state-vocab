import {  useEffect, useMemo, useRef } from "react";
import { STATE_DEFINITION, STATE_PATH } from "./constants";
import { get, useDebounce } from "./utils";
import { useStateVocabContext } from "./context";
import { embed, genDefaultValue, genStoredValue, isTransformer, valueOrFactory } from "./state.utils";
import type { ValueOrFactory, ValueOrTransformer } from "./types";

export function defineState<T>(
  definitionOptions: {
    storage?: ValueOrFactory<Storage> // by default memory
    defaultValue?: T
    bidirectional?: true
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

  return {
    [STATE_DEFINITION]: true, // marks this object as a leaf in the router tree
    [STATE_PATH]: "", // placeholder; injected at runtime by injectPaths()

    useState<D = T>(
      this: {
        [STATE_PATH]: string;
      },
      defaultValue?: ValueOrFactory<D>,
      options?: {
        delayedSet?: number
        bidirectional?: true
        onSet?(nextValue: NoInfer<D>, prevValue: NoInfer<D>): void
      }
    ) {
      options ??= {}

      const onSet = useDebounce(
        options.onSet ?? (() => {}),
        options.delayedSet,
        []
      )

      const storage = useMemo(() => valueOrFactory(definitionOptions.storage), [])
      
      const ctx = useStateVocabContext<D>()

      const statePath = this[STATE_PATH];

      const storedValue = useMemo(
        () => {
          if (!storage) {
            return
          }
          
          const serialized = storage.getItem(statePath)

          return genStoredValue({
            serialized,
            defaultValue,
            superDefaultValue,
            deserialize,
          })
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [statePath]
      );
      
      const value = useMemo(
        () => get(
          ctx.stateVocab,
          statePath,
          storedValue ?? genDefaultValue(defaultValue, superDefaultValue)
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
            serialized,
            defaultValue,
            superDefaultValue,
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

      return [
        value,
        function setState(nextValue: ValueOrTransformer<D>) {
          const resolvedValue = isTransformer(nextValue)
            ? nextValue(prevValueRef.current)
            : nextValue
          
          ctx.setStateVocab(embed(statePath, resolvedValue))
          onSet(resolvedValue, prevValueRef.current)

          if (storage) {
            storage.setItem(statePath, serialize(resolvedValue))
          }

          prevValueRef.current = resolvedValue
        },
        function resetState() {
          const resolvedValue = genDefaultValue(defaultValue, superDefaultValue)
          
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
        },
      ] as const
    },
    
    /** Returns the fully qualified job name (dot-separated path). */
    toString(this: { [STATE_PATH]: string }) {
      return this[STATE_PATH];
    },
  };
}