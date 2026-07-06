import type { MusicDnaData, TopArtist } from '../types';
import { buildEmotionalMapEngineProfile, type EmotionalMapEngineProfile } from '../engines/emotionalEngine';

const MOOD_PROFILE_LIMIT = 24;
const MAX_SHARED_ARTISTS = 12;

function normalizeArtistName(name: string): string {
  return name.trim().toLowerCase();
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
}

/**
 * Compares the two full top_artists lists (not just the visible top-N), so
 * the overlap percentage reflects the real archive rather than a truncated
 * preview slice.
 */
export function compareArtistOverlap(a: MusicDnaData, b: MusicDnaData): ArtistOverlapResult {
  const mapA = new Map(a.top_artists.map(artist => [normalizeArtistName(artist.name), artist]));
  const mapB = new Map(b.top_artists.map(artist => [normalizeArtistName(artist.name), artist]));

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
