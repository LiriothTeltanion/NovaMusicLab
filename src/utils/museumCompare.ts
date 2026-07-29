import type { MusicDnaData, TopArtist } from '../types';
import { buildEmotionalMapEngineProfile, type EmotionalMapEngineProfile } from '../engines/emotionalEngine';
import { normalizeCatalogName } from './catalogName';

const MOOD_PROFILE_LIMIT = 24;
const MAX_SHARED_ARTISTS = 12;

function comparisonArtists(data: MusicDnaData): TopArtist[] {
  if (data.artist_genre_catalog?.length) {
    return data.artist_genre_catalog.map(artist => ({
      name: artist.name,
      plays: artist.plays,
      genre: artist.automaticGenre,
      country: artist.country,
    }));
  }
  return data.top_artists;
}

function buildArtistMap(data: MusicDnaData): Map<string, TopArtist> {
  const artists = new Map<string, TopArtist>();
  for (const artist of comparisonArtists(data)) {
    const key = normalizeCatalogName(artist.name);
    if (!key) continue;
    const current = artists.get(key);
    artists.set(key, current
      ? { ...current, plays: current.plays + artist.plays }
      : artist);
  }
  return artists;
}

function comparisonScope(
  data: MusicDnaData,
  normalizedIdentityCount: number,
): ArtistComparisonScope {
  const sourceArtistCount = comparisonArtists(data).length;
  return {
    comparedArtists: normalizedIdentityCount,
    archiveArtists: data.core_metrics.unique_artists,
    // Normalization can deliberately merge spelling, case and accent variants.
    // Completeness therefore describes source-catalog coverage, not whether the
    // normalized identity count still equals the raw unique-artist metric.
    complete: sourceArtistCount >= data.core_metrics.unique_artists,
  };
}

export interface SharedArtist {
  name: string;
  playsA: number;
  playsB: number;
}

export interface ArtistOverlapResult {
  shared: SharedArtist[];
  sharedCount: number;
  onlyA: TopArtist[];
  onlyB: TopArtist[];
  /** shared / (unique artists in A ∪ B) * 100, rounded to 1 decimal. */
  overlapPct: number;
  scopeA: ArtistComparisonScope;
  scopeB: ArtistComparisonScope;
}

export interface ArtistComparisonScope {
  comparedArtists: number;
  archiveArtists: number;
  complete: boolean;
}

/**
 * Uses the archive-wide artist catalog when present. Older/imported datasets
 * without that catalog fall back to `top_artists`, and the returned scope makes
 * that limitation visible to the UI instead of presenting a partial overlap as
 * a full-archive comparison.
 */
export function compareArtistOverlap(a: MusicDnaData, b: MusicDnaData): ArtistOverlapResult {
  const mapA = buildArtistMap(a);
  const mapB = buildArtistMap(b);

  const shared: SharedArtist[] = [];
  const onlyA: TopArtist[] = [];
  const onlyB: TopArtist[] = [];

  mapA.forEach((artistA, key) => {
    const artistB = mapB.get(key);
    if (artistB) {
      shared.push({ name: artistA.name, playsA: artistA.plays, playsB: artistB.plays });
    } else {
      onlyA.push(artistA);
    }
  });
  mapB.forEach((artistB, key) => {
    if (!mapA.has(key)) onlyB.push(artistB);
  });

  shared.sort((x, y) => (y.playsA + y.playsB) - (x.playsA + x.playsB));
  onlyA.sort((x, y) => y.plays - x.plays);
  onlyB.sort((x, y) => y.plays - x.plays);

  const unionSize = mapA.size + mapB.size - shared.length;
  const overlapPct = unionSize > 0 ? Math.round((shared.length / unionSize) * 1000) / 10 : 0;

  return {
    shared: shared.slice(0, MAX_SHARED_ARTISTS),
    sharedCount: shared.length,
    onlyA,
    onlyB,
    overlapPct,
    scopeA: comparisonScope(a, mapA.size),
    scopeB: comparisonScope(b, mapB.size),
  };
}

export type CoreMetricKey = 'total_plays' | 'unique_artists' | 'unique_tracks' | 'listening_hours' | 'active_days';

export interface CoreMetricComparison {
  key: CoreMetricKey;
  a: number;
  b: number;
  /** (b - a) / a * 100; null when a is 0 (division would be meaningless). */
  diffPct: number | null;
}

const CORE_METRIC_KEYS: CoreMetricKey[] = ['total_plays', 'unique_artists', 'unique_tracks', 'listening_hours', 'active_days'];

export function compareCoreMetrics(a: MusicDnaData, b: MusicDnaData): CoreMetricComparison[] {
  return CORE_METRIC_KEYS.map(key => {
    const valueA = a.core_metrics[key];
    const valueB = b.core_metrics[key];
    return {
      key,
      a: valueA,
      b: valueB,
      diffPct: valueA > 0 ? Math.round(((valueB - valueA) / valueA) * 1000) / 10 : null,
    };
  });
}

export interface MoodComparisonResult {
  profileA: EmotionalMapEngineProfile;
  profileB: EmotionalMapEngineProfile;
  sameDominantMood: boolean;
}

export function compareMoodProfiles(a: MusicDnaData, b: MusicDnaData): MoodComparisonResult {
  const profileA = buildEmotionalMapEngineProfile(a.top_artists, MOOD_PROFILE_LIMIT);
  const profileB = buildEmotionalMapEngineProfile(b.top_artists, MOOD_PROFILE_LIMIT);
  return {
    profileA,
    profileB,
    sameDominantMood: profileA.dominantMood.key === profileB.dominantMood.key,
  };
}
