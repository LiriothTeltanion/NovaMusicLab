export interface PulseArtist {
  name: string;
  image: string;
}

export interface PulseTrack {
  title: string;
  artist: string;
  image: string;
}

export type WeeklyPulseSource =
  | 'lastfm_api'
  | 'lastfm_export';

export type WeeklyPulseLimitation =
  | 'point_in_time_capture'
  | 'official_api_snapshot'
  | 'not_complete_history'
  | 'album_count_unavailable'
  | 'rankings_may_change';

export interface WeeklyPulseArtist {
  name: string;
  scrobbles?: number;
}

export interface WeeklyPulseTrack {
  title: string;
  artist: string;
  scrobbles?: number;
}

/**
 * A deliberately small public summary. It contains no account handle,
 * profile URL, avatar, email, raw events or remote Last.fm artwork.
 */
export interface WeeklyPulseSummary {
  captured_at: string;
  period_start: string;
  period_end: string;
  source: WeeklyPulseSource;
  counts: {
    scrobbles: number;
    artists: number;
    tracks: number;
    albums: number | null;
  };
  top_artists: WeeklyPulseArtist[];
  top_tracks: WeeklyPulseTrack[];
  limitations: WeeklyPulseLimitation[];
}

export interface PulseSnapshot {
  synced_at: string;
  source: string;
  top_artists: PulseArtist[];
  top_tracks: PulseTrack[];
  recent_tracks: PulseTrack[];
  weekly_summary?: WeeklyPulseSummary;
}

const WEEKLY_SOURCES = new Set<WeeklyPulseSource>([
  'lastfm_api',
  'lastfm_export',
]);

const WEEKLY_LIMITATIONS = new Set<WeeklyPulseLimitation>([
  'point_in_time_capture',
  'official_api_snapshot',
  'not_complete_history',
  'album_count_unavailable',
  'rankings_may_change',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every(key => allowedKeys.has(key));
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isCapturedAt(value: unknown): value is string {
  if (isIsoDate(value)) return true;
  if (typeof value !== 'string') return false;
  return !Number.isNaN(Date.parse(value));
}

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isOptionalCount(value: unknown): value is number | undefined {
  return value === undefined || isCount(value);
}

function isNamedArtist(value: unknown): value is WeeklyPulseArtist {
  return isRecord(value)
    && hasOnlyKeys(value, ['name', 'scrobbles'])
    && typeof value.name === 'string'
    && value.name.trim().length > 0
    && isOptionalCount(value.scrobbles);
}

function isNamedTrack(value: unknown): value is WeeklyPulseTrack {
  return isRecord(value)
    && hasOnlyKeys(value, ['title', 'artist', 'scrobbles'])
    && typeof value.title === 'string'
    && value.title.trim().length > 0
    && typeof value.artist === 'string'
    && value.artist.trim().length > 0
    && isOptionalCount(value.scrobbles);
}

function normalizedName(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en');
}

function hasUniqueArtists(artists: WeeklyPulseArtist[]): boolean {
  const keys = artists.map(artist => normalizedName(artist.name));
  return new Set(keys).size === keys.length;
}

function hasUniqueTracks(tracks: WeeklyPulseTrack[]): boolean {
  const keys = tracks.map(track => `${normalizedName(track.artist)}\u0000${normalizedName(track.title)}`);
  return new Set(keys).size === keys.length;
}

export function isWeeklyPulseSummary(value: unknown): value is WeeklyPulseSummary {
  if (!isRecord(value) || !isRecord(value.counts)) return false;
  if (!hasOnlyKeys(value, [
    'captured_at',
    'period_start',
    'period_end',
    'source',
    'counts',
    'top_artists',
    'top_tracks',
    'limitations',
  ]) || !hasOnlyKeys(value.counts, ['scrobbles', 'artists', 'tracks', 'albums'])) {
    return false;
  }
  if (!isCapturedAt(value.captured_at)
    || !isIsoDate(value.period_start)
    || !isIsoDate(value.period_end)
    || value.period_end < value.period_start
    || !WEEKLY_SOURCES.has(value.source as WeeklyPulseSource)) {
    return false;
  }

  const { counts } = value;
  const scrobbleCount = counts.scrobbles;
  const artistCount = counts.artists;
  const trackCount = counts.tracks;
  const albumCount = counts.albums;
  if (!isCount(scrobbleCount)
    || !isCount(artistCount)
    || !isCount(trackCount)
    || !(albumCount === null || isCount(albumCount))) {
    return false;
  }

  if (!Array.isArray(value.top_artists)
    || value.top_artists.length > 10
    || !value.top_artists.every(isNamedArtist)) {
    return false;
  }
  if (!Array.isArray(value.top_tracks)
    || value.top_tracks.length > 10
    || !value.top_tracks.every(isNamedTrack)) {
    return false;
  }
  if (!Array.isArray(value.limitations)
    || !value.limitations.every(
      limitation => WEEKLY_LIMITATIONS.has(limitation as WeeklyPulseLimitation),
    )
    || new Set(value.limitations).size !== value.limitations.length) {
    return false;
  }

  const artists = value.top_artists as WeeklyPulseArtist[];
  const tracks = value.top_tracks as WeeklyPulseTrack[];
  const limitations = value.limitations as WeeklyPulseLimitation[];
  const listedCountsFitTotal = [...artists, ...tracks]
    .every(item => item.scrobbles === undefined || item.scrobbles <= scrobbleCount);

  return artists.length <= artistCount
    && tracks.length <= trackCount
    && hasUniqueArtists(artists)
    && hasUniqueTracks(tracks)
    && listedCountsFitTotal
    && value.captured_at.slice(0, 10) >= value.period_end
    && (albumCount !== null || limitations.includes('album_count_unavailable'))
    && (value.source !== 'lastfm_api' || limitations.includes('official_api_snapshot'));
}

export function resolveWeeklyPulseSummary(snapshot: PulseSnapshot): WeeklyPulseSummary | null {
  return isWeeklyPulseSummary(snapshot.weekly_summary)
    ? snapshot.weekly_summary
    : null;
}
