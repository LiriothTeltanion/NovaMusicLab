import type { MusicDnaData, PlatformPlay, SourceSummary, TopGenre } from '../types';

export interface SourceReconciliation {
  rawEvents: number;
  shortEvents: number;
  afterShort: number;
  duplicateEvents: number;
  afterDeduplication: number;
  adjustment: number;
  finalListens: number;
  reconcilesExactly: boolean;
}

const safeCount = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;

/**
 * Reconciles the raw source counters with the final listen count. Every step
 * comes from SourceSummary; `adjustment` remains visible when a legacy import
 * contains another filter instead of silently forcing the bridge to balance.
 */
export function buildSourceReconciliation(source: SourceSummary): SourceReconciliation {
  const rawEvents = [
    source.lastfm_plays,
    source.spotify_plays,
    source.youtube_plays,
    source.apple_music_plays,
    source.listenbrainz_plays,
  ].reduce((sum, value) => sum + safeCount(value), 0);
  const shortEvents = Math.min(rawEvents, safeCount(source.spotify_short_plays));
  const afterShort = Math.max(0, rawEvents - shortEvents);
  const duplicateEvents = Math.min(afterShort, safeCount(source.cross_source_duplicates));
  const afterDeduplication = Math.max(0, afterShort - duplicateEvents);
  const finalListens = safeCount(source.merged_plays);
  const adjustment = finalListens - afterDeduplication;

  return {
    rawEvents,
    shortEvents,
    afterShort,
    duplicateEvents,
    afterDeduplication,
    adjustment,
    finalListens,
    reconcilesExactly: adjustment === 0,
  };
}

export interface NormalizedPlatformRow extends PlatformPlay {
  share: number;
}

/** Converts verbose device signatures into stable, privacy-safe families. */
export function platformFamily(rawPlatform: string): string {
  const platform = rawPlatform.trim().toLowerCase();
  if (!platform) return 'Other';
  if (/android[-_ ]?tv|tizen|sony_tv|smart[ _-]?tv/.test(platform)) return 'Smart TV';
  if (/playstation|\bps4\b|\bscei\b/.test(platform)) return 'PlayStation';
  if (/chromecast|^cast$|google cast/.test(platform)) return 'Cast';
  if (/youtube.+takeout/.test(platform)) return 'YouTube import';
  if (/android[-_ ]?tablet|\btablet\b/.test(platform)) return 'Android tablet';
  if (/android/.test(platform)) return 'Android phone';
  if (/windows/.test(platform)) return 'Windows desktop';
  if (/iphone|\bios\b|ipad/.test(platform)) return 'Apple mobile';
  if (/macintosh|macos|mac os/.test(platform)) return 'Mac';
  if (/web|browser|chrome|firefox|safari/.test(platform)) return 'Web player';
  return 'Other';
}

/**
 * Aggregates every valid input row before selecting the visible top-N. Shares
 * therefore always use the complete platform denominator, including `Other`.
 */
export function normalizePlatformBreakdown(
  rows: readonly PlatformPlay[],
  topN = 6,
): { rows: NormalizedPlatformRow[]; totalPlays: number; familyCount: number } {
  const totals = new Map<string, number>();
  rows.forEach(({ platform, plays }) => {
    const count = safeCount(plays);
    if (!platform?.trim() || !count) return;
    const family = platformFamily(platform);
    totals.set(family, (totals.get(family) ?? 0) + count);
  });

  const sorted = [...totals.entries()]
    .map(([platform, plays]) => ({ platform, plays }))
    .sort((a, b) => b.plays - a.plays || a.platform.localeCompare(b.platform));
  const totalPlays = sorted.reduce((sum, row) => sum + row.plays, 0);
  const safeTopN = Math.max(1, topN);
  const visible = sorted.slice(0, safeTopN);
  const hiddenPlays = sorted.slice(safeTopN).reduce((sum, row) => sum + row.plays, 0);
  if (hiddenPlays > 0) visible.push({ platform: 'Other', plays: hiddenPlays });

  return {
    totalPlays,
    familyCount: sorted.length,
    rows: visible.map((row) => ({
      ...row,
      share: totalPlays ? Math.round((row.plays / totalPlays) * 1000) / 10 : 0,
    })),
  };
}

export interface GenreDistributionRow extends TopGenre {
  share: number;
}

/**
 * Builds one archive-wide genre distribution with an explicit denominator.
 * Missing classified plays become `Unclassified`; categories outside top-N
 * remain visible as `Other` instead of silently disappearing from the chart.
 */
export function buildGenreDistribution(
  rows: readonly TopGenre[],
  archiveTotal: number,
  topN = 8,
): {
  rows: GenreDistributionRow[];
  totalPlays: number;
  sourcePlays: number;
  sourceCoveragePct: number;
} {
  const totals = new Map<string, number>();
  rows.forEach(({ name, plays }) => {
    const count = safeCount(plays);
    if (!count) return;
    const genre = name.trim() || 'Unclassified';
    totals.set(genre, (totals.get(genre) ?? 0) + count);
  });

  const sourcePlays = [...totals.values()].reduce((sum, plays) => sum + plays, 0);
  const requestedTotal = safeCount(archiveTotal);
  const totalPlays = Math.max(requestedTotal, sourcePlays);
  if (sourcePlays < totalPlays) {
    totals.set('Unclassified', (totals.get('Unclassified') ?? 0) + totalPlays - sourcePlays);
  }

  const sorted = [...totals.entries()]
    .map(([name, plays]) => ({ name, plays }))
    .sort((left, right) => right.plays - left.plays || left.name.localeCompare(right.name));
  const visible = sorted.slice(0, Math.max(1, topN));
  const hiddenPlays = sorted.slice(Math.max(1, topN)).reduce((sum, row) => sum + row.plays, 0);
  if (hiddenPlays) visible.push({ name: 'Other', plays: hiddenPlays });

  return {
    totalPlays,
    sourcePlays,
    sourceCoveragePct: requestedTotal
      ? Math.round((sourcePlays / requestedTotal) * 1000) / 10
      : sourcePlays ? 100 : 0,
    rows: visible.map(row => ({
      ...row,
      share: totalPlays ? Math.round((row.plays / totalPlays) * 1000) / 10 : 0,
    })),
  };
}

export interface DatasetCoverage {
  maxDate: string | null;
  maxYear: number | null;
  isPartialYear: boolean;
}

/** Finds the last observed local calendar date without consulting wall time. */
export function getDatasetCoverage(data: Pick<MusicDnaData, 'daily_plays'>): DatasetCoverage {
  const dates = Object.keys(data.daily_plays ?? {})
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .filter((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)))
    .sort();
  const maxDate = dates.at(-1) ?? null;
  if (!maxDate) return { maxDate: null, maxYear: null, isPartialYear: false };
  const maxYear = Number(maxDate.slice(0, 4));
  return { maxDate, maxYear, isPartialYear: !maxDate.endsWith('-12-31') };
}
