import { describe, expect, it, vi } from 'vitest';

import { EXPEDITION_JOURNEY_STORAGE_KEY } from './expeditionJourney';
import {
  CURRENT_MUSEUM_ROOM_IDS,
  EXPERIENCE_DEPTH_STORAGE_KEY,
  EXPERIENCE_DEPTHS,
  MUSEUM_HUB_ENTRY_ROOMS,
  MUSEUM_HUB_IDS,
  MUSEUM_HUB_ROOMS,
  hubForRoom,
  isExperienceDepth,
  resolveStoredExperienceDepth,
} from './museumNavigation';

function createStorage(entries: Record<string, string> = {}) {
  const values = new Map(Object.entries(entries));

  return {
    values,
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

describe('museum navigation hubs', () => {
  it('assigns every current room to exactly one of the five hubs', () => {
    const assignedRooms = MUSEUM_HUB_IDS.flatMap(hubId => MUSEUM_HUB_ROOMS[hubId]);

    expect(MUSEUM_HUB_IDS).toEqual(['home', 'pulse', 'atlas', 'stories', 'lab']);
    expect(assignedRooms).toHaveLength(24);
    expect(new Set(assignedRooms)).toHaveLength(24);
    expect(new Set(assignedRooms)).toEqual(new Set(CURRENT_MUSEUM_ROOM_IDS));
  });

  it('uses a valid first room for every hub', () => {
    for (const hubId of MUSEUM_HUB_IDS) {
      expect(MUSEUM_HUB_ROOMS[hubId][0]).toBe(MUSEUM_HUB_ENTRY_ROOMS[hubId]);
      expect(hubForRoom(MUSEUM_HUB_ENTRY_ROOMS[hubId])).toBe(hubId);
    }
  });

  it('resolves every known room and rejects unknown routes', () => {
    for (const roomId of CURRENT_MUSEUM_ROOM_IDS) {
      expect(hubForRoom(roomId)).not.toBeNull();
    }

    expect(hubForRoom('hero')).toBeNull();
    expect(hubForRoom('future-room')).toBeNull();
  });
});

describe('experience depth persistence', () => {
  it.each(EXPERIENCE_DEPTHS)('recognizes %s as an experience depth', depth => {
    expect(isExperienceDepth(depth)).toBe(true);
  });

  it.each([null, '', 'quick', 'full', 'lab', 'expert', 3])(
    'rejects the unsupported value %s',
    value => {
      expect(isExperienceDepth(value)).toBe(false);
    },
  );

  it('prefers a valid new preference without touching legacy storage', () => {
    const storage = createStorage({
      [EXPERIENCE_DEPTH_STORAGE_KEY]: 'deep-dive',
      [EXPEDITION_JOURNEY_STORAGE_KEY]: 'quick',
    });

    expect(resolveStoredExperienceDepth(storage)).toBe('deep-dive');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.values.get(EXPEDITION_JOURNEY_STORAGE_KEY)).toBe('quick');
  });

  it.each([
    ['quick', 'guided'],
    ['full', 'explore'],
    ['lab', 'deep-dive'],
  ] as const)('migrates legacy %s to %s without deleting the old key', (legacy, expected) => {
    const storage = createStorage({
      [EXPEDITION_JOURNEY_STORAGE_KEY]: legacy,
    });

    expect(resolveStoredExperienceDepth(storage)).toBe(expected);
    expect(storage.setItem).toHaveBeenCalledWith(EXPERIENCE_DEPTH_STORAGE_KEY, expected);
    expect(storage.values.get(EXPERIENCE_DEPTH_STORAGE_KEY)).toBe(expected);
    expect(storage.values.get(EXPEDITION_JOURNEY_STORAGE_KEY)).toBe(legacy);
  });

  it('uses the legacy preference when the new stored value is invalid', () => {
    const storage = createStorage({
      [EXPERIENCE_DEPTH_STORAGE_KEY]: 'unsupported',
      [EXPEDITION_JOURNEY_STORAGE_KEY]: 'full',
    });

    expect(resolveStoredExperienceDepth(storage)).toBe('explore');
    expect(storage.values.get(EXPERIENCE_DEPTH_STORAGE_KEY)).toBe('explore');
  });

  it('defaults to explore when storage is absent, invalid or unreadable', () => {
    const invalidStorage = createStorage({
      [EXPERIENCE_DEPTH_STORAGE_KEY]: 'unsupported',
      [EXPEDITION_JOURNEY_STORAGE_KEY]: 'unknown',
    });
    const throwingStorage = {
      getItem: vi.fn(() => {
        throw new DOMException('Unavailable');
      }),
      setItem: vi.fn(),
    };

    expect(resolveStoredExperienceDepth(null)).toBe('explore');
    expect(resolveStoredExperienceDepth(invalidStorage)).toBe('explore');
    expect(resolveStoredExperienceDepth(throwingStorage)).toBe('explore');
  });

  it('still returns a migrated preference when storage is read-only', () => {
    const storage = {
      getItem: vi.fn((key: string) => (
        key === EXPEDITION_JOURNEY_STORAGE_KEY ? 'lab' : null
      )),
      setItem: vi.fn(() => {
        throw new DOMException('Read only');
      }),
    };

    expect(resolveStoredExperienceDepth(storage)).toBe('deep-dive');
  });
});
