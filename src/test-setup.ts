import '@testing-library/jest-dom/vitest';

// This jsdom version doesn't attach a working localStorage to its window in
// this Node version (window.localStorage is undefined, not just shadowed by
// Node's own experimental global). Polyfill a minimal in-memory Storage so
// AppContext's localStorage.getItem/setItem calls work in tests.
if (typeof window !== 'undefined' && !window.localStorage) {
  class MemoryStorage implements Storage {
    private store = new Map<string, string>();
    get length() { return this.store.size; }
    clear() { this.store.clear(); }
    getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
    key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
    removeItem(key: string) { this.store.delete(key); }
    setItem(key: string, value: string) { this.store.set(key, String(value)); }
  }
  const memoryStorage = new MemoryStorage();
  Object.defineProperty(window, 'localStorage', { value: memoryStorage, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true });
}

// jsdom has no IntersectionObserver; framer-motion's whileInView needs one.
// Stub that reports every element as immediately visible so Reveal-wrapped
// content renders in tests exactly like it does after scrolling into view.
if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
  class ImmediateIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '';
    readonly scrollMargin = '';
    readonly thresholds: ReadonlyArray<number> = [];
    private callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }
    observe(target: Element) {
      this.callback(
        [{ isIntersecting: true, target, intersectionRatio: 1 } as IntersectionObserverEntry],
        this,
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] { return []; }
  }
  Object.defineProperty(window, 'IntersectionObserver', { value: ImmediateIntersectionObserver, configurable: true });
  Object.defineProperty(globalThis, 'IntersectionObserver', { value: ImmediateIntersectionObserver, configurable: true });
}
