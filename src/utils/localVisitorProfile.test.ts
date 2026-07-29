import { describe, expect, it } from 'vitest';

import {
  LOCAL_VISITOR_NAME_MAX_LENGTH,
  LOCAL_VISITOR_PROFILE_STORAGE_KEY,
  loadLocalVisitorProfile,
  loadLocalVisitorProfileResult,
  normalizeLocalVisitorName,
  saveLocalVisitorProfile,
  saveLocalVisitorProfileResult,
} from './localVisitorProfile';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => Array.from(values.keys())[index] ?? null,
    removeItem: key => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe('local visitor profile', () => {
  it('normalizes a display label without treating it as an account credential', () => {
    expect(normalizeLocalVisitorName('  Danny\u0000   Muse  ')).toBe('Danny Muse');
    expect(normalizeLocalVisitorName('x'.repeat(80))).toHaveLength(LOCAL_VISITOR_NAME_MAX_LENGTH);
  });

  it('round-trips a valid local profile', () => {
    const storage = memoryStorage();
    const saved = saveLocalVisitorProfile('  Danny  ', storage);

    expect(saved?.displayName).toBe('Danny');
    expect(loadLocalVisitorProfile(storage)).toEqual(saved);
  });

  it('removes the local profile when the label is cleared', () => {
    const storage = memoryStorage();
    saveLocalVisitorProfile('Danny', storage);
    expect(storage.getItem(LOCAL_VISITOR_PROFILE_STORAGE_KEY)).not.toBeNull();

    expect(saveLocalVisitorProfile('   ', storage)).toBeNull();
    expect(storage.getItem(LOCAL_VISITOR_PROFILE_STORAGE_KEY)).toBeNull();
  });

  it('rejects malformed or future local records', () => {
    const storage = memoryStorage();
    storage.setItem(LOCAL_VISITOR_PROFILE_STORAGE_KEY, JSON.stringify({
      schemaVersion: 99,
      displayName: 'Danny',
      updatedAt: new Date().toISOString(),
    }));

    expect(loadLocalVisitorProfile(storage)).toBeNull();
  });

  it('reports blocked storage without discarding the in-memory name at the caller boundary', () => {
    const blockedStorage = {
      getItem: () => null,
      removeItem: () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
    };

    expect(saveLocalVisitorProfileResult('Danny', blockedStorage)).toEqual({
      ok: false,
      profile: null,
    });
    expect(loadLocalVisitorProfileResult(blockedStorage)).toEqual({
      ok: false,
      profile: null,
    });
  });
});
