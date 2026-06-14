import { describe, it, expect } from 'vitest'
import { serverify } from '../setup.server'
import { setupStorage } from '../setup'
import { defineState } from '../state'

const storage = setupStorage({
  user: {
    name: defineState<string>(),
    role: defineState<string>(),
  },
  person: {
    address: {
      city: defineState<string>(),
    },
  },
})

const serverStorage = serverify(storage)

// ─── namespace callables ──────────────────────────────────────────────────────

describe('serverify — namespace callables', () => {
  it('flat namespace call wraps input under its key', () => {
    expect(serverStorage.user({ name: 'Alice', role: 'Admin' })).toEqual({
      user: { name: 'Alice', role: 'Admin' },
    })
  })

  it('nested namespace call wraps input under the full ancestor path', () => {
    expect(serverStorage.person.address({ city: 'NY' })).toEqual({
      person: { address: { city: 'NY' } },
    })
  })

  it('intermediate namespace call wraps input one level up', () => {
    expect(serverStorage.person({ address: { city: 'NY' } })).toEqual({
      person: { address: { city: 'NY' } },
    })
  })

  it('root call returns input unchanged (identity)', () => {
    const value = { user: { name: 'Bob', role: 'User' } }
    expect(serverStorage(value)).toEqual(value)
  })

  it('root call accepts partial input', () => {
    expect(serverStorage({ user: { name: 'Alice' } })).toEqual({
      user: { name: 'Alice' },
    })
  })

  it('namespace callable preserves leaf property access', () => {
    expect(typeof serverStorage.user.name.getState).toBe('function')
    expect(typeof serverStorage.user.role.getState).toBe('function')
  })

  it('deep namespace callable preserves leaf property access', () => {
    expect(typeof serverStorage.person.address.city.getState).toBe('function')
  })

  it('getState throws when called outside a provider', () => {
    expect(() => serverStorage.user.name.getState()).toThrow()
  })
})

// ─── field named "name" does not conflict with Function.name ─────────────────

describe('serverify — reserved property name "name"', () => {
  it('namespace with a field named "name" still callable', () => {
    const s = serverify(setupStorage({ ns: { name: defineState<string>() } }))
    expect(s.ns({ name: 'Test' })).toEqual({ ns: { name: 'Test' } })
  })

  it('leaf named "name" is accessible as a property', () => {
    const s = serverify(setupStorage({ ns: { name: defineState<string>() } }))
    expect(typeof s.ns.name.getState).toBe('function')
  })
})

