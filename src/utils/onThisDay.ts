/**
 * Pure calendar helpers for the On This Day room.
 *
 * Everything here works on local calendar keys (`YYYY-MM-DD`), the same keys
 * the parser writes into `daily_plays`, so a day never shifts across a time
 * zone boundary between compilation and display.
 */
import type { ArtistFirstListen, Obsession } from '../types';

export interface CalendarDay {
  /** 1-12 */
  month: number;
  /** 1-31 */
  day: number;
}

export interface YearOnThisDay {
  year: number;
  plays: number;
}

export interface FirstListenOnThisDay extends ArtistFirstListen {
  year: number;
  /** The first counted play falls in the archive's first 31 days, so it may predate the archive. */
  nearArchiveStart: boolean;
}

export interface UpcomingFirstListen extends FirstListenOnThisDay {
  /** Days after the selected day, 1-based. */
  daysAhead: number;
  calendarDay: CalendarDay;
}

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
// A leap reference year keeps 29 February reachable when stepping through days.
const REFERENCE_LEAP_YEAR = 2024;
const ARCHIVE_START_WINDOW_DAYS = 31;
const DAY_MS = 86_400_000;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function calendarDayOf(date: Date): CalendarDay {
  return { month: date.getMonth() + 1, day: date.getDate() };
}

export function monthDayKey({ month, day }: CalendarDay): string {
  return `${pad(month)}-${pad(day)}`;
}

export function dateKeyFor(year: number, calendarDay: CalendarDay): string {
  return `${year}-${monthDayKey(calendarDay)}`;
}

export function parseDateKey(key: string): { year: number; month: number; day: number } | null {
  const match = DATE_KEY.exec(key);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
}

/** True when the calendar day exists in that year (29 February only in leap years). */
export function existsInYear(year: number, { month, day }: CalendarDay): boolean {
  return parseDateKey(`${year}-${pad(month)}-${pad(day)}`) !== null;
}

export function shiftCalendarDay(calendarDay: CalendarDay, delta: number): CalendarDay {
  const yearStart = Date.UTC(REFERENCE_LEAP_YEAR, 0, 1);
  const dayOfYear = Math.round(
    (Date.UTC(REFERENCE_LEAP_YEAR, calendarDay.month - 1, calendarDay.day) - yearStart) / DAY_MS,
  );
  // Wrap within the 366 days of the leap reference year (31 Dec -> 1 Jan).
  const wrapped = (((dayOfYear + delta) % 366) + 366) % 366;
  const shifted = new Date(yearStart + wrapped * DAY_MS);
  return { month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

function daysBetween(fromKey: string, toKey: string): number | null {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  if (!from || !to) return null;
  return Math.round(
    (Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / DAY_MS,
  );
}

/**
 * Plays on this calendar day for every year the archive actually observed.
 * A year whose date falls outside the observed period is omitted rather than
 * reported as zero; inside the period, a missing key is an observed zero.
 */
export function playsOnThisDayByYear(
  dailyPlays: Record<string, number> | undefined,
  calendarDay: CalendarDay,
  observedFrom: string | null | undefined,
  observedThrough: string | null | undefined,
): YearOnThisDay[] {
  if (!dailyPlays) return [];
  const keys = Object.keys(dailyPlays).filter(key => parseDateKey(key)).sort();
  const from = observedFrom && parseDateKey(observedFrom) ? observedFrom : keys[0];
  const through = observedThrough && parseDateKey(observedThrough) ? observedThrough : keys.at(-1);
  if (!from || !through) return [];

  const firstYear = Number(from.slice(0, 4));
  const lastYear = Number(through.slice(0, 4));
  const rows: YearOnThisDay[] = [];
  for (let year = firstYear; year <= lastYear; year += 1) {
    if (!existsInYear(year, calendarDay)) continue;
    const key = dateKeyFor(year, calendarDay);
    if (key < from || key > through) continue;
    rows.push({ year, plays: dailyPlays[key] ?? 0 });
  }
  return rows;
}

function toFirstListen(entry: ArtistFirstListen, observedFrom: string | null | undefined): FirstListenOnThisDay {
  const sinceStart = observedFrom ? daysBetween(observedFrom, entry.first_date) : null;
  return {
    ...entry,
    year: Number(entry.first_date.slice(0, 4)),
    nearArchiveStart: sinceStart !== null && sinceStart < ARCHIVE_START_WINDOW_DAYS,
  };
}

function byYearThenPlays(left: FirstListenOnThisDay, right: FirstListenOnThisDay) {
  return left.year - right.year || right.plays - left.plays || left.name.localeCompare(right.name, 'en');
}

export function firstListensOnThisDay(
  firstListens: readonly ArtistFirstListen[] | undefined,
  calendarDay: CalendarDay,
  observedFrom?: string | null,
): FirstListenOnThisDay[] {
  if (!firstListens) return [];
  const suffix = `-${monthDayKey(calendarDay)}`;
  return firstListens
    .filter(entry => parseDateKey(entry.first_date) && entry.first_date.endsWith(suffix))
    .map(entry => toFirstListen(entry, observedFrom))
    .sort(byYearThenPlays);
}

/** The next anniversaries after the selected day, for days that have none of their own. */
export function upcomingFirstListens(
  firstListens: readonly ArtistFirstListen[] | undefined,
  calendarDay: CalendarDay,
  observedFrom?: string | null,
  windowDays = 7,
  limit = 6,
): UpcomingFirstListen[] {
  if (!firstListens?.length) return [];
  const upcoming: UpcomingFirstListen[] = [];
  for (let offset = 1; offset <= windowDays && upcoming.length < limit; offset += 1) {
    const day = shiftCalendarDay(calendarDay, offset);
    for (const entry of firstListensOnThisDay(firstListens, day, observedFrom)) {
      if (upcoming.length >= limit) break;
      upcoming.push({ ...entry, daysAhead: offset, calendarDay: day });
    }
  }
  return upcoming;
}

export function obsessionsOnThisDay(
  obsessions: readonly Obsession[] | undefined,
  calendarDay: CalendarDay,
): Obsession[] {
  if (!obsessions) return [];
  const suffix = `-${monthDayKey(calendarDay)}`;
  return obsessions
    .filter(obsession => obsession.date.slice(0, 10).endsWith(suffix))
    .sort((left, right) => left.date.localeCompare(right.date) || right.count - left.count);
}

/** Formats a calendar day without a year, e.g. "3 November" / "November 3". */
export function formatCalendarDay(calendarDay: CalendarDay, locale: string): string {
  return new Date(Date.UTC(REFERENCE_LEAP_YEAR, calendarDay.month - 1, calendarDay.day))
    .toLocaleDateString(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' });
}
