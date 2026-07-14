import { describe, expect, it } from 'vitest';
import compiledData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import {
  ANALYSIS_TIME_ZONE,
  dateKeyInTimeZone,
  deriveDatasetTemporalTrust,
  isDateObserved,
} from './dataTrust';

const baseData = compiledData as unknown as MusicDnaData;
const eraTemplate = baseData.yearly_eras[0];
const data: MusicDnaData = {
  ...baseData,
  core_metrics: {
    ...baseData.core_metrics,
    total_plays: 10,
    unique_artists: 2,
    active_days: 2,
  },
  top_artists: [
    { name: 'Artist A', plays: 3, genre: 'Rock', country: 'Israel' },
    { name: 'Artist B', plays: 2, genre: 'Pop', country: 'USA' },
  ],
  daily_plays: {
    '2015-03-01': 4,
    '2026-07-03': 6,
  },
  monthly_activity: [
    { year: 2015, month: 2, plays: 4 },
    { year: 2026, month: 6, plays: 6 },
  ],
  yearly_eras: [
    { ...eraTemplate, year: 2015, plays: 4 },
    { ...eraTemplate, year: 2026, plays: 6 },
  ],
};

describe('dataset temporal trust', () => {
  it('derives exact archive bounds and coverage from the bundled daily data', () => {
    const trust = deriveDatasetTemporalTrust(data, {
      now: new Date('2026-07-13T12:00:00Z'),
    });

    expect(trust).toMatchObject({
      analysisTimeZone: ANALYSIS_TIME_ZONE,
      currentDate: '2026-07-13',
      dataMinDate: '2015-03-01',
      dataMaxDate: '2026-07-03',
      latestYear: 2026,
      latestPeriodStatus: 'ytd',
      latestPeriodComplete: false,
      activeDays: 2,
      dailyPlayTotal: 10,
      monthlyPlayTotal: 10,
      yearlyPlayTotal: 10,
      top100Plays: 5,
      outsideTop100Plays: 5,
      top100CoveragePct: 50,
    });
  });

  it('distinguishes a completed year from YTD and historical partial periods', () => {
    const completeData = {
      ...data,
      daily_plays: { '2025-12-31': 4 },
      yearly_eras: [{ ...data.yearly_eras[0], year: 2025, plays: 4 }],
    };
    const partialData = {
      ...completeData,
      daily_plays: { '2025-09-30': 4 },
    };

    expect(deriveDatasetTemporalTrust(completeData, {
      now: new Date('2026-01-10T12:00:00Z'),
    }).latestPeriodStatus).toBe('complete');
    expect(deriveDatasetTemporalTrust(partialData, {
      now: new Date('2026-01-10T12:00:00Z'),
    }).latestPeriodStatus).toBe('partial');
  });

  it('treats dates outside exact daily bounds as not observed', () => {
    const trust = deriveDatasetTemporalTrust(data);
    expect(isDateObserved('2015-02-28', trust)).toBe(false);
    expect(isDateObserved('2026-07-03', trust)).toBe(true);
    expect(isDateObserved('2026-07-04', trust)).toBe(false);
  });

  it('uses the requested timezone at UTC date boundaries', () => {
    expect(dateKeyInTimeZone(new Date('2026-07-12T22:30:00Z'), 'Asia/Jerusalem'))
      .toBe('2026-07-13');
  });
});
