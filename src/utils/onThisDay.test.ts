import { describe, expect, it } from 'vitest';

import type { ArtistFirstListen, Obsession } from '../types';
import {
  existsInYear,
  firstListensOnThisDay,
  formatCalendarDay,
  monthDayKey,
  obsessionsOnThisDay,
  playsOnThisDayByYear,
  shiftCalendarDay,
  upcomingFirstListens,
} from './onThisDay';

const firstListens: ArtistFirstListen[] = [
  { name: 'Synthetic Opener', first_date: '2015-03-05', plays: 40 },
  { name: 'Later Discovery', first_date: '2019-11-03', plays: 12 },
  { name: 'Same Day Bigger', first_date: '2019-11-03', plays: 90 },
  { name: 'Earlier Year', first_date: '2017-11-03', plays: 3 },
  { name: 'Two Days On', first_date: '2021-11-05', plays: 8 },
  { name: 'Broken Date', first_date: '2021-13-40', plays: 8 },
];

describe('on this day calendar helpers', () => {
  it('steps through days inside a leap reference year and wraps the year end', () => {
    expect(shiftCalendarDay({ month: 2, day: 28 }, 1)).toEqual({ month: 2, day: 29 });
    expect(shiftCalendarDay({ month: 2, day: 29 }, 1)).toEqual({ month: 3, day: 1 });
    expect(shiftCalendarDay({ month: 12, day: 31 }, 1)).toEqual({ month: 1, day: 1 });
    expect(shiftCalendarDay({ month: 1, day: 1 }, -1)).toEqual({ month: 12, day: 31 });
    expect(monthDayKey({ month: 3, day: 7 })).toBe('03-07');
    expect(existsInYear(2023, { month: 2, day: 29 })).toBe(false);
    expect(existsInYear(2024, { month: 2, day: 29 })).toBe(true);
  });

  it('reports observed zeros inside the archive and omits years outside it', () => {
    const daily = { '2015-11-03': 12, '2017-11-03': 4, '2018-11-02': 99 };
    const rows = playsOnThisDayByYear(daily, { month: 11, day: 3 }, '2015-03-01', '2018-08-06');

    // 2018-11-03 is after observedThrough, so it is not a zero.
    expect(rows).toEqual([
      { year: 2015, plays: 12 },
      { year: 2016, plays: 0 },
      { year: 2017, plays: 4 },
    ]);
    expect(playsOnThisDayByYear(undefined, { month: 11, day: 3 }, null, null)).toEqual([]);
  });

  it('skips 29 February in years that do not have it', () => {
    const rows = playsOnThisDayByYear({ '2024-02-29': 5 }, { month: 2, day: 29 }, '2023-01-01', '2025-12-31');
    expect(rows).toEqual([{ year: 2024, plays: 5 }]);
  });

  it('lists first listens by year, then by later plays, and ignores malformed dates', () => {
    const rows = firstListensOnThisDay(firstListens, { month: 11, day: 3 }, '2015-03-01');
    expect(rows.map(row => row.name)).toEqual(['Earlier Year', 'Same Day Bigger', 'Later Discovery']);
    expect(rows.every(row => !row.nearArchiveStart)).toBe(true);
    expect(firstListensOnThisDay(undefined, { month: 11, day: 3 })).toEqual([]);
  });

  it('flags first listens from the archive’s first month as possibly older', () => {
    const [row] = firstListensOnThisDay(firstListens, { month: 3, day: 5 }, '2015-03-01');
    expect(row).toMatchObject({ name: 'Synthetic Opener', year: 2015, nearArchiveStart: true });
  });

  it('offers the next anniversaries when a day has none of its own', () => {
    const upcoming = upcomingFirstListens(firstListens, { month: 11, day: 1 }, '2015-03-01');
    expect(upcoming.map(row => [row.name, row.daysAhead])).toEqual([
      ['Earlier Year', 2],
      ['Same Day Bigger', 2],
      ['Later Discovery', 2],
      ['Two Days On', 4],
    ]);
    expect(upcomingFirstListens(firstListens, { month: 11, day: 1 }, null, 7, 2)).toHaveLength(2);
  });

  it('matches curated repeat peaks on the calendar day across years', () => {
    const obsessions: Obsession[] = [
      { artist: 'A', track: 'One', date: '2021-11-03', count: 9 },
      { artist: 'B', track: 'Two', date: '2018-11-03', count: 12 },
      { artist: 'C', track: 'Three', date: '2018-11-04', count: 30 },
    ];
    expect(obsessionsOnThisDay(obsessions, { month: 11, day: 3 }).map(row => row.track)).toEqual(['Two', 'One']);
  });

  it('formats a day without a year in each locale', () => {
    expect(formatCalendarDay({ month: 11, day: 3 }, 'en-US')).toBe('November 3');
    expect(formatCalendarDay({ month: 11, day: 3 }, 'es-ES')).toBe('3 de noviembre');
  });
});
