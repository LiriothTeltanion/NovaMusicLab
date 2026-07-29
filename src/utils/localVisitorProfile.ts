export const LOCAL_VISITOR_PROFILE_STORAGE_KEY = 'nova-music-lab:local-visitor-profile';
export const LOCAL_VISITOR_NAME_MAX_LENGTH = 40;
const LOCAL_VISITOR_PROFILE_SCHEMA_VERSION = 1 as const;
const LOCAL_VISITOR_PROFILE_STORAGE_PROBE_KEY = `${LOCAL_VISITOR_PROFILE_STORAGE_KEY}:probe`;

export interface LocalVisitorProfile {
  schemaVersion: typeof LOCAL_VISITOR_PROFILE_SCHEMA_VERSION;
  displayName: string;
  updatedAt: string;
}

export type LocalVisitorProfileSaveResult =
  | { ok: true; profile: LocalVisitorProfile | null }
  | { ok: false; profile: null };

export type LocalVisitorProfileLoadResult =
  | { ok: true; profile: LocalVisitorProfile | null }
  | { ok: false; profile: null };

type VisitorProfileStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): VisitorProfileStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function normalizeLocalVisitorName(value: string): string {
  const withoutControlCharacters = Array.from(value)
    .filter(character => {
      const codePoint = character.codePointAt(0) ?? 0;
      return !(
        (codePoint >= 0 && codePoint <= 31)
        || (codePoint >= 127 && codePoint <= 159)
      );
    })
    .join('');

  return withoutControlCharacters
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LOCAL_VISITOR_NAME_MAX_LENGTH);
}

function isLocalVisitorProfile(value: unknown): value is LocalVisitorProfile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const profile = value as Partial<LocalVisitorProfile>;
  return profile.schemaVersion === LOCAL_VISITOR_PROFILE_SCHEMA_VERSION
    && typeof profile.displayName === 'string'
    && normalizeLocalVisitorName(profile.displayName) === profile.displayName
    && Boolean(profile.displayName)
    && typeof profile.updatedAt === 'string'
    && Number.isFinite(Date.parse(profile.updatedAt));
}

export function loadLocalVisitorProfileResult(
  storage: VisitorProfileStorage | null = defaultStorage(),
): LocalVisitorProfileLoadResult {
  if (!storage) return { ok: false, profile: null };
  try {
    storage.setItem(LOCAL_VISITOR_PROFILE_STORAGE_PROBE_KEY, '1');
    storage.removeItem(LOCAL_VISITOR_PROFILE_STORAGE_PROBE_KEY);
    const raw = storage.getItem(LOCAL_VISITOR_PROFILE_STORAGE_KEY);
    if (!raw) return { ok: true, profile: null };
    const parsed: unknown = JSON.parse(raw);
    return {
      ok: true,
      profile: isLocalVisitorProfile(parsed) ? parsed : null,
    };
  } catch {
    return { ok: false, profile: null };
  }
}

export function loadLocalVisitorProfile(
  storage: VisitorProfileStorage | null = defaultStorage(),
): LocalVisitorProfile | null {
  const result = loadLocalVisitorProfileResult(storage);
  return result.ok ? result.profile : null;
}

export function saveLocalVisitorProfileResult(
  displayName: string,
  storage: VisitorProfileStorage | null = defaultStorage(),
): LocalVisitorProfileSaveResult {
  if (!storage) return { ok: false, profile: null };
  const normalizedName = normalizeLocalVisitorName(displayName);
  try {
    if (!normalizedName) {
      storage.removeItem(LOCAL_VISITOR_PROFILE_STORAGE_KEY);
      return { ok: true, profile: null };
    }

    const profile: LocalVisitorProfile = {
      schemaVersion: LOCAL_VISITOR_PROFILE_SCHEMA_VERSION,
      displayName: normalizedName,
      updatedAt: new Date().toISOString(),
    };
    storage.setItem(LOCAL_VISITOR_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return { ok: true, profile };
  } catch {
    return { ok: false, profile: null };
  }
}

export function saveLocalVisitorProfile(
  displayName: string,
  storage: VisitorProfileStorage | null = defaultStorage(),
): LocalVisitorProfile | null {
  const result = saveLocalVisitorProfileResult(displayName, storage);
  return result.ok ? result.profile : null;
}
