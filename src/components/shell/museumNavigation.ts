import { EXPEDITION_JOURNEY_STORAGE_KEY } from './expeditionJourney';

export const MUSEUM_HUB_IDS = ['home', 'pulse', 'atlas', 'stories', 'lab'] as const;

export type MuseumHubId = (typeof MUSEUM_HUB_IDS)[number];

export const EXPERIENCE_DEPTHS = ['guided', 'explore', 'deep-dive'] as const;

export type ExperienceDepth = (typeof EXPERIENCE_DEPTHS)[number];

export const EXPERIENCE_DEPTH_STORAGE_KEY = 'nml_experience_depth';

export const CURRENT_MUSEUM_ROOM_IDS = [
  'dashboard',
  'share',
  'pulse',
  'obsessions',
  'achievements',
  'wrapped',
  'top',
  'artist',
  'cultural',
  'eras',
  'timecapsule',
  'personality',
  'emotions',
  'inner',
  'insights',
  'report',
  'aiassistant',
  'compare',
  'museums',
  'platforms',
  'quality',
  'statsdeep',
  'upload',
  'audio',
] as const;

export type MuseumRoomId = (typeof CURRENT_MUSEUM_ROOM_IDS)[number];

/**
 * Five durable destinations replace a long, flat room list. The order inside
 * each hub is intentional: its landing room comes first, followed by a route
 * from approachable overview to increasingly detailed material.
 */
export const MUSEUM_HUB_ROOMS = {
  home: ['dashboard', 'share'],
  pulse: ['pulse', 'obsessions', 'achievements', 'wrapped'],
  atlas: ['artist', 'top', 'cultural'],
  stories: ['eras', 'timecapsule', 'personality', 'emotions', 'inner', 'insights', 'report'],
  lab: ['upload', 'audio', 'aiassistant', 'compare', 'museums', 'platforms', 'quality', 'statsdeep'],
} as const satisfies Record<MuseumHubId, readonly MuseumRoomId[]>;

export const MUSEUM_HUB_ENTRY_ROOMS = {
  home: 'dashboard',
  pulse: 'pulse',
  atlas: 'artist',
  stories: 'eras',
  lab: 'upload',
} as const satisfies Record<MuseumHubId, MuseumRoomId>;

type ExperienceStorage = Pick<Storage, 'getItem' | 'setItem'>;

const LEGACY_JOURNEY_DEPTHS: Readonly<Record<string, ExperienceDepth>> = {
  quick: 'guided',
  full: 'explore',
  lab: 'deep-dive',
};

function browserStorage(): ExperienceStorage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function hubForRoom(roomId: string): MuseumHubId | null {
  for (const hubId of MUSEUM_HUB_IDS) {
    if ((MUSEUM_HUB_ROOMS[hubId] as readonly string[]).includes(roomId)) return hubId;
  }

  return null;
}

export function isExperienceDepth(value: unknown): value is ExperienceDepth {
  return typeof value === 'string'
    && (EXPERIENCE_DEPTHS as readonly string[]).includes(value);
}

/**
 * Resolves the new preference first, then migrates the former journey choice.
 * Migration is additive: the legacy key remains untouched so the current
 * application can keep working until App adopts this context.
 */
export function resolveStoredExperienceDepth(
  storage: ExperienceStorage | null = browserStorage(),
): ExperienceDepth {
  if (!storage) return 'explore';

  try {
    const current = storage.getItem(EXPERIENCE_DEPTH_STORAGE_KEY);
    if (isExperienceDepth(current)) return current;

    const legacy = storage.getItem(EXPEDITION_JOURNEY_STORAGE_KEY);
    const migrated = legacy ? LEGACY_JOURNEY_DEPTHS[legacy] : undefined;
    if (!migrated) return 'explore';

    try {
      storage.setItem(EXPERIENCE_DEPTH_STORAGE_KEY, migrated);
    } catch {
      // The resolved in-memory preference is still useful in private browsing.
    }

    return migrated;
  } catch {
    return 'explore';
  }
}
