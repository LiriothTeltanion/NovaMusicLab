import type {
  CountryPlay,
  MonthlyActivity,
  MusicDnaData,
  RecordsSummary,
  SourceSummary,
  YearlyEra,
} from '../types';

function formatShort(date: Date, locale: string, opts: Intl.DateTimeFormatOptions): string {
  const raw = new Intl.DateTimeFormat(locale, opts).format(date).replace(/\.$/, '');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Locale-correct short month names (Jan..Dec / Ene..Dic), in calendar order. */
export function getMonthNames(locale: string): string[] {
  return Array.from({ length: 12 }, (_, i) => formatShort(new Date(2024, i, 1), locale, { month: 'short' }));
}

/** Locale-correct short weekday names, Monday-first (2024-01-01 was a Monday). */
export function getWeekdayNames(locale: string): string[] {
  return Array.from({ length: 7 }, (_, i) => formatShort(new Date(2024, 0, 1 + i), locale, { weekday: 'short' }));
}

export function formatNumber(value: number, locale = 'es-ES') {
  return Math.round(value || 0).toLocaleString(locale);
}

export function normalizeGenre(raw = ''): string {
  const g = raw.toLowerCase();
  if (g.includes('metalcore') || g.includes('deathcore')) return 'Metalcore';
  if (g.includes('post-hardcore') || g.includes('post hardcore')) return 'Post-Hardcore';
  if (g.includes('blackgaze') || g.includes('post-metal') || g.includes('shoegaze')) return 'Post-Metal / Blackgaze';
  if (g.includes('darksynth') || g.includes('synthwave') || g.includes('cyberpunk')) return 'Synthwave / Darksynth';
  if (g.includes('pop punk') || g.includes('emo pop')) return 'Pop Punk / Emo';
  if (g.includes('emo rap') || g.includes('melodic trap') || g.includes('trap')) return 'Emo Rap / Trap';
  if (g.includes('hard rock') || g.includes('glam') || g.includes('aor')) return 'Hard Rock';
  if (g.includes('progressive') || g.includes('djent') || g.includes('math rock')) return 'Progressive Metal';
  if (g.includes('ambient') || g.includes('lo-fi') || g.includes('dream pop')) return 'Ambient / Lo-Fi';
  if (g.includes('death metal') || g.includes('melodic death')) return 'Death Metal';
  if (g.includes('pop rock') || g.includes('indie pop') || g.includes('synth-pop')) return 'Pop / Indie';
  if (g.includes('israeli') || g.includes('hebrew')) return 'Israeli Rock';
  if (g.includes('hip hop') || g.includes('rap')) return 'Hip-Hop / Rap';
  if (g.includes('heavy metal') || g.includes('occult rock')) return 'Heavy Metal';
  if (g.includes('alternative rock') || g.includes('alt-rock')) return 'Alternative Rock';
  return raw ? 'Alternative' : 'Unclassified';
}

export function getPeakYear(data: MusicDnaData): YearlyEra | undefined {
  return data.yearly_eras.reduce<YearlyEra | undefined>(
    (best, era) => !best || era.plays > best.plays ? era : best,
    undefined,
  );
}

export function getTwoYearPeak(eras: YearlyEra[]) {
  if (eras.length === 0) return { label: 'N/A', plays: 0 };
  if (eras.length === 1) return { label: String(eras[0].year), plays: eras[0].plays };

  let best = { start: eras[0].year, end: eras[1].year, plays: eras[0].plays + eras[1].plays };
  for (let i = 1; i < eras.length - 1; i++) {
    const plays = eras[i].plays + eras[i + 1].plays;
    if (plays > best.plays) best = { start: eras[i].year, end: eras[i + 1].year, plays };
  }
  return { label: `${best.start}-${best.end}`, plays: best.plays };
}

export function getNightRatio(data: MusicDnaData) {
  let night = 0;
  let total = 0;
  for (let h = 0; h < 24; h++) {
    for (let w = 0; w < 7; w++) {
      const plays = data.heatmap[h]?.[w] ?? 0;
      total += plays;
      if (h < 6) night += plays;
    }
  }
  return total > 0 ? Math.round((night / total) * 100) : 0;
}

export function getPeakHour(data: MusicDnaData) {
  const totals = data.heatmap.map(row => row.reduce((sum, val) => sum + val, 0));
  const max = Math.max(...totals, 0);
  const hour = Math.max(0, totals.indexOf(max));
  return `${String(hour).padStart(2, '0')}:00`;
}

export function getWeekdayTotals(heatmap: number[][]): number[] {
  const totals = Array(7).fill(0);
  for (let h = 0; h < 24; h++) {
    for (let w = 0; w < 7; w++) totals[w] += heatmap[h]?.[w] ?? 0;
  }
  return totals;
}

export function getRecords(data: MusicDnaData): RecordsSummary {
  if (data.records) return data.records;

  const longestSession = [...data.sessions].sort((a, b) => b.duration_min - a.duration_min)[0];
  const bestSession = [...data.sessions].sort((a, b) => b.tracks_count - a.tracks_count)[0];
  return {
    longest_streak_days: 0,
    max_day_plays: 0,
    longest_session_minutes: longestSession?.duration_min ?? 0,
    longest_session_tracks: longestSession?.tracks_count ?? 0,
    longest_session_start: longestSession?.start,
    best_session_tracks: bestSession?.tracks_count ?? 0,
    best_session_start: bestSession?.start,
  };
}

const SEASONAL_WEIGHTS = [0.09,0.07,0.07,0.08,0.08,0.09,0.08,0.08,0.09,0.09,0.09,0.09];

export function buildMonthlyActivity(data: MusicDnaData): { estimated: boolean; rows: MonthlyActivity[] } {
  if (data.monthly_activity?.length) {
    return { estimated: false, rows: data.monthly_activity };
  }

  const rows: MonthlyActivity[] = [];
  data.yearly_eras.forEach(era => {
    const seed = era.year % 7;
    SEASONAL_WEIGHTS.forEach((weight, month) => {
      const variation = 1 + (((seed * 37 + month * 13) % 21) - 10) / 100;
      rows.push({ year: era.year, month, plays: Math.round(era.plays * weight * variation) });
    });
  });
  return { estimated: true, rows };
}

export function deriveSourceSummary(data: MusicDnaData): SourceSummary {
  if (data.source_summary) {
    return {
      ...data.source_summary,
      youtube_plays: data.source_summary.youtube_plays ?? 0,
      apple_music_plays: data.source_summary.apple_music_plays ?? 0,
      listenbrainz_plays: data.source_summary.listenbrainz_plays ?? 0,
    };
  }
  return {
    source_type: 'lastfm',
    lastfm_plays: data.core_metrics.total_plays,
    spotify_plays: 0,
    youtube_plays: 0,
    apple_music_plays: 0,
    listenbrainz_plays: 0,
    merged_plays: data.core_metrics.total_plays,
    spotify_skips: 0,
    spotify_skip_rate_pct: 0,
    spotify_short_plays: 0,
    spotify_short_play_rate_pct: 0,
    overlap_unique_tracks: 0,
    source_note: 'Bundled analysis dataset. Source comparison values may come from the original offline report.',
  };
}

export const SOURCE_TELEMETRY_FIELDS = [
  { id: 'spotify', field: 'spotify_plays' },
  { id: 'lastfm', field: 'lastfm_plays' },
  { id: 'youtube', field: 'youtube_plays' },
  { id: 'apple_music', field: 'apple_music_plays' },
  { id: 'listenbrainz', field: 'listenbrainz_plays' },
] as const;

export type SourceTelemetryId = (typeof SOURCE_TELEMETRY_FIELDS)[number]['id'];

export interface SourceTelemetrySegment {
  id: SourceTelemetryId;
  plays: number;
  /** Share of all raw inbound events, never of deduplicated listens. */
  sharePct: number;
}

function finiteNonNegative(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Produces source shares from one internally consistent basis: raw incoming
 * events. `SourceSummary` keeps source counts before countability filtering and
 * cross-source deduplication, whereas `merged_plays` is the final listen count.
 * Mixing those two bases can make a source appear to exceed 100%.
 */
export function getSourceTelemetry(summary: SourceSummary): {
  rawEvents: number;
  segments: SourceTelemetrySegment[];
} {
  const sourceCounts = SOURCE_TELEMETRY_FIELDS
    .map(({ id, field }) => ({ id, plays: finiteNonNegative(summary[field]) }))
    .filter((segment) => segment.plays > 0);
  const rawEvents = sourceCounts.reduce((sum, segment) => sum + segment.plays, 0);

  return {
    rawEvents,
    segments: sourceCounts.map((segment) => ({
      ...segment,
      sharePct: rawEvents ? Math.min(100, (segment.plays / rawEvents) * 100) : 0,
    })),
  };
}

export interface ArtistOriginGeography {
  countries: CountryPlay[];
  /** True when the dataset explicitly contains all-history origin aggregates. */
  isCompleteHistory: boolean;
  knownOriginPlays: number;
  unresolvedOriginPlays: number;
  coveragePct: number;
}

function aggregateCountryPlays(rows: readonly CountryPlay[]): CountryPlay[] {
  const counts = new Map<string, number>();
  rows.forEach(({ country, plays }) => {
    const normalizedCountry = country?.trim();
    const normalizedPlays = finiteNonNegative(plays);
    if (!normalizedCountry || normalizedCountry === 'Unknown' || !normalizedPlays) return;
    counts.set(normalizedCountry, (counts.get(normalizedCountry) ?? 0) + normalizedPlays);
  });

  return [...counts.entries()]
    .map(([country, plays]) => ({ country, plays }))
    .sort((a, b) => b.plays - a.plays || a.country.localeCompare(b.country));
}

/**
 * Gets artist-origin geography without conflating it with listener-location
 * telemetry. New datasets carry a precomputed full-history aggregate; legacy
 * archives gracefully fall back to their available top-artist list so they
 * remain viewable, while callers can label that reduced coverage accurately.
 */
export function getArtistOriginGeography(data: MusicDnaData): ArtistOriginGeography {
  const isCompleteHistory = Array.isArray(data.artist_origin_countries);
  const countries = aggregateCountryPlays(
    isCompleteHistory
      ? data.artist_origin_countries ?? []
      : data.top_artists.map(({ country, plays }) => ({ country, plays })),
  );
  const knownOriginPlays = countries.reduce((sum, country) => sum + country.plays, 0);
  const totalPlays = finiteNonNegative(data.core_metrics?.total_plays);
  const unresolvedOriginPlays = Math.max(0, totalPlays - knownOriginPlays);

  return {
    countries,
    isCompleteHistory,
    knownOriginPlays,
    unresolvedOriginPlays,
    coveragePct: totalPlays ? Math.min(100, (knownOriginPlays / totalPlays) * 100) : 0,
  };
}

export function countryCodeToName(code?: string) {
  const normalized = (code || '').trim().toUpperCase();
  const map: Record<string, string> = {
    AR: 'Argentina', AU: 'Australia', BR: 'Brazil', CA: 'Canada', CL: 'Chile',
    CO: 'Colombia', DE: 'Germany', DO: 'Dominican Republic', ES: 'Spain',
    FI: 'Finland', FR: 'France', GB: 'United Kingdom', IL: 'Israel',
    JP: 'Japan', MX: 'Mexico', NL: 'Netherlands', NO: 'Norway',
    NZ: 'New Zealand', PR: 'Puerto Rico', SE: 'Sweden', UK: 'United Kingdom',
    US: 'United States', UY: 'Uruguay', VE: 'Venezuela',
    RO: 'Romania',
    ZZ: 'Unknown',
    A1: 'Unknown',
    A2: 'Unknown',
  };
  return map[normalized] ?? (normalized || 'Unknown');
}

export function inferMoodCoordinates(genre = '', artist = '') {
  const g = normalizeGenre(genre).toLowerCase();
  const a = artist.toLowerCase();
  if (g.includes('blackgaze') || g.includes('post-metal') || a.includes('deafheaven')) {
    return { valence: 0.32, energy: 0.78, type: 'Cathartic melancholy' };
  }
  if (g.includes('synthwave') || g.includes('darksynth')) {
    return { valence: 0.56, energy: 0.72, type: 'Neon nostalgia' };
  }
  if (g.includes('metalcore') || g.includes('post-hardcore')) {
    return { valence: 0.42, energy: 0.88, type: 'Catharsis / force' };
  }
  if (g.includes('emo rap') || g.includes('trap')) {
    return { valence: 0.34, energy: 0.54, type: 'Lyrical introspection' };
  }
  if (g.includes('ambient') || g.includes('lo-fi')) {
    return { valence: 0.38, energy: 0.24, type: 'Focus / calm' };
  }
  if (g.includes('pop') || g.includes('hard rock')) {
    return { valence: 0.68, energy: 0.78, type: 'Dopamine / brightness' };
  }
  return { valence: 0.5, energy: 0.6, type: genre || 'Unclassified mood' };
}
