import { type DependencyList, useMemo } from "react";
import { debounce, isValueDefined } from "./utils";
import VocabStore from "./store";
import type { Deserialize, Serialize } from "./state.types";

export function useDebounce<T extends (...args: never[]) => unknown>(
  effect: T,
  wait: number | undefined,
  deps: DependencyList = []
) {
  return useMemo(
    () => debounce<T>(effect, wait),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );
}

export const sync = <V>(options: {
  vocabStore: VocabStore
  statePath: string
  storage: Storage,
  serialize: Serialize<V>
  deserialize: Deserialize<V>
  value: V | undefined
}) => {
  const {
    vocabStore,
    storage,
    statePath,
    value,
    deserialize,
    serialize
  } = options

  const serialized = storage.getItem(statePath)

  if (serialized === null) {
    if (isValueDefined(value)) {
      storage.setItem(statePath, serialize(value))
    }
  } else { 
    vocabStore.set(statePath, deserialize(serialized))
  }
}