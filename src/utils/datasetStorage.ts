import type { ArtistGenreCatalogEntry, GenreAssignment, MusicDnaData } from '../types';

/**
 * Local, versioned persistence for uploaded archives. Records and portable
 * exports are validated at the trust boundary so corrupt or future schemas
 * never reach the dashboard as if they were current MusicDnaData.
 */

const DB_NAME = 'nova-music-lab';
const STORE = 'datasets';
const ACTIVE_KEY = 'active';
const MUTATION_INTENT_KEY = '__nova_dataset_mutation_intent__';
const MUTATION_LOCK_NAME = 'nova-music-lab:dataset-mutation';
const MUTATION_INTENT_SCHEMA_VERSION = 1 as const;

export const DATASET_SCHEMA_VERSION = 3 as const;
export const NOVA_EXPORT_VERSION = 3 as const;

export interface StoredDataset {
  schemaVersion: typeof DATASET_SCHEMA_VERSION;
  data: MusicDnaData;
  savedAt: string;
  sourceLabel: string;
  genreAssignments: GenreAssignment[];
}

export type DatasetStorageOperation = 'save' | 'load' | 'clear';
export type DatasetMutationOperation = Exclude<DatasetStorageOperation, 'load'>;
export type DatasetStorageFailureReason =
  | 'indexeddb-unavailable'
  | 'invalid-dataset'
  | 'invalid-genre-assignments'
  | 'invalid-stored-record'
  | 'blocked'
  | 'quota-exceeded'
  | 'open-failed'
  | 'stale-intent'
  | 'transaction-failed';

export interface DatasetStorageFailure {
  ok: false;
  status: 'unavailable' | 'invalid' | 'stale' | 'error';
  operation: DatasetStorageOperation;
  reason: DatasetStorageFailureReason;
  recoverable: boolean;
  errorName: string | null;
}

export interface DatasetSaved {
  ok: true;
  status: 'saved';
  record: StoredDataset;
}

export interface DatasetLoaded {
  ok: true;
  status: 'loaded';
  record: StoredDataset;
}

export interface DatasetMissing {
  ok: true;
  status: 'missing';
}

export interface DatasetCleared {
  ok: true;
  status: 'cleared';
}

/**
 * Durable, cross-tab mutation ownership. The epoch makes ordering observable;
 * ownerId prevents a damaged/reset counter from accidentally matching an old
 * token. The complete token must still be current inside the write transaction.
 */
export interface DatasetMutationIntent {
  schemaVersion: typeof MUTATION_INTENT_SCHEMA_VERSION;
  epoch: number;
  ownerId: string;
  operation: DatasetMutationOperation;
  issuedAt: string;
}

export interface DatasetIntentClaimed {
  ok: true;
  status: 'claimed';
  intent: DatasetMutationIntent;
}

export type DatasetSaveResult = DatasetSaved | DatasetStorageFailure;
export type DatasetLoadResult = DatasetLoaded | DatasetMissing | DatasetStorageFailure;
export type DatasetClearResult = DatasetCleared | DatasetStorageFailure;
export type DatasetIntentClaimResult = DatasetIntentClaimed | DatasetStorageFailure;

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

function isPlainRecord(value: unknown): value is UnknownRecord {
  return isRecord(value) && Object.prototype.toString.call(value) === '[object Object]';
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isArrayOf(value: unknown, guard: (item: unknown) => boolean): value is unknown[] {
  return Array.isArray(value) && value.every(guard);
}

function hasValidOptionalField(
  value: UnknownRecord,
  field: string,
  guard: (fieldValue: unknown) => boolean,
): boolean {
  return value[field] === undefined || guard(value[field]);
}

function hasValidOptionalString(value: UnknownRecord, field: string): boolean {
  return hasValidOptionalField(value, field, isString);
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

function isDailyPlays(value: unknown): boolean {
  return isPlainRecord(value)
    && Object.values(value).every(isFiniteNonNegative);
}

function isMonthlyActivity(value: unknown): boolean {
  return isRecord(value)
    && isFiniteNonNegative(value.year)
    && isFiniteNonNegative(value.month)
    && isFiniteNonNegative(value.plays);
}

function isPlatformPlay(value: unknown): boolean {
  return isRecord(value)
    && isString(value.platform)
    && isFiniteNonNegative(value.plays);
}

const PLAY_SOURCES = new Set([
  'lastfm',
  'spotify',
  'youtube',
  'apple_music',
  'listenbrainz',
  'merged',
  'unknown',
]);

function isSourceSummary(value: unknown): boolean {
  if (!isRecord(value) || !PLAY_SOURCES.has(value.source_type as string)) return false;
  const numericFields = [
    'lastfm_plays',
    'spotify_plays',
    'youtube_plays',
    'apple_music_plays',
    'listenbrainz_plays',
    'merged_plays',
    'spotify_skips',
    'spotify_short_plays',
    'overlap_unique_tracks',
  ];
  return numericFields.every(field => isFiniteNonNegative(value[field]))
    && isFiniteNonNegative(value.spotify_skip_rate_pct)
    && isFiniteNonNegative(value.spotify_short_play_rate_pct)
    && isString(value.source_note)
    && hasValidOptionalField(value, 'cross_source_duplicates', isFiniteNonNegative);
}

function isArtistKnowledgeMatch(value: unknown): boolean {
  return isRecord(value)
    && isString(value.name)
    && isFiniteNonNegative(value.plays)
    && isFiniteNonNegative(value.rank)
    && hasValidOptionalString(value, 'matchedName')
    && hasValidOptionalString(value, 'mbid')
    && isArrayOf(value.tags, isString)
    && isFiniteNonNegative(value.releaseGroupCount);
}

function isArtistKnowledgeMissing(value: unknown): boolean {
  return isRecord(value)
    && isString(value.name)
    && isFiniteNonNegative(value.plays)
    && isFiniteNonNegative(value.rank);
}

const ENRICHMENT_PRIORITIES = new Set(['critical', 'high', 'medium', 'low']);
const PROFILE_STATUSES = new Set(['missing', 'curated', 'matched']);
const ENRICHMENT_GAPS = new Set([
  'missing_profile',
  'missing_wikidata',
  'missing_description',
  'missing_member_or_role',
  'missing_website',
  'missing_image',
  'missing_releases',
  'curated_needs_catalog_match',
]);

function isArtistEnrichmentQueueItem(value: unknown): boolean {
  return isRecord(value)
    && isString(value.name)
    && isFiniteNonNegative(value.rank)
    && isFiniteNonNegative(value.plays)
    && isFiniteNonNegative(value.score)
    && ENRICHMENT_PRIORITIES.has(value.priority as string)
    && PROFILE_STATUSES.has(value.profileStatus as string)
    && isArrayOf(value.gaps, gap => ENRICHMENT_GAPS.has(gap as string))
    && isFiniteNonNegative(value.releaseGroupCount)
    && isBoolean(value.hasWikidata)
    && isBoolean(value.hasMembersOrRoles)
    && isBoolean(value.hasOfficialLinks)
    && isBoolean(value.hasImage);
}

function isArtistKnowledgeSummary(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'offline_artist_knowledge') return false;
  const numericFields = [
    'cache_artist_count',
    'wikidata_profile_count',
    'wikidata_description_count',
    'wikidata_website_count',
    'wikidata_image_count',
    'total_artists',
    'matched_artists',
    'unmatched_artists',
    'matched_plays',
  ];
  return (value.generated_at === null || isString(value.generated_at))
    && numericFields.every(field => isFiniteNonNegative(value[field]))
    && isFiniteNonNegative(value.match_rate_pct)
    && isFiniteNonNegative(value.matched_play_rate_pct)
    && isArrayOf(value.top_matches, isArtistKnowledgeMatch)
    && isArrayOf(value.top_missing, isArtistKnowledgeMissing)
    && isArrayOf(value.enrichment_queue, isArtistEnrichmentQueueItem);
}

function isRecordsSummary(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const numericFields = [
    'longest_streak_days',
    'max_day_plays',
    'longest_session_minutes',
    'longest_session_tracks',
    'best_session_tracks',
  ];
  return numericFields.every(field => isFiniteNonNegative(value[field]))
    && ['longest_streak_start', 'longest_streak_end', 'max_day_date',
      'longest_session_start', 'best_session_start']
      .every(field => hasValidOptionalString(value, field));
}

function isPersonalityTrait(value: unknown): boolean {
  return isRecord(value)
    && isFiniteNonNegative(value.score)
    && isString(value.evidence)
    && isArrayOf(value.artists, isString)
    && isString(value.positive)
    && isString(value.shadow)
    && isString(value.tip);
}

function isPersonalityMatrix(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return [
    'sensibilidad_emocional',
    'nostalgia',
    'energia',
    'oscuridad_estetica',
    'creatividad',
    'rebeldia',
    'futurismo',
  ].every(field => isPersonalityTrait(value[field]));
}

function isArchetype(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return ['name', 'desc', 'color', 'aesthetic', 'strength', 'wound', 'advice']
    .every(field => isString(value[field]))
    && isArrayOf(value.artists, isString)
    && isArrayOf(value.tracks, isString);
}

function isArtistProfile(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.ep_concept)) return false;
  return ['alias', 'sound', 'tempo', 'aesthetic', 'live_show']
    .every(field => isString(value[field]))
    && isArrayOf(value.influences, isString)
    && isString(value.ep_concept.title)
    && isString(value.ep_concept.description)
    && isArrayOf(value.ep_concept.tracklist, isString);
}

function hasValidOptionalDataFields(value: UnknownRecord): boolean {
  return hasValidOptionalField(
    value,
    'artist_origin_countries',
    candidate => isArrayOf(candidate, isCountryPlay),
  )
    && hasValidOptionalField(value, 'daily_plays', isDailyPlays)
    && hasValidOptionalField(
      value,
      'monthly_activity',
      candidate => isArrayOf(candidate, isMonthlyActivity),
    )
    && hasValidOptionalField(
      value,
      'platform_breakdown',
      candidate => isArrayOf(candidate, isPlatformPlay),
    )
    && hasValidOptionalField(value, 'source_summary', isSourceSummary)
    && hasValidOptionalField(value, 'knowledge_summary', isArtistKnowledgeSummary)
    && hasValidOptionalField(value, 'records', isRecordsSummary)
    && hasValidOptionalField(value, 'personality_matrix', isPersonalityMatrix)
    && hasValidOptionalField(value, 'archetypes', candidate => isArrayOf(candidate, isArchetype))
    && hasValidOptionalField(value, 'artist_profile', isArtistProfile);
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
    && hasValidOptionalDataFields(value)
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

type DatasetDatabaseOpenResult = { ok: true; db: IDBDatabase } | DatasetStorageFailure;

function invalidStorageResult(
  operation: DatasetStorageOperation,
  reason: Extract<DatasetStorageFailureReason, 'invalid-dataset' | 'invalid-genre-assignments' | 'invalid-stored-record'>,
): DatasetStorageFailure {
  return {
    ok: false,
    status: 'invalid',
    operation,
    reason,
    recoverable: true,
    errorName: 'ValidationError',
  };
}

function storageErrorName(error: unknown): string | null {
  if (error instanceof Error) return error.name || 'Error';
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const name = (error as { name?: unknown }).name;
    return typeof name === 'string' && name ? name : null;
  }
  return null;
}

function failedStorageResult(
  operation: DatasetStorageOperation,
  error: unknown,
  fallbackReason: Extract<DatasetStorageFailureReason, 'open-failed' | 'transaction-failed'>,
): DatasetStorageFailure {
  const errorName = storageErrorName(error);
  const normalizedName = errorName?.toLocaleLowerCase('en-US') ?? '';

  if (normalizedName.includes('security') || normalizedName.includes('notsupported') || normalizedName.includes('missingapi')) {
    return {
      ok: false,
      status: 'unavailable',
      operation,
      reason: 'indexeddb-unavailable',
      recoverable: false,
      errorName,
    };
  }

  return {
    ok: false,
    status: 'error',
    operation,
    reason: normalizedName.includes('quota')
      ? 'quota-exceeded'
      : normalizedName.includes('blocked')
        ? 'blocked'
        : fallbackReason,
    recoverable: true,
    errorName,
  };
}

function openDb(operation: DatasetStorageOperation): Promise<DatasetDatabaseOpenResult> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve({
      ok: false,
      status: 'unavailable',
      operation,
      reason: 'indexeddb-unavailable',
      recoverable: false,
      errorName: 'MissingAPIError',
    });
  }
  return new Promise(resolve => {
    let settled = false;
    const finish = (result: DatasetDatabaseOpenResult) => {
      if (settled) {
        if (result.ok) result.db.close();
        return;
      }
      settled = true;
      resolve(result);
    };
    // Open the current database version instead of forcing legacy v2. Dexie
    // v4 owns the shared schema and maps its semantic version to IndexedDB 40;
    // forcing version 2 after bootstrap would throw VersionError. A fresh
    // database still receives an upgrade event and creates the legacy store.
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME);
    } catch (error) {
      finish(failedStorageResult(operation, error, 'open-failed'));
      return;
    }
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => {
      req.result.onversionchange = () => req.result.close();
      finish({ ok: true, db: req.result });
    };
    req.onerror = () => finish(failedStorageResult(operation, req.error, 'open-failed'));
    req.onblocked = () => finish(failedStorageResult(operation, { name: 'BlockedError' }, 'open-failed'));
  });
}

// The in-memory tail orders callers in this document. The Web Lock extends that
// order across same-origin tabs and installed PWA windows; the durable intent
// record remains the source of truth when Web Locks are unavailable or a page
// is suspended between parsing and persistence.
let datasetOperationTail: Promise<void> = Promise.resolve();

function enqueueDatasetOperation<Result>(operation: () => Promise<Result>): Promise<Result> {
  const result = datasetOperationTail.then(operation, operation);
  datasetOperationTail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function staleIntentResult(operation: DatasetMutationOperation): DatasetStorageFailure {
  return {
    ok: false,
    status: 'stale',
    operation,
    reason: 'stale-intent',
    recoverable: true,
    errorName: 'StaleIntentError',
  };
}

function readMutationIntent(value: unknown): DatasetMutationIntent | null {
  if (!isRecord(value)) return null;
  const issuedAt = normalizeIsoDate(value.issuedAt);
  if (value.schemaVersion !== MUTATION_INTENT_SCHEMA_VERSION
    || !Number.isSafeInteger(value.epoch)
    || (value.epoch as number) < 1
    || !isString(value.ownerId)
    || value.ownerId.length < 1
    || (value.operation !== 'save' && value.operation !== 'clear')
    || !issuedAt) {
    return null;
  }
  return {
    schemaVersion: MUTATION_INTENT_SCHEMA_VERSION,
    epoch: value.epoch as number,
    ownerId: value.ownerId,
    operation: value.operation,
    issuedAt,
  };
}

function createMutationIntent(
  previous: unknown,
  operation: DatasetMutationOperation,
): DatasetMutationIntent {
  const current = readMutationIntent(previous);
  const nextEpoch = current && current.epoch < Number.MAX_SAFE_INTEGER
    ? current.epoch + 1
    : 1;
  const fallbackOwnerId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return {
    schemaVersion: MUTATION_INTENT_SCHEMA_VERSION,
    epoch: nextEpoch,
    ownerId: globalThis.crypto?.randomUUID?.() ?? fallbackOwnerId,
    operation,
    issuedAt: new Date().toISOString(),
  };
}

function mutationIntentMatches(current: unknown, expected: DatasetMutationIntent): boolean {
  const intent = readMutationIntent(current);
  return Boolean(intent
    && intent.epoch === expected.epoch
    && intent.ownerId === expected.ownerId
    && intent.operation === expected.operation);
}

async function withDatasetMutationLock<Result>(
  operation: DatasetMutationOperation,
  mutation: () => Promise<Result>,
): Promise<Result | DatasetStorageFailure> {
  try {
    const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
    if (!locks) return await mutation();
    return await locks.request(MUTATION_LOCK_NAME, { mode: 'exclusive' }, mutation);
  } catch (error) {
    return failedStorageResult(operation, error, 'transaction-failed');
  }
}

/**
 * Register user intent before expensive parsing starts. Callers must carry the
 * returned token into save/clear; a newer token from any tab makes this one a
 * safe, typed no-op instead of allowing stale work to recreate local data.
 */
export async function claimDatasetMutationIntent(
  operation: DatasetMutationOperation,
): Promise<DatasetIntentClaimResult> {
  return enqueueDatasetOperation(() => withDatasetMutationLock(
    operation,
    () => persistMutationIntent(operation),
  ));
}

async function persistMutationIntent(
  operation: DatasetMutationOperation,
): Promise<DatasetIntentClaimResult> {
  const opened = await openDb(operation);
  if (!opened.ok) return opened;
  const { db } = opened;
  return new Promise(resolve => {
    let settled = false;
    let intent: DatasetMutationIntent | null = null;
    let writeRequest: IDBRequest | null = null;
    const finish = (result: DatasetIntentClaimResult) => {
      if (settled) return;
      settled = true;
      db.close();
      resolve(result);
    };
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const readRequest = store.get(MUTATION_INTENT_KEY);
      readRequest.onsuccess = () => {
        intent = createMutationIntent(readRequest.result, operation);
        writeRequest = store.put(intent, MUTATION_INTENT_KEY);
      };
      tx.oncomplete = () => intent
        ? finish({ ok: true, status: 'claimed', intent })
        : finish(failedStorageResult(operation, { name: 'TransactionError' }, 'transaction-failed'));
      tx.onerror = () => finish(failedStorageResult(
        operation,
        tx.error ?? writeRequest?.error ?? readRequest.error,
        'transaction-failed',
      ));
      tx.onabort = tx.onerror;
    } catch (error) {
      finish(failedStorageResult(operation, error, 'transaction-failed'));
    }
  });
}

export async function saveDatasetResult(
  data: MusicDnaData,
  sourceLabel: string,
  genreAssignments: GenreAssignment[] = [],
  expectedIntent?: DatasetMutationIntent,
): Promise<DatasetSaveResult> {
  if (!isMusicDnaData(data)) return invalidStorageResult('save', 'invalid-dataset');
  const normalizedAssignments = normalizeGenreAssignments(genreAssignments);
  if (!normalizedAssignments) return invalidStorageResult('save', 'invalid-genre-assignments');
  return enqueueDatasetOperation(() => withDatasetMutationLock(
    'save',
    () => persistDataset(data, sourceLabel, normalizedAssignments, expectedIntent),
  ));
}

async function persistDataset(
  data: MusicDnaData,
  sourceLabel: string,
  genreAssignments: GenreAssignment[],
  expectedIntent?: DatasetMutationIntent,
): Promise<DatasetSaveResult> {
  const opened = await openDb('save');
  if (!opened.ok) return opened;
  const { db } = opened;
  return new Promise(resolve => {
    let settled = false;
    let stale = false;
    let wroteRecord = false;
    let mutationRequest: IDBRequest | null = null;
    const record: StoredDataset = {
      schemaVersion: DATASET_SCHEMA_VERSION,
      data,
      savedAt: new Date().toISOString(),
      sourceLabel: normalizeSourceLabel(sourceLabel),
      genreAssignments,
    };
    const finish = (result: DatasetSaveResult) => {
      if (settled) return;
      settled = true;
      db.close();
      resolve(result);
    };
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const intentRequest = store.get(MUTATION_INTENT_KEY);
      intentRequest.onsuccess = () => {
        if (expectedIntent && !mutationIntentMatches(intentRequest.result, expectedIntent)) {
          stale = true;
          return;
        }
        if (!expectedIntent) {
          const intent = createMutationIntent(intentRequest.result, 'save');
          store.put(intent, MUTATION_INTENT_KEY);
        }
        mutationRequest = store.put(record, ACTIVE_KEY);
        wroteRecord = true;
      };
      tx.oncomplete = () => {
        if (stale) finish(staleIntentResult('save'));
        else if (wroteRecord) finish({ ok: true, status: 'saved', record });
        else finish(failedStorageResult('save', { name: 'TransactionError' }, 'transaction-failed'));
      };
      tx.onerror = () => finish(failedStorageResult(
        'save',
        tx.error ?? mutationRequest?.error ?? intentRequest.error,
        'transaction-failed',
      ));
      tx.onabort = tx.onerror;
    } catch (error) {
      finish(failedStorageResult('save', error, 'transaction-failed'));
    }
  });
}

export async function loadDatasetResult(): Promise<DatasetLoadResult> {
  return enqueueDatasetOperation(restoreDataset);
}

async function restoreDataset(): Promise<DatasetLoadResult> {
  const opened = await openDb('load');
  if (!opened.ok) return opened;
  const { db } = opened;
  return new Promise(resolve => {
    let settled = false;
    let restored: StoredDataset | null = null;
    let foundRecord = false;
    let invalidRecord = false;
    const finish = (result: DatasetLoadResult) => {
      if (settled) return;
      settled = true;
      db.close();
      resolve(result);
    };
    try {
      // Readwrite lets a valid legacy v1 record migrate atomically in place.
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.get(ACTIVE_KEY);
      req.onsuccess = () => {
        const current = req.result;
        if (current === undefined) return;
        foundRecord = true;
        restored = migrateStoredDataset(current);
        if (!restored) {
          invalidRecord = true;
          return;
        }
        if (!isCurrentStoredDataset(current)) store.put(restored, ACTIVE_KEY);
      };
      tx.oncomplete = () => {
        if (invalidRecord) {
          finish(invalidStorageResult('load', 'invalid-stored-record'));
        } else if (!foundRecord) {
          finish({ ok: true, status: 'missing' });
        } else if (restored) {
          finish({ ok: true, status: 'loaded', record: restored });
        } else {
          finish(failedStorageResult('load', { name: 'TransactionError' }, 'transaction-failed'));
        }
      };
      tx.onerror = () => finish(failedStorageResult('load', tx.error ?? req.error, 'transaction-failed'));
      tx.onabort = () => finish(failedStorageResult('load', tx.error ?? req.error, 'transaction-failed'));
    } catch (error) {
      finish(failedStorageResult('load', error, 'transaction-failed'));
    }
  });
}

export async function clearDatasetResult(
  expectedIntent?: DatasetMutationIntent,
): Promise<DatasetClearResult> {
  return enqueueDatasetOperation(() => withDatasetMutationLock(
    'clear',
    () => removeDataset(expectedIntent),
  ));
}

async function removeDataset(
  expectedIntent?: DatasetMutationIntent,
): Promise<DatasetClearResult> {
  const opened = await openDb('clear');
  if (!opened.ok) return opened;
  const { db } = opened;
  return new Promise(resolve => {
    let settled = false;
    let stale = false;
    let deletedRecord = false;
    let mutationRequest: IDBRequest | null = null;
    const finish = (result: DatasetClearResult) => {
      if (settled) return;
      settled = true;
      db.close();
      resolve(result);
    };
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const intentRequest = store.get(MUTATION_INTENT_KEY);
      intentRequest.onsuccess = () => {
        if (expectedIntent && !mutationIntentMatches(intentRequest.result, expectedIntent)) {
          stale = true;
          return;
        }
        if (!expectedIntent) {
          const intent = createMutationIntent(intentRequest.result, 'clear');
          store.put(intent, MUTATION_INTENT_KEY);
        }
        mutationRequest = store.delete(ACTIVE_KEY);
        deletedRecord = true;
      };
      tx.oncomplete = () => {
        if (stale) finish(staleIntentResult('clear'));
        else if (deletedRecord) finish({ ok: true, status: 'cleared' });
        else finish(failedStorageResult('clear', { name: 'TransactionError' }, 'transaction-failed'));
      };
      tx.onerror = () => finish(failedStorageResult(
        'clear',
        tx.error ?? mutationRequest?.error ?? intentRequest.error,
        'transaction-failed',
      ));
      tx.onabort = tx.onerror;
    } catch (error) {
      finish(failedStorageResult('clear', error, 'transaction-failed'));
    }
  });
}

/** Compatibility wrapper for callers that only need a success flag. */
export async function saveDataset(
  data: MusicDnaData,
  sourceLabel: string,
  genreAssignments: GenreAssignment[] = [],
): Promise<boolean> {
  return (await saveDatasetResult(data, sourceLabel, genreAssignments)).ok;
}

/** Compatibility wrapper for callers that intentionally collapse missing and failure. */
export async function loadDataset(): Promise<StoredDataset | null> {
  const result = await loadDatasetResult();
  return result.ok && result.status === 'loaded' ? result.record : null;
}

/** Compatibility wrapper. New UI flows should inspect clearDatasetResult instead. */
export async function clearDataset(): Promise<void> {
  await clearDatasetResult();
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
