import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import React from "react"
import { defineState } from "../state"
import { setupStorage } from "../setup"
import { StateVocabContextProvider } from "../context"

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(StateVocabContextProvider, null, children)
}

function renderState<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stateNode: { useState: (...args: any[]) => readonly [T, (v: T | ((p: T) => T)) => void, () => void] },
  defaultValue?: T,
  options?: Parameters<typeof stateNode.useState>[0]
) {
  return renderHook(
    () => stateNode.useState({...options, defaultValue}),
    { wrapper: makeWrapper() }
  )
}

// ─── базовое поведение ────────────────────────────────────────────────────────

describe('defineState — базовое поведение', () => {
  it('возвращает defaultValue из useState при отсутствии хранилища', () => {
    const storage = setupStorage({ val: defineState<number>() })
    const { result } = renderState(storage.val, 42)
    expect(result.current[0]).toBe(42)
  })

  it('setState обновляет значение', () => {
    const storage = setupStorage({ val: defineState<string>() })
    const { result } = renderState(storage.val, 'initial')

    act(() => result.current[1]('updated'))
    expect(result.current[0]).toBe('updated')
  })

  it('setState с функцией-апдейтером', () => {
    const storage = setupStorage({ val: defineState<number>() })
    const { result } = renderState(storage.val, 10)

    act(() => result.current[1]((prev: number) => prev + 5))
    expect(result.current[0]).toBe(15)
  })

  it('resetState возвращает к defaultValue', () => {
    const storage = setupStorage({ val: defineState<number>() })
    const { result } = renderState(storage.val, 0)

    act(() => result.current[1](99))
    expect(result.current[0]).toBe(99)

    act(() => result.current[2]())
    expect(result.current[0]).toBe(0)
  })

  it('superDefaultValue из defineState используется как fallback', () => {
    const storage = setupStorage({ val: defineState<string>({ defaultValue: 'super' }) })
    const { result } = renderState(storage.val)
    expect(result.current[0]).toBe('super')
  })

  it('defaultValue из useState перекрывает superDefaultValue', () => {
    const storage = setupStorage({ val: defineState<string>({ defaultValue: 'super' }) })
    const { result } = renderState(storage.val, 'local')
    expect(result.current[0]).toBe('local')
  })

  it('фабричный defaultValue вызывается при инициализации', () => {
    const factory = vi.fn(() => [1, 2, 3])
    const storage = setupStorage({
      val: defineState<number[]>({
        defaultValue: factory
      })
    })
    renderState(storage.val)
    expect(factory).toHaveBeenCalledTimes(2)
  })
})

// ─── localStorage ─────────────────────────────────────────────────────────────

describe('defineState — localStorage', () => {
  it('читает значение из localStorage при инициализации', () => {
    localStorage.setItem('pref.theme', JSON.stringify('Dark'))
    const storage = setupStorage({ pref: { theme: defineState<string>({ storage: localStorage }) } })
    const { result } = renderState(storage.pref.theme, 'Light')
    expect(result.current[0]).toBe('Dark')
  })

  it('записывает значение в localStorage при setState', () => {
    const storage = setupStorage({ note: defineState<string>({ storage: localStorage }) })
    const { result } = renderState(storage.note, '')

    act(() => result.current[1]('hello'))
    expect(localStorage.getItem('note')).toBe('"hello"')
  })

  it('использует кастомный serialize/deserialize', () => {
    const storage = setupStorage({
      date: defineState<Date>({
        storage: localStorage,
        serialize: (d) => d.toISOString(),
        deserialize: (s) => new Date(s),
      })
    })

    const date = new Date('2024-06-15')
    const { result } = renderState(storage.date)

    act(() => result.current[1](date))
    expect(localStorage.getItem('date')).toBe(date.toISOString())
  })

  it('использует defaultValue если ключ не найден в localStorage', () => {
    const storage = setupStorage({ count: defineState<number>({ storage: localStorage }) })
    const { result } = renderState(storage.count, 7)
    expect(result.current[0]).toBe(7)
  })

  it('resetState удаляет ключ из localStorage если нет defaultValue', () => {
    const storage = setupStorage({ tmp: defineState<string>({ storage: localStorage }) })
    const { result } = renderState(storage.tmp)

    act(() => result.current[1]('value'))
    expect(localStorage.getItem('tmp')).toBe('"value"')

    act(() => result.current[2]())
    expect(localStorage.getItem('tmp')).toBeNull()
  })

  it('resetState записывает superDefaultValue в localStorage', () => {
    const storage = setupStorage({
      theme: defineState<string>({ storage: localStorage, defaultValue: 'Dark' })
    })
    const { result } = renderState(storage.theme)

    act(() => result.current[1]('White'))
    act(() => result.current[2]())

    expect(localStorage.getItem('theme')).toBe('"Dark"')
    expect(result.current[0]).toBe('Dark')
  })
})

// ─── sessionStorage ───────────────────────────────────────────────────────────

describe('defineState — sessionStorage', () => {
  it('читает значение из sessionStorage', () => {
    sessionStorage.setItem('flag', JSON.stringify(true))
    const storage = setupStorage({ flag: defineState<boolean>({ storage: sessionStorage }) })
    const { result } = renderState(storage.flag, false)
    expect(result.current[0]).toBe(true)
  })

  it('записывает значение в sessionStorage', () => {
    const storage = setupStorage({ flag: defineState<boolean>({ storage: sessionStorage }) })
    const { result } = renderState(storage.flag, false)

    act(() => result.current[1](true))
    expect(sessionStorage.getItem('flag')).toBe('true')
  })
})

// ─── memory (без storage) ─────────────────────────────────────────────────────

describe('defineState — memory (без storage)', () => {
  it('не сохраняет в localStorage', () => {
    const storage = setupStorage({ counter: defineState<number>() })
    const { result } = renderState(storage.counter, 0)

    act(() => result.current[1](5))
    expect(localStorage.getItem('counter')).toBeNull()
  })

  it('resetState с памятью возвращает к defaultValue без обращения к storage', () => {
    const storage = setupStorage({ x: defineState<number>() })
    const { result } = renderState(storage.x, 100)

    act(() => result.current[1](999))
    act(() => result.current[2]())
    expect(result.current[0]).toBe(100)
  })
})

// ─── onSet callback ───────────────────────────────────────────────────────────

describe('defineState — onSet callback', () => {
  beforeEach(() => { vi.useFakeTimers() })

  it('вызывает onSet при setState', () => {
    const onSet = vi.fn()
    const storage = setupStorage({ val: defineState<number>() })
    const { result } = renderState(storage.val, 0, { onSet })

    act(() => result.current[1](5))
    vi.runAllTimers()
    expect(onSet).toHaveBeenCalledWith(5, 0)
  })

  it('передаёт prevValue корректно', () => {
    const onSet = vi.fn()
    const storage = setupStorage({ val: defineState<number>() })
    const { result } = renderState(storage.val, 10, { onSet })

    act(() => result.current[1](20))
    vi.runAllTimers()
    act(() => result.current[1](30))
    vi.runAllTimers()

    expect(onSet).toHaveBeenNthCalledWith(1, 20, 10)
    expect(onSet).toHaveBeenNthCalledWith(2, 30, 20)
  })

  it('debounce — откладывает вызов onSet', () => {
    const onSet = vi.fn()
    const storage = setupStorage({ val: defineState<number>() })
    const { result } = renderState(storage.val, 0, { onSet, delayedSet: 300 })

    act(() => result.current[1](1))
    act(() => result.current[1](2))
    act(() => result.current[1](3))

    expect(onSet).not.toHaveBeenCalled()
    vi.advanceTimersByTime(300)
    // Из-за debounce вызывается только для последнего значения
    expect(onSet).toHaveBeenCalledTimes(1)
  })

  it('onSet вызывается при resetState', () => {
    const onSet = vi.fn()
    const storage = setupStorage({ val: defineState<number>() })
    const { result } = renderState(storage.val, 0, { onSet })

    act(() => result.current[1](42))
    vi.runAllTimers()
    onSet.mockClear()

    act(() => result.current[2]())
    vi.runAllTimers()
    expect(onSet).toHaveBeenCalledWith(0, 42)
  })
})

// ─── bidirectional (cross-tab sync) ──────────────────────────────────────────

describe('defineState — bidirectional', () => {
  it('обновляет состояние при StorageEvent (bidirectional в defineState)', () => {
    const storage = setupStorage({
      theme: defineState<string>({ storage: localStorage, bidirectional: true })
    })
    const { result } = renderState(storage.theme, 'Light')

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'theme',
        newValue: '"Dark"',
      }))
    })

    expect(result.current[0]).toBe('Dark')
  })

  it('обновляет состояние при StorageEvent (bidirectional в useState)', () => {
    const storage = setupStorage({
      mode: defineState<string>({ storage: localStorage })
    })
    const { result } = renderState(storage.mode, 'off', { bidirectional: true })

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'mode',
        newValue: '"on"',
      }))
    })

    expect(result.current[0]).toBe('on')
  })

  it('игнорирует StorageEvent с другим ключом', () => {
    const storage = setupStorage({
      a: defineState<string>({ storage: localStorage, bidirectional: true })
    })
    const { result } = renderState(storage.a, 'original')

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'b', // другой ключ
        newValue: '"changed"',
      }))
    })

    expect(result.current[0]).toBe('original')
  })

  it('не слушает StorageEvent если bidirectional не указан', () => {
    const storage = setupStorage({
      val: defineState<string>({ storage: localStorage })
    })
    const { result } = renderState(storage.val, 'original')

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'val',
        newValue: '"changed"',
      }))
    })

    expect(result.current[0]).toBe('original')
  })
})

// ─── кастомное хранилище ──────────────────────────────────────────────────────

describe('defineState — кастомное storage', () => {
  it('читает и пишет через кастомный Storage', () => {
    const store: Record<string, string> = {}
    const customStorage: Storage = {
      length: 0,
      clear: () => {},
      key: () => null,
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v },
      removeItem: (k) => { delete store[k] },
    }

    const appStorage = setupStorage({
      db: defineState<string>({ storage: customStorage })
    })
    const { result } = renderState(appStorage.db, '')

    act(() => result.current[1]('saved'))
    expect(store['db']).toBe('"saved"')
  })
})

// ─── два компонента — shared context ─────────────────────────────────────────

describe('defineState — синхронизация через контекст', () => {
  it('два хука с одним путём разделяют состояние в одном контексте', () => {
    const storage = setupStorage({ shared: defineState<number>() })

    // Оба хука должны жить в одном React-дереве, иначе контексты разные
    const { result } = renderHook(
      () => ({
        a: storage.shared.useState({
          defaultValue: 0
        }),
        b: storage.shared.useState({
          defaultValue: 0
        }),
      }),
      { wrapper: makeWrapper() }
    )

    act(() => result.current.a[1](42))

    expect(result.current.b[0]).toBe(42)
  })
})

// ─── известные баги (документируем поведение) ─────────────────────────────────

describe('defineState — известные проблемы', () => {
  beforeEach(() => { vi.useFakeTimers() })

  /**
   * БАГ #2: onSet захватывается в closure с пустым deps=[].
   * Если колбэк изменится после монтирования — вызовется старый.
   * Тест документирует текущее (сломанное) поведение.
   */
  it('[БАГ] onSet stale closure — вызывается первоначальный колбэк', () => {
    const first = vi.fn()
    const second = vi.fn()
    const storage = setupStorage({ v: defineState<number>() })

    const { result, rerender } = renderHook(
      ({ cb }: { cb: (n: number, p: number) => void }) =>
        storage.v.useState({ defaultValue: 0, onSet: cb }),
      { wrapper: makeWrapper(), initialProps: { cb: first } }
    )

    rerender({ cb: second })

    act(() => result.current[1](1))
    vi.runAllTimers()

    // После фикса здесь должен быть second, а не first
    expect(first).toHaveBeenCalledTimes(1) // сломанное поведение
    expect(second).toHaveBeenCalledTimes(0)
  })

  /**
   * БАГ #10: дефолтный deserialize (JSON.parse) не обёрнут в try/catch.
   * Если в хранилище невалидный JSON — хук упадёт.
   */
  it('[БАГ] падает при невалидном JSON в хранилище', () => {
    localStorage.setItem('broken', 'not-json')
    const storage = setupStorage({
      broken: defineState<string>({ storage: localStorage })
    })

    expect(() => renderState(storage.broken, 'default')).toThrow()
  })
})