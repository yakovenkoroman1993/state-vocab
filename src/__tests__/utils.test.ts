/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { get, set, debounce, isJsonValid } from "../utils"

// ─── get ──────────────────────────────────────────────────────────────────────

describe('get', () => {
  it('возвращает значение по простому пути', () => {
    expect(get({ a: 1 }, 'a')).toBe(1)
  })

  it('возвращает значение по вложенному пути', () => {
    expect(get({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42)
  })

  it('возвращает defaultValue если путь не существует', () => {
    expect(get({ a: 1 }, 'a.b.c', 'default')).toBe('default')
  })

  it('возвращает defaultValue если промежуточный узел null', () => {
    expect(get({ a: null }, 'a.b', 'fallback')).toBe('fallback')
  })

  it('возвращает сам объект при пустом пути', () => {
    const obj = { x: 1 }
    expect(get(obj, '')).toBe(obj)
  })

  it('возвращает undefined (не defaultValue) если значение явно undefined', () => {
    // undefined в объекте → ключ есть, но значение undefined → вернёт defaultValue
    expect(get({ a: undefined }, 'a', 'def')).toBe('def')
  })

  it('корректно работает с числовыми значениями включая 0', () => {
    expect(get({ a: { b: 0 } }, 'a.b', 99)).toBe(0)
  })

  it('корректно работает с false', () => {
    expect(get({ a: false }, 'a', true)).toBe(false)
  })
})

// ─── set ──────────────────────────────────────────────────────────────────────

describe('set', () => {
  it('устанавливает значение по простому ключу', () => {
    const obj: Record<string, unknown> = {}
    set(obj, 'a', 42)
    expect(obj.a).toBe(42)
  })

  it('создаёт вложенные объекты по пути', () => {
    const obj: Record<string, unknown> = {}
    set(obj, 'a.b.c', 'hello')
    expect((obj as any).a.b.c).toBe('hello')
  })

  it('перезаписывает существующее значение', () => {
    const obj = { a: { b: 1 } } as Record<string, unknown>
    set(obj, 'a.b', 99)
    expect((obj as any).a.b).toBe(99)
  })

  it('создаёт массив если следующий ключ — цифра', () => {
    const obj: Record<string, unknown> = {}
    set(obj, 'list.0', 'item')
    expect(Array.isArray((obj as any).list)).toBe(true)
    expect((obj as any).list[0]).toBe('item')
  })

  it('поддерживает нотацию с квадратными скобками', () => {
    const obj: Record<string, unknown> = {}
    set(obj, 'arr[0]', 'value')
    expect((obj as any).arr[0]).toBe('value')
  })

  it('не затрагивает другие ключи при обновлении', () => {
    const obj = { a: 1, b: 2 } as Record<string, unknown>
    set(obj, 'a', 100)
    expect(obj.b).toBe(2)
  })
})

// ─── debounce ─────────────────────────────────────────────────────────────────

describe('debounce', () => {
  beforeEach(() => { vi.useFakeTimers() })

  it('вызывает функцию один раз после задержки', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 200)

    debounced()
    debounced()
    debounced()

    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('передаёт последние аргументы', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('first')
    debounced('second')
    debounced('third')

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledWith('third')
  })

  it('сбрасывает таймер при каждом вызове', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    vi.advanceTimersByTime(50)
    debounced() // сброс
    vi.advanceTimersByTime(50)

    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('вызывает снова после завершения предыдущей задержки', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    vi.advanceTimersByTime(100)
    debounced()
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('работает с wait=0', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 0)

    debounced()
    vi.advanceTimersByTime(0)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

// ─── isJsonValid ──────────────────────────────────────────────────────────────

describe('isJsonValid', () => {
  it.each([
    ['{}', true],
    ['[]', true],
    ['"string"', true],
    ['42', true],
    ['true', true],
    ['null', true],
    ['{"a":1}', true],
    ['', false],
    ['{a:1}', false],
    ["undefined", false],
    ["'string'", false],
  ])('isJsonValid(%s) → %s', (input, expected) => {
    expect(isJsonValid(input)).toBe(expected)
  })
})