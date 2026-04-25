/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest'
import { embed, genStoredValue, valueOrFactory } from '../state.utils'

// ─── embed ────────────────────────────────────────────────────────────────────

describe('embed', () => {
  it('встраивает значение по простому пути', () => {
    const updater = embed('key', 42)
    const result = updater({})
    expect((result as any).key).toBe(42)
  })

  it('встраивает значение по вложенному пути', () => {
    const updater = embed('a.b.c', 'hello')
    const result = updater({})
    expect((result as any).a.b.c).toBe('hello')
  })

  it('не мутирует оригинальный vocab', () => {
    const vocab = { existing: 'value' }
    const updater = embed('newKey', "123")
    updater(vocab)
    expect((vocab as any).newKey).toBeUndefined()
  })

  it('сохраняет существующие ключи в vocab', () => {
    const updater = embed('b', 2)
    const result = updater({ a: 1 })
    expect((result as any).a).toBe(1)
    expect((result as any).b).toBe(2)
  })

  it('перезаписывает существующее значение', () => {
    const updater = embed('key', 'new')
    const result = updater({ key: 'old' } as any)
    expect((result as any).key).toBe('new')
  })

  it('корректно работает с null и undefined значениями', () => {
    expect((embed('k', null)({})) as any).toMatchObject({ k: null })
    expect((embed('k', undefined)({})) as any).toMatchObject({ k: undefined })
  })

  it('возвращает функцию совместимую с React setState', () => {
    // embed должен возвращать (prevState) => nextState
    const updater = embed('x', 10)
    expect(typeof updater).toBe('function')
    expect(updater.length).toBe(1)
  })
})

// ─── genDefaultValue ──────────────────────────────────────────────────────────

describe('genDefaultValue', () => {
  it('возвращает defaultValue если он передан', () => {
    expect(valueOrFactory('local') ?? 'super').toBe('local')
  })

  it('вызывает фабричную функцию', () => {
    const factory = () => 'from-factory'
    expect(valueOrFactory(factory) ?? 'super').toBe('from-factory')
  })

  it('fallback на superDefaultValue если defaultValue не передан', () => {
    expect(valueOrFactory(undefined) ?? 'super').toBe('super')
  })

  it('возвращает undefined если оба значения undefined', () => {
    expect(valueOrFactory(undefined) ?? undefined).toBeUndefined()
  })

  it('корректно работает с falsy значениями: 0', () => {
    // 0 ?? superDefault → 0 (не должен fallback-нуть на super)
    // НО: 0 ?? 'super' → 0 ✓
    expect(valueOrFactory(0) ?? 'super').toBe(0)
  })

  it('корректно работает с falsy значениями: false', () => {
    expect(valueOrFactory(false) ?? 'super').toBe(false)
  })

  it('корректно работает с пустой строкой', () => {
    expect(valueOrFactory('') ?? 'super').toBe('')
  })

  it('фабрика вызывается каждый раз (не кэшируется)', () => {
    let count = 0
    const factory = () => ++count
    valueOrFactory(factory)
    valueOrFactory(factory)
    expect(count).toBe(2)
  })
})

// ─── genStoredValue ───────────────────────────────────────────────────────────

describe('genStoredValue', () => {
  const deserialize = JSON.parse

  it('десериализует значение из хранилища', () => {
    const result = genStoredValue({
      serialized: '"hello"',
      defaultValue: undefined,
      superDefaultValue: undefined,
      deserialize,
    })
    expect(result).toBe('hello')
  })

  it('десериализует объект', () => {
    const result = genStoredValue({
      serialized: '{"a":1}',
      defaultValue: undefined,
      superDefaultValue: undefined,
      deserialize,
    })
    expect(result).toEqual({ a: 1 })
  })

  it('возвращает defaultValue если serialized=null', () => {
    const result = genStoredValue({
      serialized: null,
      defaultValue: 'default',
      superDefaultValue: undefined,
      deserialize,
    })
    expect(result).toBe('default')
  })

  it('возвращает superDefaultValue если serialized=null и defaultValue=undefined', () => {
    const result = genStoredValue({
      serialized: null,
      defaultValue: undefined,
      superDefaultValue: 'super',
      deserialize,
    })
    expect(result).toBe('super')
  })

  it('возвращает undefined если serialized=null и оба default=undefined', () => {
    const result = genStoredValue({
      serialized: null,
      defaultValue: undefined,
      superDefaultValue: undefined,
      deserialize,
    })
    expect(result).toBeUndefined()
  })

  it('вызывает фабричный defaultValue если serialized=null', () => {
    const result = genStoredValue({
      serialized: null,
      defaultValue: () => [1, 2, 3],
      superDefaultValue: undefined,
      deserialize,
    })
    expect(result).toEqual([1, 2, 3])
  })

  it('использует кастомный deserialize', () => {
    const customDeserialize = (raw: string) => new Date(JSON.parse(raw))
    const date = new Date('2024-01-01')
    const result = genStoredValue({
      serialized: JSON.stringify(date.toISOString()),
      defaultValue: undefined,
      superDefaultValue: undefined,
      deserialize: customDeserialize,
    })
    expect(result).toBeInstanceOf(Date)
  })
})