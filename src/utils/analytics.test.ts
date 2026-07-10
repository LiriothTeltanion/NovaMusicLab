import { describe, expect, it } from 'vitest';
import {
  buildMonthlyActivity,
  countryCodeToName,
  formatNumber,
  getMonthNames,
  getNightRatio,
  getRecords,
  getTwoYearPeak,
  normalizeGenre,
} from './analytics';
import type { MusicDnaData, YearlyEra } from '../types';

describe('normalizeGenre', () => {
  // The cascade is ordered substring matching - these cases lock the ordering
  // so a reordered/added branch can't silently reclassify genres app-wide.
  it('classifies overlapping substrings by the intended branch', () => {
    expect(normalizeGenre('Post-Hardcore / Soul')).toBe('Post-Hardcore');
    expect(normalizeGenre('Metalcore / Alternative')).toBe('Metalcore');
    expect(normalizeGenre('Blackgaze / Post-Metal')).toBe('Post-Metal / Blackgaze');
    expect(normalizeGenre('Melodic Death Metal / Doom Metal')).toBe('Death Metal');
    expect(normalizeGenre('Hard Rock / Glam Metal')).toBe('Hard Rock');
    expect(normalizeGenre('Progressive Metal / Djent')).toBe('Progressive Metal');
    expect(normalizeGenre('Israeli Rock / Metal')).toBe('Israeli Rock');
  });

  it('falls back honestly instead of inventing a class', () => {
    expect(normalizeGenre('Something Totally New')).toBe('Alternative');
    expect(normalizeGenre('')).toBe('Unclassified');
    expect(normalizeGenre()).toBe('Unclassified');
  });
});

describe('getTwoYearPeak', () => {
  const era = (year: number, plays: number) => ({ year, plays } as YearlyEra);

  it('handles empty and single-era inputs', () => {
    expect(getTwoYearPeak([])).toEqual({ label: 'N/A', plays: 0 });
    expect(getTwoYearPeak([era(2021, 500)])).toEqual({ label: '2021', plays: 500 });
  });

  it('finds the best consecutive-year window', () => {
    const eras = [era(2019, 100), era(2020, 900), era(2021, 800), era(2022, 50)];
    expect(getTwoYearPeak(eras)).toEqual({ label: '2020-2021', plays: 1700 });
  });
});

describe('buildMonthlyActivity', () => {
  it('passes through real monthly data unmodified, flagged as measured', () => {
    const data = {
      monthly_activity: [{ year: 2021, month: 0, plays: 42 }],
      yearly_eras: [],
    } as unknown as MusicDnaData;
    const result = buildMonthlyActivity(data);
    expect(result.estimated).toBe(false);
    expect(result.rows).toEqual([{ year: 2021, month: 0, plays: 42 }]);
  });

  it('flags fabricated estimates and keeps the formula deterministic', () => {
    const data = {
      monthly_activity: undefined,
      yearly_eras: [{ year: 2021, plays: 12000 }],
    } as unknown as MusicDnaData;
    const a = buildMonthlyActivity(data);
    const b = buildMonthlyActivity(data);
    expect(a.estimated).toBe(true);
    expect(a.rows).toHaveLength(12);
    // Deterministic: same input must always produce the same estimated rows.
    expect(a.rows).toEqual(b.rows);
    // Sanity: estimates stay in the same order of magnitude as the year total.
    const total = a.rows.reduce((sum, r) => sum + r.plays, 0);
    expect(total).toBeGreaterThan(12000 * 0.8);
    expect(total).toBeLessThan(12000 * 1.2);
  });
});

describe('getRecords', () => {
  it('prefers precomputed records when present', () => {
    const data = {
      records: { longest_streak_days: 68, max_day_plays: 350 },
      sessions: [],
    } as unknown as MusicDnaData;
    expect(getRecords(data).longest_streak_days).toBe(68);
  });

  it('falls back to session-derived values with honest zeros for unknowables', () => {
    const data = {
      records: undefined,
      sessions: [
        { duration_min: 120, tracks_count: 30, start: '2021-01-01T10:00:00Z' },
        { duration_min: 300, tracks_count: 20, start: '2021-02-01T10:00:00Z' },
      ],
    } as unknown as MusicDnaData;
    const records = getRecords(data);
    expect(records.longest_session_minutes).toBe(300);
    expect(records.best_session_tracks).toBe(30);
    // Streak/max-day can't be derived from sessions alone - must stay 0, not guessed.
    expect(records.longest_streak_days).toBe(0);
    expect(records.max_day_plays).toBe(0);
  });
});

describe('getNightRatio', () => {
  it('computes the 00-05h share of a heatmap', () => {
    const heatmap = Array.from({ length: 24 }, () => Array(7).fill(0));
    heatmap[2][0] = 30; // night
    heatmap[14][0] = 70; // afternoon
    const data = { heatmap } as unknown as MusicDnaData;
    expect(getNightRatio(data)).toBe(30);
  });

  it('returns 0 for an empty heatmap instead of NaN', () => {
    const data = { heatmap: Array.from({ length: 24 }, () => Array(7).fill(0)) } as unknown as MusicDnaData;
    expect(getNightRatio(data)).toBe(0);
  });
});

describe('countryCodeToName', () => {
  it('maps known codes and passes through unknowns honestly', () => {
    expect(countryCodeToName('IL')).toBe('Israel');
    expect(countryCodeToName('RO')).toBe('Romania');
    expect(countryCodeToName('ZZ')).toBe('Unknown'); // anonymized-proxy pseudo-code
    expect(countryCodeToName('')).toBe('Unknown');
    expect(countryCodeToName(undefined)).toBe('Unknown');
    expect(countryCodeToName('XQ')).toBe('XQ'); // unmapped real-looking code passes through
  });
});

describe('locale helpers', () => {
  it('produces 12 month names in calendar order for both locales', () => {
    expect(getMonthNames('en-US')).toHaveLength(12);
    expect(getMonthNames('es-ES')).toHaveLength(12);
    expect(getMonthNames('en-US')[0].toLowerCase()).toContain('jan');
  });

  it('formats numbers per locale', () => {
    expect(formatNumber(1234.6, 'en-US')).toBe('1,235');
  });
});
