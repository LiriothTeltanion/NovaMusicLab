import type { ArtistGenreCatalogEntry, GenreAssignment, MusicDnaData } from '../types';

/**
 * Local, versioned persistence for uploaded archives. Records and portable
 * exports are validated at the trust boundary so corrupt or future schemas
 * never reach the dashboard as if they were current MusicDnaData.
 */

const DB_NAME = 'nova-music-lab';
const DB_VERSION = 2;
const STORE = 'datasets';
const ACTIVE_KEY = 'active';

export const DATASET_SCHEMA_VERSION = 3 as const;
export const NOVA_EXPORT_VERSION = 3 as const;

export interface StoredDataset {
  schemaVersion: typeof DATASET_SCHEMA_VERSION;
  data: MusicDnaData;
  savedAt: string;
  sourceLabel: string;
  genreAssignments: GenreAssignment[];
}

/** Wrapper shape for portable JSON exports (distinct from source-service exports). */
export interface NovaMusicExport {
  nova_music_export: true;
  version: typeof NOVA_EXPORT_VERSION;
  exported_at: string;
  source_label: string;
  data: MusicDnaData;
  genre_assignments: GenreAssignment[];
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isArrayOf(value: unknown, guard: (item: unknown) => boolean): value is unknown[] {
  return Array.isArray(value) && value.every(guard);
}

function hasCoreMetrics(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const numericFields = [
    'total_plays',
    'unique_artists',
    'unique_tracks',
    'unique_albums',
    'listening_minutes',
    'listening_hours',
    'listening_days',
    'active_days',
    'match_rate_pct',
  ];
  return numericFields.every(field => isFiniteNonNegative(value[field]))
    && (isFiniteNonNegative(value.max_year) || isString(value.max_year));
}

function isTopArtist(value: unknown): boolean {
  return isRecord(value)
    && isString(value.name)
    && isFiniteNonNegative(value.plays)
    && isString(value.genre)
    && isString(value.country);
}

function isTopTrack(value: unknown): boolean {
  return isRecord(value)
    && isString(value.artist)
    && isString(value.title)
    && isFiniteNonNegative(value.plays)
    && isString(value.genre);
}

function isTopAlbum(value: unknown): boolean {
  return isRecord(value)
    && isString(value.artist)
    && isString(value.title)
    && isFiniteNonNegative(value.plays);
}

function isTopGenre(value: unknown): boolean {
  return isRecord(value) && isString(value.name) && isFiniteNonNegative(value.plays);
}

function isYearlyEra(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return ['year', 'plays', 'unique_artists', 'unique_tracks', 'diversity_index']
    .every(field => isFiniteNonNegative(value[field]))
    && ['top_artist', 'top_track', 'dominant_daypart', 'era_label', 'era_desc']
      .every(field => isString(value[field]));
}

function isSession(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return ['id', 'tracks_count', 'duration_min', 'unique_artists']
    .every(field => isFiniteNonNegative(value[field]))
    && ['start', 'end', 'top_artist', 'top_track'].every(field => isString(value[field]));
}

function isObsession(value: unknown): boolean {
  return isRecord(value)
    && isString(value.artist)
    && isString(value.track)
    && isString(value.date)
    && isFiniteNonNegative(value.count);
}

function isCountryPlay(value: unknown): boolean {
  return isRecord(value) && isString(value.country) && isFiniteNonNegative(value.plays);
}

function isArtistGenreCatalogEntry(value: unknown): value is ArtistGenreCatalogEntry {
  if (!isRecord(value)) return false;
  const name = isString(value.name) ? value.name.normalize('NFC').trim() : '';
  return Boolean(name)
    && value.artistKey === name
    && Number.isInteger(value.plays)
    && Number(value.plays) > 0
    && isString(value.automaticGenre)
    && Boolean(value.automaticGenre.trim())
    && isString(value.automaticFamily)
    && Boolean(value.automaticFamily.trim())
    && isString(value.country)
    && Boolean(value.country.trim())
    && (value.source === 'catalog' || value.source === 'unclassified');
}

function hasValidOptionalArtistGenreCatalog(value: UnknownRecord): boolean {
  const catalog = value.artist_genre_catalog;
  if (catalog === undefined) return true;
  if (!Array.isArray(catalog) || !catalog.every(isArtistGenreCatalogEntry)) return false;
  const metrics = value.core_metrics;
  if (!isRecord(metrics)) return false;
  const totalPlays = catalog.reduce((sum, artist) => sum + artist.plays, 0);
  return new Set(catalog.map(artist => artist.artistKey)).size === catalog.length
    && catalog.length === metrics.unique_artists
    && totalPlays === metrics.total_plays;
}

/** Runtime schema guard shared by exports and IndexedDB restoration. */
export function isMusicDnaData(value: unknown): value is MusicDnaData {
  if (!isRecord(value)) return false;
  const heatmap = value.heatmap;
  return isString(value.project)
    && isString(value.generated_at)
    && hasCoreMetrics(value.core_metrics)
    && isArrayOf(value.top_artists, isTopArtist)
    && isArrayOf(value.top_tracks, isTopTrack)
    && isArrayOf(value.top_albums, isTopAlbum)
    && isArrayOf(value.top_genres, isTopGenre)
    && isArrayOf(value.yearly_eras, isYearlyEra)
    && isArrayOf(value.sessions, isSession)
    && isArrayOf(value.obsessions, isObsession)
    && isArrayOf(value.countries, isCountryPlay)
    && hasValidOptionalArtistGenreCatalog(value)
    && Array.isArray(heatmap)
    && heatmap.length === 24
    && heatmap.every(row => Array.isArray(row) && row.length === 7 && row.every(isFiniteNonNegative));
}

function normalizeIsoDate(value: unknown): string | null {
  if (!isString(value) || !value.trim()) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function normalizeSourceLabel(value: unknown): string {
  if (!isString(value)) return 'Imported archive';
  const normalized = value.trim().replace(/\s+/g, ' ').slice(0, 160);
  return normalized || 'Imported archive';
}

function normalizeRequiredText(value: unknown): string | null {
  if (!isString(value)) return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized || null;
}

function normalizeGenreAssignment(value: unknown): GenreAssignment | null {
  if (!isRecord(value)) return null;
  const artistKey = normalizeRequiredText(value.artistKey);
  const artistName = normalizeRequiredText(value.artistName);
  const family = normalizeRequiredText(value.family);
  const updatedAt = normalizeIsoDate(value.updatedAt);
  if (!artistKey || !artistName || !family || !updatedAt || !Array.isArray(value.tags)) return null;

  const tags: string[] = [];
  const seenTags = new Set<string>();
  for (const rawTag of value.tags) {
    const tag = normalizeRequiredText(rawTag);
    if (!tag) return null;
    const tagKey = tag.toLocaleLowerCase('en-US');
    if (seenTags.has(tagKey)) continue;
    seenTags.add(tagKey);
    tags.push(tag);
  }

  return {
    artistKey,
    artistName,
    family: family as GenreAssignment['family'],
    tags,
    updatedAt,
  };
}

/**
 * Normalizes user-entered whitespace, dates and duplicate tags while refusing
 * to silently discard malformed or ambiguous artist assignments.
 */
function normalizeGenreAssignments(value: unknown): GenreAssignment[] | null {
  if (!Array.isArray(value)) return null;
  const normalized: GenreAssignment[] = [];
  const seenArtists = new Set<string>();
  for (const rawAssignment of value) {
    const assignment = normalizeGenreAssignment(rawAssignment);
    if (!assignment) return null;
    const artistKey = assignment.artistKey.toLocaleLowerCase('en-US');
    if (seenArtists.has(artistKey)) return null;
    seenArtists.add(artistKey);
    normalized.push(assignment);
  }
  return normalized;
}

function hasCanonicalGenreAssignments(value: unknown): value is GenreAssignment[] {
  const normalized = normalizeGenreAssignments(value);
  return normalized !== null && JSON.stringify(value) === JSON.stringify(normalized);
}

function isCurrentStoredDataset(value: unknown): value is StoredDataset {
  const savedAt = isRecord(value) ? normalizeIsoDate(value.savedAt) : null;
  return isRecord(value)
    && value.schemaVersion === DATASET_SCHEMA_VERSION
    && isMusicDnaData(value.data)
    && savedAt !== null
    && value.savedAt === savedAt
    && isString(value.sourceLabel)
    && value.sourceLabel === normalizeSourceLabel(value.sourceLabel)
    && hasCanonicalGenreAssignments(value.genreAssignments);
}

/** Accepts v1/v2 records and normalizes them to the current v3 wrapper. */
function migrateStoredDataset(value: unknown): StoredDataset | null {
  if (!isRecord(value) || !isMusicDnaData(value.data)) return null;
  if (value.schemaVersion !== undefined
    && value.schemaVersion !== 1
    && value.schemaVersion !== 2
    && value.schemaVersion !== DATASET_SCHEMA_VERSION) return null;
  const savedAt = normalizeIsoDate(value.savedAt);
  if (!savedAt) return null;
  const genreAssignments = value.schemaVersion === DATASET_SCHEMA_VERSION
    ? normalizeGenreAssignments(value.genreAssignments)
    : [];
  if (!genreAssignments) return null;
  return {
    schemaVersion: DATASET_SCHEMA_VERSION,
    data: value.data,
    savedAt,
    sourceLabel: normalizeSourceLabel(value.sourceLabel),
    genreAssignments,
  };
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    let settled = false;
    const finish = (db: IDBDatabase | null) => {
      if (settled) {
        db?.close();
        return;
      }
      settled = true;
      resolve(db);
    };
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => {
      req.result.onversionchange = () => req.result.close();
      finish(req.result);
    };
    req.onerror = () => finish(null);
    req.onblocked = () => finish(null);
  });
}

export async function saveDataset(
  data: MusicDnaData,
  sourceLabel: string,
  genreAssignments: GenreAssignment[] = [],
): Promise<boolean> {
  if (!isMusicDnaData(data)) return false;
  const normalizedAssignments = normalizeGenreAssignments(genreAssignments);
  if (!normalizedAssignments) return false;
  const db = await openDb();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const record: StoredDataset = {
        schemaVersion: DATASET_SCHEMA_VERSION,
        data,
        savedAt: new Date().toISOString(),
        sourceLabel: normalizeSourceLabel(sourceLabel),
        genreAssignments: normalizedAssignments,
      };
      tx.objectStore(STORE).put(record, ACTIVE_KEY);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); resolve(false); };
      tx.onabort = () => { db.close(); resolve(false); };
    } catch {
      db.close();
      resolve(false);
    }
  });
}

export async function loadDataset(): Promise<StoredDataset | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise(resolve => {
    let restored: StoredDataset | null = null;
    try {
      // Readwrite lets a valid legacy v1 record migrate atomically in place.
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.get(ACTIVE_KEY);
      req.onsuccess = () => {
        const current = req.result;
        restored = migrateStoredDataset(current);
        if (restored && !isCurrentStoredDataset(current)) store.put(restored, ACTIVE_KEY);
      };
      tx.oncomplete = () => { db.close(); resolve(restored); };
      tx.onerror = () => { db.close(); resolve(null); };
      tx.onabort = () => { db.close(); resolve(null); };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export async function clearDataset(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(ACTIVE_KEY);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
      tx.onabort = () => { db.close(); resolve(); };
    } catch {
      db.close();
      resolve();
    }
  });
}

/** Serialize an active dataset into the current portable export wrapper. */
export function buildExport(
  data: MusicDnaData,
  sourceLabel: string,
  genreAssignments: GenreAssignment[] = [],
): NovaMusicExport {
  if (!isMusicDnaData(data)) throw new TypeError('Cannot export an invalid Nova Music Lab dataset.');
  const normalizedAssignments = normalizeGenreAssignments(genreAssignments);
  if (!normalizedAssignments) {
    throw new TypeError('Cannot export invalid Nova Music Lab genre assignments.');
  }
  return {
    nova_music_export: true,
    version: NOVA_EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    source_label: normalizeSourceLabel(sourceLabel),
    data,
    genre_assignments: normalizedAssignments,
  };
}

/**
 * Validate and unwrap a portable export. Version 1/2 exports are migrated in
 * memory; unknown future versions are rejected instead of guessed at. Current
 * v3 payloads must carry a completely valid assignment list.
 */
export function parseExport(parsed: unknown): NovaMusicExport | null {
  if (!isRecord(parsed) || parsed.nova_music_export !== true) return null;
  if (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== NOVA_EXPORT_VERSION) return null;
  if (!isMusicDnaData(parsed.data)) return null;
  const exportedAt = normalizeIsoDate(parsed.exported_at);
  if (!exportedAt) return null;
  const genreAssignments = parsed.version === NOVA_EXPORT_VERSION
    ? normalizeGenreAssignments(parsed.genre_assignments)
    : [];
  if (!genreAssignments) return null;
  return {
    nova_music_export: true,
    version: NOVA_EXPORT_VERSION,
    exported_at: exportedAt,
    source_label: normalizeSourceLabel(parsed.source_label),
    data: parsed.data,
    genre_assignments: genreAssignments,
  };
}

/** Trigger a browser download of the portable export file. */
export function downloadExport(
  data: MusicDnaData,
  sourceLabel: string,
  genreAssignments: GenreAssignment[] = [],
): void {
  const payload = JSON.stringify(buildExport(data, sourceLabel, genreAssignments), null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nova-music-lab-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
