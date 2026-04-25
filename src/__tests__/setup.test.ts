import { describe, it, expect } from 'vitest'
import { setupStorage } from '../setup'
import { defineState } from '../state'

// ─── path injection ───────────────────────────────────────────────────────────

describe('setupStorage / injectPaths', () => {
  it('инжектирует путь в листовой узел на первом уровне', () => {
    const storage = setupStorage({ foo: defineState() })
    expect(storage.foo.toString()).toBe('foo')
  })

  it('инжектирует вложенный путь через точку', () => {
    const storage = setupStorage({
      a: { b: { c: defineState() } }
    })
    expect(storage.a.b.c.toString()).toBe('a.b.c')
  })

  it('разные листья получают разные пути', () => {
    const storage = setupStorage({
      x: defineState(),
      y: defineState(),
    })
    expect(storage.x.toString()).toBe('x')
    expect(storage.y.toString()).toBe('y')
  })

  it('глубоко вложенные листья', () => {
    const storage = setupStorage({
      preference: {
        theme: defineState<string>(),
        ui: {
          nightMode: defineState<boolean>(),
        }
      }
    })
    expect(storage.preference.theme.toString()).toBe('preference.theme')
    expect(storage.preference.ui.nightMode.toString()).toBe('preference.ui.nightMode')
  })

  // ─── кэширование ─────────────────────────────────────────────────────────

  it('возвращает один и тот же объект-лист при повторном обращении (leafCache)', () => {
    const storage = setupStorage({ item: defineState() })
    const first = storage.item
    const second = storage.item
    expect(first).toBe(second)
  })

  it('возвращает один и тот же промежуточный прокси (proxyCache)', () => {
    const storage = setupStorage({ a: { b: defineState() } })
    const first = storage.a
    const second = storage.a
    expect(first).toBe(second)
  })

  // ─── методы листа ─────────────────────────────────────────────────────────

  it('useState на листе — функция', () => {
    const storage = setupStorage({ val: defineState() })
    expect(typeof storage.val.useState).toBe('function')
  })

  it('toString возвращает правильный путь', () => {
    const storage = setupStorage({ deep: { path: defineState() } })
    expect(storage.deep.path.toString()).toBe('deep.path')
    expect(`${storage.deep.path}`).toBe('deep.path')
  })

  it('один leaf-объект переиспользуется с разными путями независимо', () => {
    const leaf = defineState<string>()
    const storage = setupStorage({ a: leaf, b: leaf })
    // Каждый путь должен получить свой STATE_PATH
    expect(storage.a.toString()).toBe('a')
    expect(storage.b.toString()).toBe('b')
  })

  // ─── примитивы и не-листья ────────────────────────────────────────────────

  it('примитивные значения возвращаются как есть', () => {
    const storage = setupStorage({ version: 1 })
    expect((storage).version).toBe(1)
  })

  it('не оборачивает обычные объекты без STATE_DEFINITION', () => {
    const config = { timeout: 500 }
    const storage = setupStorage({ config })
    // Возвращает прокси, но значения доступны
    expect((storage).config.timeout).toBe(500)
  })
})