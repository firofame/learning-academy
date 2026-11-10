export class MockLocalStorage implements Storage {
  private store = new Map<string, string>();
  shouldThrowOnGet = false;
  shouldThrowOnSet = false;

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    if (this.shouldThrowOnGet) throw new Error('Simulated storage read failure');
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.shouldThrowOnSet) throw new Error('QuotaExceededError');
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export function installMockLocalStorage(): MockLocalStorage {
  const storage = new MockLocalStorage();
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: storage },
    configurable: true
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true
  });
  return storage;
}
