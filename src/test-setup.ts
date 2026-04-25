// src/test-setup.ts
import '@testing-library/jest-dom'
import { beforeEach } from 'vitest'

class StorageMock implements Storage {
  private store: Record<string, string> = {}
  get length() { return Object.keys(this.store).length }
  clear() { this.store = {} }
  getItem(key: string) { return this.store[key] ?? null }
  setItem(key: string, value: string) { this.store[key] = value }
  removeItem(key: string) { delete this.store[key] }
  key(index: number) { return Object.keys(this.store)[index] ?? null }
}

Object.defineProperty(window, 'localStorage', { value: new StorageMock() })
Object.defineProperty(window, 'sessionStorage', { value: new StorageMock() })

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})