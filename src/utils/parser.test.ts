import { describe, expect, it } from 'vitest';
import { ParseError, parseAppleMusicCsvRows, parseLastfmCsvRows, parseMusicSources } from './parser';

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

    // The 2.7s skipped event is reported in skip/short-play stats but not
    // counted as a play (Spotify's own 30s stream-counting rule).
    expect(data.core_metrics.total_plays).toBe(1);
    expect(data.source_summary?.source_type).toBe('spotify');
    expect(data.source_summary?.spotify_skips).toBe(1);
    expect(data.source_summary?.spotify_short_plays).toBe(1);
    expect(data.countries[0]).toEqual({ country: 'Israel', plays: 1 });
    expect(data.platform_breakdown?.map(item => item.platform)).toEqual(['windows']);
  });

  it('parses YouTube Takeout watch history JSON as listening events', () => {
    const youtube = JSON.stringify([
      {
        header: 'YouTube Music',
        title: 'Watched Bring Me The Horizon - MANTRA (Official Video)',
        titleUrl: 'https://www.youtube.com/watch?v=VAXg78MKJcM',
        subtitles: [{ name: 'Bring Me The Horizon' }],
        time: '2026-02-03T20:15:00.000Z',
        products: ['YouTube'],
      },
      {
        header: 'YouTube',
        title: 'Watched In Blur (Official Audio)',
        subtitles: [{ name: 'Deafheaven - Topic' }],
        time: '2026-02-03T20:20:00.000Z',
      },
    ]);

    const data = parseMusicSources({ spotifyJsonTexts: [youtube] });

    expect(data.source_summary?.source_type).toBe('youtube');
    expect(data.source_summary?.youtube_plays).toBe(2);
    expect(data.top_artists[0].name).toBe('Bring Me The Horizon');
    expect(data.top_tracks.map(track => track.title)).toContain('MANTRA');
    expect(data.top_tracks.map(track => track.title)).toContain('In Blur');
  });

  it('parses Spanish-locale Takeout dates and filters non-music watch events', () => {
    // Real Takeout shape for a Spanish-language Google account: "Has visto"
    // titles and "3 jul 2026, 5:00:15 p.m. IDT" dates (new Date() can't parse
    // those - 42,000 rows were once silently dropped because of it).
    const youtubeHtml = `
      <html><body>
        Has visto <a href="https://www.youtube.com/watch?v=a1">Metallica - Battery (Official Audio)</a><br>
        <a href="https://www.youtube.com/channel/x1">Metallica</a><br>
        3 jul 2026, 5:00:15 p.m. IDT<br>
        Has visto <a href="https://www.youtube.com/watch?v=a2">In Blur</a><br>
        <a href="https://www.youtube.com/channel/x2">Deafheaven - Topic</a><br>
        3 jul 2026, 4:59:47 p.m. IDT<br>
        Has visto <a href="https://www.youtube.com/watch?v=a3">El procedimiento que ganó un Premio Nobel pero arruinó cerebros</a><br>
        <a href="https://www.youtube.com/channel/x3">La Traumatóloga Geek</a><br>
        3 jul 2026, 4:58:29 p.m. IDT<br>
        Has visto <a href="https://www.youtube.com/watch?v=a4">Clase magistral del Presidente ante alumnos - discurso completo</a><br>
        <a href="https://www.youtube.com/channel/x4">Oficina del Presidente</a><br>
        3 jul 2026, 4:57:13 p.m. IDT<br>
        Has visto <a href="https://www.youtube.com/watch?v=a5">1 ene 2020, 10:30:00 a.m. IST check</a><br>
      </body></html>
    `;

    const data = parseMusicSources({ youtubeHtmlTexts: [youtubeHtml] });

    // Only the two confident music rows survive: known-catalog artist with an
    // official marker, and a "- Topic" channel. The documentary and the
    // political speech (dash title, unknown "artist") must NOT count.
    expect(data.source_summary?.youtube_plays).toBe(2);
    expect(data.top_artists.map(a => a.name).sort()).toEqual(['Deafheaven', 'Metallica']);
    // "5:00:15 p.m." parsed as 17:00 local - both plays land in the 16-17h
    // heatmap rows, none at 4-5 a.m.
    const hour16and17 = (data.heatmap[16] ?? []).reduce((a, b) => a + b, 0)
      + (data.heatmap[17] ?? []).reduce((a, b) => a + b, 0);
    const hour4and5 = (data.heatmap[4] ?? []).reduce((a, b) => a + b, 0)
      + (data.heatmap[5] ?? []).reduce((a, b) => a + b, 0);
    expect(hour16and17).toBe(2);
    expect(hour4and5).toBe(0);
  });

  it('parses YouTube Takeout watch history HTML as listening events', () => {
    const youtubeHtml = `
      <html>
        <body>
          Watched <a href="https://www.youtube.com/watch?v=VAXg78MKJcM">Bring Me The Horizon - MANTRA (Official Video)</a><br>
          <a href="https://www.youtube.com/channel/example">Bring Me The Horizon</a><br>
          Feb 3, 2026, 8:15:00 PM UTC<br>
          Watched <a href="https://www.youtube.com/watch?v=abc123">In Blur (Official Audio)</a><br>
          <a href="https://www.youtube.com/channel/example2">Deafheaven - Topic</a><br>
          Feb 3, 2026, 8:20:00 PM UTC<br>
        </body>
      </html>
    `;

    const data = parseMusicSources({ youtubeHtmlTexts: [youtubeHtml] });

    expect(data.source_summary?.source_type).toBe('youtube');
    expect(data.source_summary?.youtube_plays).toBe(2);
    expect(data.platform_breakdown?.[0]).toEqual({ platform: 'YouTube Takeout HTML', plays: 2 });
    expect(data.knowledge_summary?.matched_artists).toBe(2);
    expect(data.top_tracks.map(track => track.title)).toContain('MANTRA');
    expect(data.top_tracks.map(track => track.title)).toContain('In Blur');
  });

  it('computes offline artist knowledge coverage for uploaded histories', () => {
    const csv = [
      'Bring Me The Horizon,Sempiternal,Can You Feel My Heart,01 Jan 2026 10:00',
      'Bring Me The Horizon,Sempiternal,Shadow Moses,01 Jan 2026 10:05',
      'Unknown Future Band,Demo,Signal,01 Jan 2026 10:10',
    ].join('\n');

    const data = parseMusicSources({ csvTexts: [csv] });

    expect(data.knowledge_summary).toMatchObject({
      source: 'offline_artist_knowledge',
      total_artists: 2,
      matched_artists: 1,
      unmatched_artists: 1,
      matched_plays: 2,
    });
    expect(data.knowledge_summary?.top_matches[0]).toMatchObject({
      name: 'Bring Me The Horizon',
      matchedName: 'Bring Me the Horizon',
    });
    expect(data.knowledge_summary?.top_missing[0].name).toBe('Unknown Future Band');
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

    const data = parseMusicSources({ csvTexts: [lastfm], spotifyJsonTexts: [spotify] });

    expect(data.source_summary?.source_type).toBe('merged');
    expect(data.source_summary?.lastfm_plays).toBe(1);
    expect(data.source_summary?.spotify_plays).toBe(1);
    expect(data.source_summary?.overlap_unique_tracks).toBe(1);
    expect(data.core_metrics.match_rate_pct).toBe(100);
    // Same track from two sources one minute apart = one real listen reported
    // twice (Last.fm auto-scrobbling Spotify) - counted once, Spotify's richer
    // event (measured playtime) wins.
    expect(data.core_metrics.total_plays).toBe(1);
    expect(data.source_summary?.cross_source_duplicates).toBe(1);
    expect(data.source_summary?.merged_plays).toBe(1);
  });

  it('keeps genuinely separate listens of the same track from different sources', () => {
    const lastfm = 'Shared Artist,Shared Album,Shared Track,01 Jan 2026 10:00';
    const spotify = JSON.stringify([
      {
        ts: '2026-01-01T15:00:00Z', // five hours later: a real second listen
        ms_played: 120000,
        master_metadata_track_name: 'Shared Track',
        master_metadata_album_artist_name: 'Shared Artist',
        master_metadata_album_album_name: 'Shared Album',
      },
    ]);

    const data = parseMusicSources({ csvTexts: [lastfm], spotifyJsonTexts: [spotify] });

    expect(data.core_metrics.total_plays).toBe(2);
    expect(data.source_summary?.cross_source_duplicates).toBe(0);
  });

  it('never lets the 30s threshold empty an upload made only of short plays', () => {
    const spotify = JSON.stringify([
      {
        ts: '2026-01-01T05:09:35Z',
        ms_played: 5000,
        master_metadata_track_name: 'Only Short',
        master_metadata_album_artist_name: 'Artist',
      },
    ]);

    const data = parseMusicSources({ spotifyJsonTexts: [spotify] });

    expect(data.core_metrics.total_plays).toBe(1);
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

    const data = parseMusicSources({ csvTexts: [csv] });

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
    expect(() => parseMusicSources({ csvTexts: [''], spotifyJsonTexts: [] }))
      .toThrow(ParseError);
    try {
      parseMusicSources({ csvTexts: [''], spotifyJsonTexts: [] });
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

    const data = parseMusicSources({ csvTexts: [csv] });
    const metallica = data.top_artists.find(a => a.name === 'Metallica');
    const badBunny = data.top_artists.find(a => a.name === 'Bad Bunny');
    const unknown = data.top_artists.find(a => a.name === 'Totally Unknown Garage Band');

    expect(metallica?.genre).toBe('Thrash Metal / Heavy Metal');
    expect(metallica?.country).toBe('United States');
    expect(badBunny?.country).toBe('Puerto Rico');
    expect(unknown?.genre).toBe('Unclassified');
    expect(unknown?.country).toBe('Unknown');
  });

  it('matches bundled artist metadata for NFD-encoded (decomposed Unicode) names', () => {
    // macOS and some export tools emit decomposed Unicode: o + combining acute
    // (U+0301) instead of a precomposed ó. artist_meta.json keys are NFC; both must match.
    const nfdName = 'Sigur Ro\u0301s'; // decomposed form of 'Sigur Rós'
    const csv = `${nfdName},Takk...,Hoppípolla,01 Jan 2026 10:00`;

    const data = parseMusicSources({ csvTexts: [csv] });
    const sigurRos = data.top_artists[0];

    expect(sigurRos.genre).not.toBe('Unclassified');
    expect(sigurRos.country).toBe('Iceland');
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
    const data = parseMusicSources({ csvTexts: [lastfm], spotifyJsonTexts: [spotify] });
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

  it('detects BOM-prefixed Last.fm headers that use Timestamp', () => {
    const csv = [
      '\uFEFFArtist Name,Album Name,Track Name,Timestamp',
      'Real Artist,Real Album,Real Track,01 Jan 2026 10:00',
    ].join('\n');

    const rows = parseLastfmCsvRows(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ artist: 'Real Artist', album: 'Real Album', track: 'Real Track' });
  });

  it('keeps a genuine first data row whose values merely contain header-like words', () => {
    const csv = [
      'Track Artist Collective,Date Night Album,My Favorite Track,01 Jan 2026 10:00',
    ].join('\n');

    const rows = parseLastfmCsvRows(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      artist: 'Track Artist Collective',
      album: 'Date Night Album',
      track: 'My Favorite Track',
    });
  });

  it('round-trips album keys for albums containing commas and special characters', () => {
    const csv = [
      'Comma Artist,"Album, Deluxe (Special / Edition)",Track One,01 Jan 2026 10:00',
      'Comma Artist,"Album, Deluxe (Special / Edition)",Track Two,01 Jan 2026 10:05',
    ].join('\n');

    const data = parseMusicSources({ csvTexts: [csv] });

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

    const data = parseMusicSources({ csvTexts: [csv] });

    expect(data.sessions).toHaveLength(2);
    const sessionsByTrackCount = [...data.sessions].sort((a, b) => b.tracks_count - a.tracks_count);
    expect(sessionsByTrackCount[0].tracks_count).toBe(2);
    expect(sessionsByTrackCount[1].tracks_count).toBe(1);
  });

  it('throws ParseError NO_VALID_ROWS when both csvTexts and spotifyJsonTexts are empty arrays', () => {
    expect(() => parseMusicSources({ csvTexts: [], spotifyJsonTexts: [] }))
      .toThrow(ParseError);
    try {
      parseMusicSources({ csvTexts: [], spotifyJsonTexts: [] });
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError);
      expect((err as ParseError).code).toBe('NO_VALID_ROWS');
    }
  });

  it('parses Apple Music Play Activity CSV rows with a dedicated artist column', () => {
    const csv = [
      'Country,Apple Id Number,Event Start Timestamp,Event Received Timestamp,Track Description,Artist Name,Container Description,Genre,Media Duration In Milliseconds,Play Duration Milliseconds,End Reason Type',
      'US,123,2026-03-01T10:00:00Z,2026-03-01T10:03:20Z,MANTRA,Bring Me The Horizon,Post Human: Survival Horror,Metalcore,200000,200000,NATURAL_END_OF_TRACK',
      'US,123,2026-03-01T10:05:00Z,2026-03-01T10:05:10Z,In Blur,Deafheaven,Infinite Granite,Blackgaze,300000,10000,SKIP_FORWARD',
    ].join('\n');

    const rows = parseAppleMusicCsvRows(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      artist: 'Bring Me The Horizon',
      track: 'MANTRA',
      album: 'Post Human: Survival Horror',
      source: 'apple_music',
      ms_played: 200000,
      skipped: false,
      platform: 'Apple Music',
    });
    expect(rows[1]).toMatchObject({ artist: 'Deafheaven', track: 'In Blur', skipped: true });
  });

  it('falls back to splitting "Artist - Track" when Apple Music CSV has no artist column', () => {
    const csv = [
      'Apple Id Number,Event Start Timestamp,Track Description,Container Description,Media Duration In Milliseconds,Play Duration Milliseconds',
      '123,2026-03-01T10:00:00Z,Bring Me The Horizon - MANTRA,Post Human: Survival Horror,200000,200000',
    ].join('\n');

    const rows = parseAppleMusicCsvRows(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ artist: 'Bring Me The Horizon', track: 'MANTRA', source: 'apple_music' });
  });

  it('skips Apple Music CSV rows without a resolvable artist instead of guessing', () => {
    const csv = [
      'Apple Id Number,Event Start Timestamp,Track Description,Container Description,Media Duration In Milliseconds',
      '123,2026-03-01T10:00:00Z,MANTRA,Post Human: Survival Horror,200000',
    ].join('\n');

    const rows = parseAppleMusicCsvRows(csv);

    expect(rows).toHaveLength(0);
  });

  it('does not misclassify a Last.fm CSV as Apple Music', () => {
    const data = parseMusicSources({ csvTexts: ['Real Artist,Real Album,Real Track,01 Jan 2026 10:00'] });
    expect(data.source_summary?.source_type).toBe('lastfm');
    expect(data.top_artists[0].name).toBe('Real Artist');
  });

  it('routes an Apple Music CSV through parseMusicSources via header sniffing', () => {
    const csv = [
      'Apple Id Number,Event Start Timestamp,Track Description,Artist Name,Container Description,Media Duration In Milliseconds',
      '123,2026-03-01T10:00:00Z,MANTRA,Bring Me The Horizon,Post Human: Survival Horror,200000',
    ].join('\n');

    const data = parseMusicSources({ csvTexts: [csv] });

    expect(data.source_summary?.source_type).toBe('apple_music');
    expect(data.source_summary?.apple_music_plays).toBe(1);
    expect(data.top_artists[0].name).toBe('Bring Me The Horizon');
  });

  it('parses a ListenBrainz listens export (plain array)', () => {
    const listenBrainz = JSON.stringify([
      {
        listened_at: 1770000000,
        track_metadata: {
          artist_name: 'Deafheaven',
          track_name: 'In Blur',
          release_name: 'Infinite Granite',
          additional_info: { duration_ms: 300000, listening_from: 'spotify' },
        },
      },
      {
        listened_at: 1770000600,
        track_metadata: {
          artist_name: 'Bring Me The Horizon',
          track_name: 'MANTRA',
        },
      },
    ]);

    const data = parseMusicSources({ spotifyJsonTexts: [listenBrainz] });

    expect(data.source_summary?.source_type).toBe('listenbrainz');
    expect(data.source_summary?.listenbrainz_plays).toBe(2);
    expect(data.top_artists.map(a => a.name)).toEqual(expect.arrayContaining(['Deafheaven', 'Bring Me The Horizon']));
    expect(data.top_tracks.find(t => t.title === 'In Blur')).toMatchObject({ artist: 'Deafheaven' });
  });

  it('parses a ListenBrainz API-shaped payload wrapper', () => {
    const wrapped = JSON.stringify({
      payload: {
        count: 1,
        listens: [
          {
            listened_at: 1770000000,
            track_metadata: { artist_name: 'Deafheaven', track_name: 'In Blur' },
          },
        ],
      },
    });

    const data = parseMusicSources({ spotifyJsonTexts: [wrapped] });

    expect(data.source_summary?.listenbrainz_plays).toBe(1);
    expect(data.top_artists[0].name).toBe('Deafheaven');
  });

  it('merges Last.fm, Apple Music, Spotify and ListenBrainz into one dataset', () => {
    const lastfmCsv = 'Artist A,Album A,Track A,01 Jan 2026 10:00';
    const appleCsv = [
      'Apple Id Number,Event Start Timestamp,Track Description,Artist Name,Container Description',
      '1,2026-01-01T11:00:00Z,Track B,Artist B,Album B',
    ].join('\n');
    const spotifyJson = JSON.stringify([{
      ts: '2026-01-01T12:00:00Z',
      ms_played: 120000,
      master_metadata_track_name: 'Track C',
      master_metadata_album_artist_name: 'Artist C',
    }]);
    const listenBrainzJson = JSON.stringify([{
      listened_at: 1770003600,
      track_metadata: { artist_name: 'Artist D', track_name: 'Track D' },
    }]);

    const data = parseMusicSources({
      csvTexts: [lastfmCsv, appleCsv],
      spotifyJsonTexts: [spotifyJson, listenBrainzJson],
    });

    expect(data.source_summary?.source_type).toBe('merged');
    expect(data.source_summary?.lastfm_plays).toBe(1);
    expect(data.source_summary?.apple_music_plays).toBe(1);
    expect(data.source_summary?.spotify_plays).toBe(1);
    expect(data.source_summary?.listenbrainz_plays).toBe(1);
    expect(data.core_metrics.total_plays).toBe(4);
  });
});
