import { describe, expect, it } from 'vitest';
import type { MusicDnaData, SourceSummary } from '../types';
import {
  buildSourceReconciliation,
  buildGenreDistribution,
  getDatasetCoverage,
  normalizePlatformBreakdown,
  platformFamily,
} from './chartIntegrity';

const summary: SourceSummary = {
  source_type: 'merged',
  lastfm_plays: 50_476,
  spotify_plays: 161_898,
  youtube_plays: 1_769,
  apple_music_plays: 0,
  listenbrainz_plays: 0,
  merged_plays: 80_550,
  spotify_skips: 39_158,
  spotify_skip_rate_pct: 24.19,
  spotify_short_plays: 97_749,
  spotify_short_play_rate_pct: 60.38,
  overlap_unique_tracks: 10_145,
  cross_source_duplicates: 35_844,
  source_note: 'fixture',
};

describe('chart integrity helpers', () => {
  it('reconciles raw, short and duplicated events to the final count', () => {
    expect(buildSourceReconciliation(summary)).toMatchObject({
      rawEvents: 214_143,
      shortEvents: 97_749,
      afterShort: 116_394,
      duplicateEvents: 35_844,
      afterDeduplication: 80_550,
      adjustment: 0,
      finalListens: 80_550,
      reconcilesExactly: true,
    });
  });

  it('keeps a visible adjustment when a legacy summary does not balance', () => {
    const result = buildSourceReconciliation({ ...summary, merged_plays: 80_500 });
    expect(result.adjustment).toBe(-50);
    expect(result.reconcilesExactly).toBe(false);
  });

  it('removes verbose device IDs and uses every row as the share denominator', () => {
    const result = normalizePlatformBreakdown([
      { platform: 'Android OS 11 API 30 (Xiaomi, Mi 10)', plays: 70 },
      { platform: 'android', plays: 30 },
      { platform: 'Windows 10 (10.0.19041; x64; AppX)', plays: 50 },
      { platform: 'Partner android_tv Xiaomi;MIBOX4;privatehash;;tpapi', plays: 25 },
      { platform: 'cast', plays: 25 },
    ], 3);

    expect(result.totalPlays).toBe(200);
    expect(result.rows[0]).toEqual({ platform: 'Android phone', plays: 100, share: 50 });
    expect(result.rows.reduce((sum, row) => sum + row.plays, 0)).toBe(200);
    expect(result.rows.map((row) => row.platform).join(' ')).not.toMatch(/Xiaomi|privatehash|API 30/);
  });

  it('recognizes privacy-safe platform families', () => {
    expect(platformFamily('Android-tablet OS 8.1.0 API 27')).toBe('Android tablet');
    expect(platformFamily('Partner SCEI sony_tv;ps4;hash;;tpapi')).toBe('PlayStation');
    expect(platformFamily('YouTube Takeout HTML')).toBe('YouTube import');
    expect(platformFamily('YouTube import')).toBe('YouTube import');
  });

  it('derives YTD from the last observed local date', () => {
    const data = { daily_plays: { '2025-12-31': 8, '2026-07-03': 4 } } as Pick<MusicDnaData, 'daily_plays'>;
    expect(getDatasetCoverage(data)).toEqual({
      maxDate: '2026-07-03',
      maxYear: 2026,
      isPartialYear: true,
    });
  });

  it('keeps the complete genre denominator with explicit unclassified and other rows', () => {
    const distribution = buildGenreDistribution([
      { name: 'Rock', plays: 60 },
      { name: 'Pop', plays: 20 },
    ], 100, 1);

    expect(distribution).toMatchObject({
      totalPlays: 100,
      sourcePlays: 80,
      sourceCoveragePct: 80,
      rows: [
        { name: 'Rock', plays: 60, share: 60 },
        { name: 'Other', plays: 40, share: 40 },
      ],
    });
    expect(distribution.rows.reduce((sum, row) => sum + row.plays, 0)).toBe(100);
  });
});
