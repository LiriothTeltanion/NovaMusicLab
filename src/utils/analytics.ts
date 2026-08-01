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
  // Honesty first: an unknown artist must NEVER be relabeled "Alternative" -
  // the old fallback did exactly that and silently painted ~40K unresolved
  // long-tail plays as Alternative in top_genres and the treemap.
  if (!raw || g.includes('unclassified') || g === 'unknown') return 'Unclassified';

  if (g.includes('metalcore') || g.includes('deathcore')) return 'Metalcore';
  if (
    g.includes('post-hardcore') || g.includes('post hardcore')
    || g.includes('screamo') || g.includes('emocore')
  ) return 'Post-Hardcore';
  if (g.includes('blackgaze') || g.includes('post-metal') || g.includes('shoegaze')) return 'Post-Metal / Blackgaze';
  if (g.includes('darksynth') || g.includes('synthwave') || g.includes('cyberpunk')) return 'Synthwave / Darksynth';
  if (g.includes('pop punk') || g.includes('emo pop')) return 'Pop Punk / Emo';
  if (g.includes('emo rap') || g.includes('melodic trap') || g.includes('trap')) return 'Emo Rap / Trap';
  // Fine-grained metal families (real archive strings: Helloween/Enforcer/
  // Saurom/Lost Society entered the top-100 with the honest-data recompile).
  if (g.includes('folk metal') || g.includes('juglar')) return 'Folk Metal';
  if (g.includes('power metal') || g.includes('speed metal') || g.includes('thrash')) return 'Power / Speed Metal';
  if (g.includes('alt-metal') || g.includes('alt metal') || g.includes('nu metal') || g.includes('emo groove')) return 'Alt-Metal';
  if (g.includes('hard rock') || g.includes('glam') || g.includes('aor') || g.includes('sleaze')) return 'Hard Rock';
  // Ahead of the progressive-metal branch, which matches bare 'progressive' and
  // was therefore filing Pink Floyd-shaped records under Progressive Metal.
  if (g.includes('progressive rock') || g.includes('prog rock')) return 'Progressive Rock';
  if (g.includes('progressive') || g.includes('djent') || g.includes('math rock')) return 'Progressive Metal';
  if (
    g.includes('ambient') || g.includes('lo-fi') || g.includes('dream pop')
    || g.includes('dreampop') || g.includes('new age')
  ) return 'Ambient / Lo-Fi';
  if (g.includes('death metal') || g.includes('melodic death')) return 'Death Metal';
  if (g.includes('pop rock') || g.includes('indie pop') || g.includes('synth-pop') || g.includes('synthpop')) return 'Pop / Indie';
  if (g.includes('israeli') || g.includes('hebrew')) return 'Israeli Rock';
  // Regional and scene identity outrank the generic word that follows it:
  // "Reggaeton / Latin Hip-Hop" and "K-Pop / Hip-Hop" are not Hip-Hop records,
  // so both are decided before the hip-hop rule gets to claim them.
  if (
    g.includes('reggaeton') || g.includes('latin') || g.includes('corridos')
    || g.includes('regional mexican') || g.includes('flamenco') || g.includes('en español')
    || g.includes('venezolano') || g.includes('cumbia') || g.includes('salsa')
    || g.includes('bachata') || g.includes('rumba')
  ) return 'Latin';
  if (
    g.includes('k-pop') || g.includes('kpop') || g.includes('j-pop') || g.includes('jpop')
    || g.includes('visual kei') || g.includes('kawaii metal')
  ) return 'K-Pop / J-Pop';
  // 'hip-hop' as well as 'hip hop'. The hyphenated spelling is the one
  // artist_meta.json actually uses, so every curated "Hip-Hop / ..." label was
  // missing this branch and falling through to the Alternative bucket.
  if (
    g.includes('hip hop') || g.includes('hip-hop') || g.includes('rap')
    || g.includes('grime') || g.includes('drill') || g.includes('horrorcore')
  ) return 'Hip-Hop / Rap';
  if (g.includes('heavy metal') || g.includes('occult rock') || g.includes('nwobhm')) return 'Heavy Metal';
  if (g.includes('alternative rock') || g.includes('alt-rock')) return 'Alternative Rock';

  // Everything below rescues labels that used to fall off the end of this
  // chain. 122 hand-curated artists - a quarter of artist_meta.json, 3,199
  // plays - were being shown as "Alternative" despite carrying a precise
  // genre: Reggaeton, K-Pop, Gothic Metal, Corridos Tumbados, EDM, Post-Rock.
  // Ordering is the whole design here, so each rule sits after anything more
  // specific that could legitimately claim the same string.
  // Deezer's coarse vocabulary arrives here as whole labels. Without homes of
  // their own these landed on Alternative: "Films/Games" alone was 292 plays
  // across 54 artists, and bare "Dance" another 94 artists.
  if (
    g.includes('films/games') || g.includes('soundtrack') || g.includes('video game')
    || g.includes('film score') || g.includes('original score')
  ) return 'Soundtrack / Score';
  // Regional catalogues the archive only brushes against. Grouped honestly as
  // regional rather than dissolved into Alternative, which would claim a genre
  // nobody established.
  if (
    g.includes('african') || g.includes('asian music') || g.includes('indian music')
    || g.includes('afrobeat') || g.includes('reggae') || g.includes('world music')
  ) return 'World / Regional';
  if (g.includes('brazilian') || g.includes('mariachi')) return 'Latin';
  // Whole-label equality, not includes: 'dance' as a substring would swallow
  // "Pop / Dance Pop", which is a pop record.
  if (g === 'dance' || g === 'club / dance') return 'Electronic / EDM';
  if (g.includes('grindcore') || g.includes('powerviolence')) return 'Death Metal';
  if (g.includes('aggrotech')) return 'Gothic / Industrial';
  if (g.includes('black metal')) return 'Black Metal';
  // Late on purpose. Putting these next to the other alt-metal spellings looked
  // tidier and silently stole six records whose primary genre was something
  // else - "Melodic Death Metal / Alternative Metal" became Alt-Metal, and
  // "Alternative Rock / Post-Grunge" stopped being Alternative Rock. Down here,
  // the more specific families have already had their turn.
  if (g.includes('alternative metal') || g.includes('grunge')) return 'Alt-Metal';
  if (
    g.includes('symphonic metal') || g.includes('gothic metal')
    || g.includes('doom metal') || g.includes('sludge')
  ) return 'Symphonic / Gothic Metal';
  if (
    g.includes('gothic') || g.includes('industrial') || g.includes('darkwave')
    || g.includes('dark wave') || g.includes('neue deutsche') || g.includes('noise rock')
  ) return 'Gothic / Industrial';
  if (
    g.includes('post-rock') || g.includes('post rock')
    || g.includes('instrumental rock') || g.includes('cinematic rock')
  ) return 'Post-Rock';
  if (g.includes('punk') || g.includes('new wave') || g.includes('ska')) return 'Punk / New Wave';
  if (
    g.includes('r&b') || g.includes('neo soul') || g.includes('soul')
    || g.includes('motown') || g.includes('funk')
  ) return 'R&B / Soul';
  // 'uk garage', never bare 'garage': "Garage Rock / Blues Rock" is a rock
  // record and would otherwise be filed under electronic music.
  if (
    g.includes('edm') || g.includes('electro') || g.includes('house')
    || g.includes('techno') || g.includes('trance') || g.includes('dubstep')
    || g.includes('drum and bass') || g.includes('drum & bass') || g.includes('future bass')
    || g.includes('idm') || g.includes('downtempo') || g.includes('trip hop')
    || g.includes('chillwave') || g.includes('hyperpop') || g.includes('phonk')
    || g.includes('digicore') || g.includes('breakbeat') || g.includes('uk garage')
    || g.includes('alternative dance') || g.includes('balearic') || g.includes('dreamwave')
    || g.includes('vaporwave') || g.includes('chiptune') || g.includes('jungle')
    || g.includes('complextro') || g.includes('hardbass') || g.includes('melodic bass')
  ) return 'Electronic / EDM';
  if (g.includes('jazz') || g.includes('bebop') || g.includes('swing')) return 'Jazz';
  // 'chamber music', never bare 'chamber': chamber pop is an indie label.
  if (
    g.includes('classical') || g.includes('orchestral') || g.includes('opera')
    || g.includes('chamber music') || g.includes('concerto') || g.includes('sonata')
    || g.includes('symphony') || g.includes('minimalism') || g.includes('neoclassic')
  ) return 'Classical / Orchestral';
  if (
    g.includes('indie') || g.includes('britpop') || g.includes('art pop')
    || g.includes('art rock') || g.includes('psychedelic') || g.includes('slacker')
    || g.includes('pop')
  ) return 'Pop / Indie';
  if (
    g.includes('folk') || g.includes('country') || g.includes('singer-songwriter')
    || g.includes('bluegrass') || g.includes('americana')
  ) return 'Folk / Country';
  // Bare "emo", matched on a word boundary so it cannot fire inside "demo" or
  // "emotional". It sits here rather than beside 'emo pop' because the earlier
  // rules for "emo rap" and "emo groove" must keep first claim on those.
  if (/\bemo\b/.test(g) || g.includes('easycore')) return 'Pop Punk / Emo';
  if (g.includes('metal')) return 'Heavy Metal';
  if (g.includes('rock')) return 'Rock';
  // After the rock branch, deliberately: "Blues Rock" is a rock record, while
  // bare "Blues" and "Electric Blues" belong with the roots families.
  if (g.includes('blues')) return 'Folk / Country';
  return 'Alternative';
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
