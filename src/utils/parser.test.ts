import { describe, expect, it } from 'vitest';
import { ParseError, parseLastfmCsvRows, parseMusicSources } from './parser';

describe('music data parser', () => {
  it('parses Last.fm CSV rows with quoted commas', () => {
    const csv = [
      '"Artist, One","Album, Deluxe","Track, Pt. 1","21 Jun 2026 10:32"',
      'Plain Artist,Plain Album,Plain Track,22 Jun 2026 11:00',
    ].join('\n');

    const rows = parseLastfmCsvRows(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0].artist).toBe('Artist, One');
    expect(rows[0].album).toBe('Album, Deluxe');
    expect(rows[0].track).toBe('Track, Pt. 1');
    expect(rows[0].source).toBe('lastfm');
  });

  it('aggregates Spotify extended history fields', () => {
    const spotify = JSON.stringify([
      {
        ts: '2026-01-01T05:09:35Z',
        platform: 'cast',
        ms_played: 2772,
        conn_country: 'IL',
        master_metadata_track_name: 'bhalyskaala',
        master_metadata_album_artist_name: 'Bhaly',
        master_metadata_album_album_name: '2BAD',
        skipped: true,
      },
      {
        ts: '2026-01-01T05:12:35Z',
        platform: 'windows',
        ms_played: 180000,
        conn_country: 'IL',
        master_metadata_track_name: 'Second Song',
        master_metadata_album_artist_name: 'Bhaly',
        master_metadata_album_album_name: '2BAD',
        skipped: false,
      },
    ]);

    const data = parseMusicSources({ spotifyJsonTexts: [spotify] });

    expect(data.core_metrics.total_plays).toBe(2);
    expect(data.source_summary?.source_type).toBe('spotify');
    expect(data.source_summary?.spotify_skips).toBe(1);
    expect(data.source_summary?.spotify_short_plays).toBe(1);
    expect(data.countries[0]).toEqual({ country: 'Israel', plays: 2 });
    expect(data.platform_breakdown?.map(item => item.platform)).toEqual(['cast', 'windows']);
  });

  it('detects merged source overlap by normalized artist and track', () => {
    const lastfm = 'Shared Artist,Shared Album,Shared Track,01 Jan 2026 10:00';
    const spotify = JSON.stringify([
      {
        ts: '2026-01-01T10:01:00Z',
        ms_played: 120000,
        conn_country: 'US',
        master_metadata_track_name: 'Shared Track',
        master_metadata_album_artist_name: 'Shared Artist',
        master_metadata_album_album_name: 'Shared Album',
      },
    ]);

    const data = parseMusicSources({ lastfmCsvTexts: [lastfm], spotifyJsonTexts: [spotify] });

    expect(data.source_summary?.source_type).toBe('merged');
    expect(data.source_summary?.lastfm_plays).toBe(1);
    expect(data.source_summary?.spotify_plays).toBe(1);
    expect(data.source_summary?.overlap_unique_tracks).toBe(1);
    expect(data.core_metrics.match_rate_pct).toBe(100);
  });

  it('computes records and obsessions from imported history', () => {
    const csv = [
      'Loop Artist,Album,Loop Song,01 Jan 2026 10:00',
      'Loop Artist,Album,Loop Song,01 Jan 2026 10:04',
      'Loop Artist,Album,Loop Song,01 Jan 2026 10:08',
      'Loop Artist,Album,Loop Song,01 Jan 2026 10:12',
      'Loop Artist,Album,Loop Song,01 Jan 2026 10:16',
      'Other Artist,Album,Other Song,02 Jan 2026 10:00',
      'Other Artist,Album,Other Song,03 Jan 2026 10:00',
      'Other Artist,Album,Other Song,05 Jan 2026 10:00',
    ].join('\n');

    const data = parseMusicSources({ lastfmCsvTexts: [csv] });

    expect(data.records?.max_day_plays).toBe(5);
    expect(data.records?.max_day_date).toBe('2026-01-01');
    expect(data.records?.longest_streak_days).toBe(3);
    expect(data.obsessions[0]).toMatchObject({
      artist: 'Loop Artist',
      track: 'Loop Song',
      date: '2026-01-01',
      count: 5,
    });
  });

  it('throws a ParseError with code INVALID_JSON for malformed Spotify JSON', () => {
    expect(() => parseMusicSources({ spotifyJsonTexts: ['{not valid json'] }))
      .toThrow(ParseError);
    try {
      parseMusicSources({ spotifyJsonTexts: ['{not valid json'] });
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError);
      expect((err as ParseError).code).toBe('INVALID_JSON');
    }
  });

  it('throws a ParseError with code NO_VALID_ROWS for empty input', () => {
    expect(() => parseMusicSources({ lastfmCsvTexts: [''], spotifyJsonTexts: [] }))
      .toThrow(ParseError);
    try {
      parseMusicSources({ lastfmCsvTexts: [''], spotifyJsonTexts: [] });
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError);
      expect((err as ParseError).code).toBe('NO_VALID_ROWS');
    }
  });

  it('ignores Spotify JSON rows missing required fields instead of throwing', () => {
    const spotify = JSON.stringify([
      { ts: '2026-01-01T05:09:35Z' }, // missing artist/track
      { master_metadata_track_name: 'No Timestamp', master_metadata_album_artist_name: 'Artist' }, // missing ts
    ]);
    expect(() => parseMusicSources({ spotifyJsonTexts: [spotify] })).toThrow(ParseError);
  });

  it('classifies sub-30-second Spotify plays as short plays', () => {
    const spotify = JSON.stringify([
      {
        ts: '2026-01-01T05:09:35Z',
        ms_played: 15000,
        master_metadata_track_name: 'Quick Skip',
        master_metadata_album_artist_name: 'Artist',
      },
    ]);
    const data = parseMusicSources({ spotifyJsonTexts: [spotify] });
    expect(data.source_summary?.spotify_short_plays).toBe(1);
  });

  it('normalizes cross-source duplicate tracks despite artist capitalization differences', () => {
    const lastfm = 'shared artist,Album,Shared Track,01 Jan 2026 10:00';
    const spotify = JSON.stringify([
      {
        ts: '2026-01-01T10:01:00Z',
        ms_played: 120000,
        master_metadata_track_name: 'Shared Track',
        master_metadata_album_artist_name: 'SHARED ARTIST',
        master_metadata_album_album_name: 'Album',
      },
    ]);
    const data = parseMusicSources({ lastfmCsvTexts: [lastfm], spotifyJsonTexts: [spotify] });
    expect(data.source_summary?.overlap_unique_tracks).toBe(1);
  });
});
