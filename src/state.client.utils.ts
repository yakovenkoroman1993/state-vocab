import { type DependencyList, useMemo } from "react";
import { debounce } from "./utils";

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