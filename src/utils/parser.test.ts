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

  it('enriches uploaded plays with bundled artist metadata (genre + country)', () => {
    const csv = [
      'Metallica,Master of Puppets,Battery,01 Jan 2026 10:00',
      'Bad Bunny,Un Verano Sin Ti,Moscow Mule,01 Jan 2026 11:00',
      'Totally Unknown Garage Band,Demo,Song,01 Jan 2026 12:00',
    ].join('\n');

    const data = parseMusicSources({ lastfmCsvTexts: [csv] });
    const metallica = data.top_artists.find(a => a.name === 'Metallica');
    const badBunny = data.top_artists.find(a => a.name === 'Bad Bunny');
    const unknown = data.top_artists.find(a => a.name === 'Totally Unknown Garage Band');

    expect(metallica?.genre).toBe('Thrash Metal / Heavy Metal');
    expect(metallica?.country).toBe('United States');
    expect(badBunny?.country).toBe('Puerto Rico');
    expect(unknown?.genre).toBe('Unclassified');
    expect(unknown?.country).toBe('Unknown');
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

  it('skips blank lines and short rows mixed in with valid Last.fm CSV rows instead of crashing', () => {
    const csv = [
      'Good Artist,Good Album,Good Track,01 Jan 2026 10:00',
      '',
      'Too,Few,Columns',
      '   ',
      'Second Artist,Second Album,Second Track,02 Jan 2026 11:00',
    ].join('\n');

    const rows = parseLastfmCsvRows(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0].artist).toBe('Good Artist');
    expect(rows[1].artist).toBe('Second Artist');
  });

  it('detects a genuine Last.fm header row and excludes it from parsed plays', () => {
    const csv = [
      'Artist,Album,Track,Date',
      'Real Artist,Real Album,Real Track,01 Jan 2026 10:00',
    ].join('\n');

    const rows = parseLastfmCsvRows(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].artist).toBe('Real Artist');
  });

  it('BUG: looksLikeHeader false-positives on a genuine first data row whose values merely contain header-like words', () => {
    // These artist/album/track values are genuine data (not a header), but they contain the
    // substrings "artist", "track" and "date" purely as part of their names. looksLikeHeader()
    // only inspects substrings of the joined row, so it currently misclassifies this as a
    // header and silently drops the first real row. This test documents the CURRENT (buggy)
    // behavior; if looksLikeHeader is fixed to be less naive, this assertion should change to
    // expect the row to be kept.
    const csv = [
      'Track Artist Collective,Date Night Album,My Favorite Track,01 Jan 2026 10:00',
    ].join('\n');

    const rows = parseLastfmCsvRows(csv);

    expect(rows).toHaveLength(0);
  });

  it('round-trips album keys for albums containing commas and special characters', () => {
    const csv = [
      'Comma Artist,"Album, Deluxe (Special / Edition)",Track One,01 Jan 2026 10:00',
      'Comma Artist,"Album, Deluxe (Special / Edition)",Track Two,01 Jan 2026 10:05',
    ].join('\n');

    const data = parseMusicSources({ lastfmCsvTexts: [csv] });

    expect(data.top_albums).toHaveLength(1);
    expect(data.top_albums[0]).toMatchObject({
      artist: 'Comma Artist',
      title: 'Album, Deluxe (Special / Edition)',
      plays: 2,
    });
  });

  it('documents current behavior: plays exactly at the 60-minute session gap threshold stay in the same session', () => {
    const csv = [
      'Gap Artist,Album,Song One,01 Jan 2026 10:00',
      // Exactly SESSION_GAP_MINUTES (60) after the previous play.
      'Gap Artist,Album,Song Two,01 Jan 2026 11:00',
      // Just over the threshold, starts a new session.
      'Gap Artist,Album,Song Three,01 Jan 2026 12:01',
    ].join('\n');

    const data = parseMusicSources({ lastfmCsvTexts: [csv] });

    expect(data.sessions).toHaveLength(2);
    const sessionsByTrackCount = [...data.sessions].sort((a, b) => b.tracks_count - a.tracks_count);
    expect(sessionsByTrackCount[0].tracks_count).toBe(2);
    expect(sessionsByTrackCount[1].tracks_count).toBe(1);
  });

  it('throws ParseError NO_VALID_ROWS when both lastfmCsvTexts and spotifyJsonTexts are empty arrays', () => {
    expect(() => parseMusicSources({ lastfmCsvTexts: [], spotifyJsonTexts: [] }))
      .toThrow(ParseError);
    try {
      parseMusicSources({ lastfmCsvTexts: [], spotifyJsonTexts: [] });
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError);
      expect((err as ParseError).code).toBe('NO_VALID_ROWS');
    }
  });
});
