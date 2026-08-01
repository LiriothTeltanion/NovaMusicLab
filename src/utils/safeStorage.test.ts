import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  resetSafeStorageFallback,
  safeStorageRead,
  safeStorageRemove,
  safeStorageWrite,
} from './safeStorage';

const originalStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');

function restoreBrowserStorage(): void {
  if (originalStorageDescriptor) {
    Object.defineProperty(window, 'localStorage', originalStorageDescriptor);
  } else {
    Reflect.deleteProperty(window, 'localStorage');
  }
}

function blockedStorage(): Storage {
  const denied = () => {
    throw new DOMException('Storage access denied.', 'SecurityError');
  };
  return {
    get length(): number { return denied(); },
    clear: denied,
    getItem: denied,
    key: denied,
    removeItem: denied,
    setItem: denied,
  };
}

describe('safeStorage', () => {
  beforeEach(() => {
    restoreBrowserStorage();
    window.localStorage.clear();
    resetSafeStorageFallback();
  });

  afterEach(() => {
    restoreBrowserStorage();
    window.localStorage.clear();
    resetSafeStorageFallback();
  });

  it('keeps read, write and remove usable when every storage operation throws', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: blockedStorage(),
    });

    expect(safeStorageRead('preference')).toBeNull();
    expect(() => safeStorageWrite('preference', 'daylight')).not.toThrow();
    expect(safeStorageRead('preference')).toBe('daylight');
    expect(() => safeStorageRemove('preference')).not.toThrow();
    expect(safeStorageRead('preference')).toBeNull();
  });

  it('survives a throwing localStorage getter and flushes memory after recovery', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Storage getter denied.', 'SecurityError');
      },
    });

    safeStorageWrite('language', 'es');
    expect(safeStorageRead('language')).toBe('es');

    restoreBrowserStorage();
    expect(safeStorageRead('language')).toBe('es');
    expect(window.localStorage.getItem('language')).toBe('es');
  });
});
