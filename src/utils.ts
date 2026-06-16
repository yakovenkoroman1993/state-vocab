import type { Factory, ValueOrFactory, Transformer, ValueOrTransformer } from "./state.types";

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

export const isJsonValid = (input: string) => {
  try {
    JSON.parse(input)
    return true
  } catch { 
    return false
  }
}

export function logStyled(obj: unknown) {
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

export const isTransformer = <V>(v: ValueOrTransformer<V>): v is Transformer<V> => {
  return typeof v === "function";
}

const isFactory = <V>(v: ValueOrFactory<V>): v is Factory<V> => {
  return typeof v === "function";
}

export const isValueDefined = <V>(v: V | undefined): v is V => {
  return typeof v !== "undefined"
}

export const valueOrFactory = <V>(input: ValueOrFactory<V>) => {
  return isFactory(input) ? input() : input
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(message));
        }, ms);
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}