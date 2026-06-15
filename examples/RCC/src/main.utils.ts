export const toLocalDatetimeString = (date: Date | null) => {
  if (date === null) {
    return new Date().toISOString().slice(0, 16)
  }

  const offset = date.getTimezoneOffset() * 60000

  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export const toDateString = (date: Date | null) => {
  if (!date) {
    return ""
  }

  const offset = date.getTimezoneOffset() * 60000
  
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
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

export type Theme = "Dark" | "White" | "System"

export function fetchMock(value: unknown) {
  console.log("[UI]: Send request", value)
  return new Promise<string>((resolve) =>
    setTimeout(() => {
      const rnd = Math.random().toString()
      resolve(rnd)
      console.log("[UI]: Fetched: ", rnd)
    }, 1000)
  )
}

export const globalDb: Record<string, string> = {}

export const debouncedSetItem = debounce(async (key: string, value: string) => {
  const data = await fetchMock(value)
  globalDb[key] = data
}, 300)
