import type { MusicDnaData } from '../types';

export const ANALYSIS_TIME_ZONE = 'Asia/Jerusalem';

export type LatestPeriodStatus = 'complete' | 'ytd' | 'partial' | 'unknown';

export interface DatasetTemporalTrust {
  analysisTimeZone: string;
  currentDate: string;
  dataMinDate: string | null;
  dataMaxDate: string | null;
  latestYear: number | null;
  latestPeriodStatus: LatestPeriodStatus;
  latestPeriodComplete: boolean;
  hasDailyResolution: boolean;
  activeDays: number;
  dailyPlayTotal: number;
  monthlyPlayTotal: number;
  yearlyPlayTotal: number;
  top100Plays: number;
  outsideTop100Plays: number;
  top100CoveragePct: number;
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDateKey(value: string): boolean {
  if (!DATE_KEY_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

/** A stable YYYY-MM-DD key in the timezone used by the archive analysis. */
export function dateKeyInTimeZone(
  date = new Date(),
  timeZone = ANALYSIS_TIME_ZONE,
): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function finitePlayCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * Derives trust metadata from aggregates already present in the dataset.
 * Exact date bounds come only from daily keys; month/year rows are deliberately
 * not converted into invented first/last dates.
 */
export function deriveDatasetTemporalTrust(
  data: MusicDnaData,
  options: { now?: Date; timeZone?: string } = {},
): DatasetTemporalTrust {
  const analysisTimeZone = options.timeZone ?? ANALYSIS_TIME_ZONE;
  const currentDate = dateKeyInTimeZone(options.now ?? new Date(), analysisTimeZone);
  const dailyEntries = Object.entries(data.daily_plays ?? {})
    .filter(([dateKey, plays]) => isCalendarDateKey(dateKey) && finitePlayCount(plays) === plays)
    .sort(([left], [right]) => left.localeCompare(right));
  const dataMinDate = dailyEntries[0]?.[0] ?? null;
  const dataMaxDate = dailyEntries.at(-1)?.[0] ?? null;
  const fallbackLatestYear = data.yearly_eras.length
    ? Math.max(...data.yearly_eras.map(era => era.year))
    : null;
  const latestYear = dataMaxDate ? Number(dataMaxDate.slice(0, 4)) : fallbackLatestYear;
  const latestPeriodComplete = Boolean(
    dataMaxDate && latestYear && dataMaxDate === `${latestYear}-12-31`,
  );

  let latestPeriodStatus: LatestPeriodStatus = 'unknown';
  if (dataMaxDate && latestYear) {
    if (latestPeriodComplete) latestPeriodStatus = 'complete';
    else if (latestYear === Number(currentDate.slice(0, 4))) latestPeriodStatus = 'ytd';
    else latestPeriodStatus = 'partial';
  }

  const dailyPlayTotal = dailyEntries.reduce((sum, [, plays]) => sum + finitePlayCount(plays), 0);
  const top100Plays = data.top_artists.slice(0, 100)
    .reduce((sum, artist) => sum + finitePlayCount(artist.plays), 0);
  const totalPlays = finitePlayCount(data.core_metrics.total_plays);

  return {
    analysisTimeZone,
    currentDate,
    dataMinDate,
    dataMaxDate,
    latestYear,
    latestPeriodStatus,
    latestPeriodComplete,
    hasDailyResolution: dailyEntries.length > 0,
    activeDays: dailyEntries.filter(([, plays]) => finitePlayCount(plays) > 0).length,
    dailyPlayTotal,
    monthlyPlayTotal: (data.monthly_activity ?? [])
      .reduce((sum, row) => sum + finitePlayCount(row.plays), 0),
    yearlyPlayTotal: data.yearly_eras
      .reduce((sum, row) => sum + finitePlayCount(row.plays), 0),
    top100Plays,
    outsideTop100Plays: Math.max(0, totalPlays - top100Plays),
    top100CoveragePct: totalPlays
      ? Math.round((top100Plays / totalPlays) * 1000) / 10
      : 0,
  };
}

/** Missing daily keys inside this range mean an observed zero; outside it is unknown. */
export function isDateObserved(
  dateKey: string,
  trust: Pick<DatasetTemporalTrust, 'dataMinDate' | 'dataMaxDate'>,
): boolean {
  if (!trust.dataMinDate || !trust.dataMaxDate) return true;
  return dateKey >= trust.dataMinDate && dateKey <= trust.dataMaxDate;
}
