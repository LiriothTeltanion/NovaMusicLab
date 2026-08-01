/**
 * Small browser-preference adapter. Storage access can throw in restricted
 * profiles, sandboxed embeds and some private-browsing configurations, so UI
 * preferences keep a volatile fallback instead of taking down the app shell.
 */

const volatileValues = new Map<string, string | null>();

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function pendingValue(key: string): string | null | undefined {
  return volatileValues.has(key) ? volatileValues.get(key) : undefined;
}

export function safeStorageRead(key: string): string | null {
  const pending = pendingValue(key);
  const storage = browserStorage();
  if (pending !== undefined) {
    if (!storage) return pending;
    try {
      if (pending === null) storage.removeItem(key);
      else storage.setItem(key, pending);
      volatileValues.delete(key);
    } catch {
      return pending;
    }
    return pending;
  }

  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function safeStorageWrite(key: string, value: string): void {
  const storage = browserStorage();
  if (!storage) {
    volatileValues.set(key, value);
    return;
  }
  try {
    storage.setItem(key, value);
    volatileValues.delete(key);
  } catch {
    volatileValues.set(key, value);
  }
}

export function safeStorageRemove(key: string): void {
  const storage = browserStorage();
  if (!storage) {
    volatileValues.set(key, null);
    return;
  }
  try {
    storage.removeItem(key);
    volatileValues.delete(key);
  } catch {
    volatileValues.set(key, null);
  }
}

/** Clears only the volatile fallback; intended for isolated tests. */
export function resetSafeStorageFallback(): void {
  volatileValues.clear();
}
