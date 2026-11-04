// Safe wrapper around localStorage with in-memory fallback for private browsing,
// disabled storage, quota limits, or security restrictions (e.g. cross-origin iframes).

class MemoryStorage implements Storage {
  private memory = new Map<string, string>()

  get length(): number {
    return this.memory.size
  }

  clear(): void {
    this.memory.clear()
  }

  getItem(key: string): string | null {
    return this.memory.has(key) ? this.memory.get(key)! : null
  }

  key(index: number): string | null {
    const keys = Array.from(this.memory.keys())
    return keys[index] ?? null
  }

  removeItem(key: string): void {
    this.memory.delete(key)
  }

  setItem(key: string, value: string): void {
    this.memory.set(key, String(value))
  }
}

class SafeStorage implements Storage {
  private fallback = new MemoryStorage()

  private isLocalStorageAvailable(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false
    }
    try {
      const testKey = '__storage_test__'
      window.localStorage.setItem(testKey, testKey)
      window.localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  get length(): number {
    try {
      if (this.isLocalStorageAvailable()) {
        return window.localStorage.length
      }
    } catch {
      // fallback
    }
    return this.fallback.length
  }

  clear(): void {
    try {
      if (this.isLocalStorageAvailable()) {
        window.localStorage.clear()
      }
    } catch {
      // fallback
    }
    this.fallback.clear()
  }

  getItem(key: string): string | null {
    try {
      if (this.isLocalStorageAvailable()) {
        const val = window.localStorage.getItem(key)
        if (val !== null) return val
      }
    } catch {
      // fallback to memory
    }
    return this.fallback.getItem(key)
  }

  key(index: number): string | null {
    try {
      if (this.isLocalStorageAvailable()) {
        return window.localStorage.key(index)
      }
    } catch {
      // fallback
    }
    return this.fallback.key(index)
  }

  removeItem(key: string): void {
    try {
      if (this.isLocalStorageAvailable()) {
        window.localStorage.removeItem(key)
      }
    } catch {
      // fallback
    }
    this.fallback.removeItem(key)
  }

  setItem(key: string, value: string): void {
    const stringVal = String(value)
    try {
      if (this.isLocalStorageAvailable()) {
        window.localStorage.setItem(key, stringVal)
        return
      }
    } catch {
      // fallback to in-memory
    }
    this.fallback.setItem(key, stringVal)
  }
}

export const safeStorage = new SafeStorage()
export default safeStorage
