import { describe, expect, it } from 'vitest';

import { MusicBeeSnapshotError, parseMusicBeeLibraryXml } from './musicBeeSnapshot';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Major Version</key><integer>1</integer>
    <key>Library Persistent ID</key><string>PRIVATE-LIBRARY-ID</string>
    <key>Tracks</key>
    <dict>
      <key>1</key>
      <dict>
        <key>Track ID</key><integer>1</integer>
        <key>Name</key><string>Signal One</string>
        <key>Artist</key><string>Bring Me The Horizon</string>
        <key>Album</key><string>Test Album</string>
        <key>Genre</key><string>Metalcore</string>
        <key>Total Time</key><integer>210000</integer>
        <key>Play Count</key><integer>4</integer>
        <key>Skip Count</key><integer>2</integer>
        <key>Rating</key><integer>80</integer>
        <key>Play Date UTC</key><date>2024-06-01T12:00:00Z</date>
        <key>Date Added</key><date>2014-01-02T00:00:00Z</date>
        <key>Location</key><string>file://localhost/C:/Private/Music/song.mp3</string>
        <key>Persistent ID</key><string>PRIVATE-TRACK-ID</string>
      </dict>
      <key>2</key>
      <dict>
        <key>Name</key><string>Signal One</string>
        <key>Artist</key><string>Bring Me the Horizon</string>
        <key>Album</key><string>Test Album</string>
        <key>Genre</key><string>Metalcore</string>
        <key>Play Count</key><integer>3</integer>
        <key>Play Date UTC</key><date>2025-01-01T12:00:00Z</date>
      </dict>
      <key>3</key>
      <dict>
        <key>Name</key><string>Never Played</string>
        <key>Artist</key><string>Another Artist</string>
        <key>Album</key><string>Quiet Album</string>
        <key>Play Count</key><integer>0</integer>
      </dict>
    </dict>
  </dict>
</plist>`;

describe('parseMusicBeeLibraryXml', () => {
  it('builds a sanitized aggregate snapshot without fabricating events', () => {
    const snapshot = parseMusicBeeLibraryXml(xml);

    expect(snapshot).toMatchObject({
      source: 'musicbee_itunes_xml',
      library_item_count: 3,
      track_count: 2,
      duplicate_item_count: 1,
      artist_count: 2,
      album_count: 2,
      played_track_count: 1,
      total_play_count: 7,
      total_skip_count: 2,
      latest_played_at: '2025-01-01T12:00:00.000Z',
    });
    expect(snapshot.capabilities.aggregate_play_counts).toBe(true);
    expect(snapshot.capabilities.last_played).toBe(true);
    expect(snapshot.capabilities.exact_event_timeline).toBe(false);
    expect(snapshot.limitations).toEqual([
      'aggregate_counts_not_timeline',
      'separate_source_totals',
      'paths_and_ids_discarded',
    ]);
    expect(snapshot.tracks[0]).toMatchObject({
      artist: 'Bring Me the Horizon',
      title: 'Signal One',
      play_count: 7,
      skip_count: 2,
    });
  });

  it('drops file paths, persistent IDs and raw track IDs', () => {
    const serialized = JSON.stringify(parseMusicBeeLibraryXml(xml));

    expect(serialized).not.toContain('file://');
    expect(serialized).not.toContain('Private/Music');
    expect(serialized).not.toContain('PRIVATE-LIBRARY-ID');
    expect(serialized).not.toContain('PRIVATE-TRACK-ID');
    expect(serialized).not.toContain('"Track ID"');
  });

  it('keeps a zero-play item in the library without increasing play totals', () => {
    const snapshot = parseMusicBeeLibraryXml(xml);
    expect(snapshot.tracks.find(track => track.title === 'Never Played')?.play_count).toBe(0);
    expect(snapshot.total_play_count).toBe(7);
  });

  it('decodes built-in and numeric XML entities without retaining ignored nested metadata', () => {
    const encodedXml = `<?xml version="1.0"?>
      <plist version="1.0">
        <dict>
          <key>Ignored</key>
          <array><dict><key>Location</key><string>file://private/path</string></dict></array>
          <key>Tracks</key>
          <dict>
            <key>1</key>
            <dict>
              <key>Name</key><string>Signal &amp; Noise &#35;1</string>
              <key>Artist</key><string>Artist &lt;One&gt;</string>
              <key>Play Count</key><integer>2</integer>
            </dict>
          </dict>
        </dict>
      </plist>`;

    const snapshot = parseMusicBeeLibraryXml(encodedXml);

    expect(snapshot.tracks[0]).toMatchObject({
      artist: 'Artist <One>',
      title: 'Signal & Noise #1',
      play_count: 2,
    });
    expect(JSON.stringify(snapshot)).not.toContain('file://private/path');
  });

  it('reports optional counter capabilities only when the XML contains them', () => {
    const catalogOnlyXml = `<?xml version="1.0"?>
      <plist version="1.0">
        <dict>
          <key>Tracks</key>
          <dict>
            <key>1</key>
            <dict>
              <key>Name</key><string>Catalog Only</string>
              <key>Artist</key><string>Archive Artist</string>
            </dict>
          </dict>
        </dict>
      </plist>`;
    const snapshot = parseMusicBeeLibraryXml(catalogOnlyXml);

    expect(snapshot.capabilities.aggregate_play_counts).toBe(false);
    expect(snapshot.capabilities.last_played).toBe(false);
    expect(snapshot.total_play_count).toBe(0);
    expect(snapshot.latest_played_at).toBeNull();
  });

  it('rejects malformed and non-library XML with stable errors', () => {
    expect(() => parseMusicBeeLibraryXml('<plist><dict>')).toThrow(MusicBeeSnapshotError);
    expect(() => parseMusicBeeLibraryXml(
      '<plist><dict><key>Tracks</key><dict></dict></plist>',
    )).toThrowError(expect.objectContaining({ code: 'INVALID_XML' }));
    expect(() => parseMusicBeeLibraryXml(
      '<plist version><dict><key>Tracks</key><dict></dict></dict></plist>',
    )).toThrowError(expect.objectContaining({ code: 'INVALID_XML' }));
    expect(() => parseMusicBeeLibraryXml('<plist><dict><key>Name</key><string>x</string></dict></plist>'))
      .toThrowError(expect.objectContaining({ code: 'NOT_LIBRARY_XML' }));
  });
});
