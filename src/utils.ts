import { useMemo, type DependencyList } from "react";

export function get<
  T,
  Default = undefined
>(
  obj: T,
  path: string,
  defaultValue?: Default
): unknown | Default {
  if (!path) {
    return obj;
  }

  const keys = path.split('.');
  let result: unknown = obj;

  for (const key of keys) {
    if (
      result !== null &&
      typeof result === 'object' &&
      key in result
    ) {
      result = result[key as keyof typeof result];
    } else {
      return defaultValue;
    }
  }

  return result === undefined ? defaultValue : result;
}

export function set(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.')
  
  let current = obj
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    const nextKey = keys[i + 1]
    
    if (current[key] === undefined || current[key] === null) {
      current[key] = /^\d+$/.test(nextKey) ? [] : {}
    }
    
    current = current[key] as Record<string, unknown>
  }
  
  current[keys[keys.length - 1]] = value
  
  return obj
}

export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number = 0
): (...args: Parameters<T>) => void {
  let timerId: ReturnType<typeof setTimeout> | undefined;
 
  return function (this: unknown, ...args: Parameters<T>): void {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      timerId = undefined;
      func.apply(this, args);
    }, wait);
  };
}

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

export const isJsonValid = (input: string) => {
  try {
    JSON.parse(input)
    return true
  } catch { 
    return false
  }
}

export function logStyled(obj: object) {
  const lines = JSON.stringify(obj, null, 2).split('\n')
  const parts: string[] = []
  const styles: string[] = []

  for (const line of lines) {
    const match = line.match(/^(\s*)"([^"]+)"(\s*:\s*)(.+)$/)
    if (match) {
      const [, indent, key, colon, value] = match
      parts.push(`${indent}%c"${key}"%c${colon}%c${value}`)
      styles.push(
        'color: #9cdcfe; font-weight: bold',
        'color: #cccccc',
        'color: #ce9178',
      )
    } else {
      parts.push(`%c${line}`)
      styles.push('color: #cccccc')
    }
  }

  console.log(parts.join('\n'), ...styles, obj)
}