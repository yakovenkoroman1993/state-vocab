import {  useEffect, useMemo, useRef } from "react";
import { STATE_DEFINITION, STATE_PATH } from "./constants";
import { get, set, useDebounce } from "./utils";
import { useStateVocabContext, type Vocab } from "./context";

export function defineState<T>(
  definitionOptions: {
    storage?: Storage // by default memory
    defaultValue?: T
    serialize?: (v: T) => string
    deserialize?: (v: string) => T
  } = {}
) {
  const {
    storage,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    defaultValue: superDefaultValue,
  } = definitionOptions
  
  return {
    [STATE_DEFINITION]: true, // marks this object as a leaf in the router tree
    [STATE_PATH]: "", // placeholder; injected at runtime by injectPaths()

    useState<D = T>(
      this: {
        [STATE_PATH]: string;
      },
      defaultValue?: D | (() => D),
      options?: {
        delayedSet?: number
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

      const getDefaultValue = () => {
        if (typeof defaultValue === "function") {
          const fn = defaultValue as () => D
          return fn()
        }
        return defaultValue ?? (superDefaultValue as D)
      }
      
      const storedValue = useMemo(
        () => {
          if (!storage) {
            return
          }
          
          const serialized = storage.getItem(statePath)

          let value: D

          if (serialized === null) {
            const nextValue = getDefaultValue()
            
            if (typeof nextValue === "undefined") {
              return
            }

            value = nextValue
          } else {
            value = deserialize(serialized)
          } 

          return value
          // ctx.setStateVocab(embed(value))
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [statePath]
      );
      
      const value = useMemo(
        () => get(
          ctx.stateVocab,
          statePath,
          storedValue ?? getDefaultValue()
        ) as D,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
          ctx.stateVocab,
          storedValue,
          statePath
        ]
      )

      // "a.b.c.d" + D => { a: {b: c: { d: T }}}
      const embed = (value: D) => (vocab: Vocab<D>) => {
        const nextVocab = { ...vocab }
        set(nextVocab, statePath, value)
        return nextVocab
      }
        
      useEffect(
        () => {
          if (!storage || !storedValue) {
            return
          }

          ctx.setStateVocab(embed(storedValue))
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [storedValue]
      );

      const prevValueRef = useRef(value)

      return [
        value,
        function setState(nextValue: D | ((prev: D) => D)) {
          const resolvedValue = typeof nextValue === "function"
            ? (nextValue as (prev: D) => D)(prevValueRef.current)
            : nextValue
          
          ctx.setStateVocab(embed(resolvedValue))
          onSet(resolvedValue, prevValueRef.current)

          if (storage) {
            storage.setItem(statePath, serialize(resolvedValue))
          }

          prevValueRef.current = resolvedValue
        },
        function resetState() {
          const resolvedValue = getDefaultValue()
          
          if (typeof resolvedValue === "undefined") {
            storage?.removeItem(statePath)
            return
          }

          ctx.setStateVocab(embed(resolvedValue))
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