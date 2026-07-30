import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';

import { expandZipArchives } from './zipArchive';

/** Builds a real ZIP in memory so the test exercises actual decompression. */
function zipFile(name: string, entries: Record<string, string>): File {
  const packed = zipSync(
    Object.fromEntries(Object.entries(entries).map(([path, text]) => [path, strToU8(text)])),
  );
  return new File([packed as BlobPart], name);
}

const SPOTIFY_ROWS = JSON.stringify([
  { ts: '2024-03-02T21:14:00Z', master_metadata_track_name: 'In Blur', ms_played: 240000 },
]);

describe('expandZipArchives', () => {
  it('recovers Spotify listening history from the archive Spotify actually ships', async () => {
    // Spotify nests the JSON a few folders down and surrounds it with account
    // data the importer has no business reading.
    const archive = zipFile('my_spotify_data.zip', {
      'Spotify Extended Streaming History/Streaming_History_Audio_2024_1.json': SPOTIFY_ROWS,
      'Spotify Extended Streaming History/Streaming_History_Audio_2024_2.json': SPOTIFY_ROWS,
      'Spotify Account Data/Identity.json': '{"displayName":"private"}',
      'Spotify Account Data/Payments.json': '{"card":"private"}',
      'Spotify Account Data/SearchQueries.json': '[]',
      'Spotify Account Data/Inferences.json': '{}',
    });

    const result = await expandZipArchives([archive]);

    expect(result.files.map(file => file.name).sort()).toEqual([
      'Streaming_History_Audio_2024_1.json',
      'Streaming_History_Audio_2024_2.json',
    ]);
    expect(result.emptyArchives).toEqual([]);
    expect(result.unreadableArchives).toEqual([]);
  });

  it('never decodes identity, payment or inference files', async () => {
    const archive = zipFile('export.zip', {
      // Deliberately not a realistic address: the repository privacy audit scans
      // every text file for email-like values, and a fixture is not worth an
      // exception to that rule.
      'Identity.json': '{"contact":"redacted"}',
      'Payments.json': '{}',
      'Userdata.json': '{}',
      'Marquee.json': '[]',
      'Follow.json': '[]',
      'endsong_0.json': SPOTIFY_ROWS,
    });

    const result = await expandZipArchives([archive]);

    expect(result.files.map(file => file.name)).toEqual(['endsong_0.json']);
  });

  it('skips directories and macOS resource forks', async () => {
    const archive = zipFile('mac.zip', {
      '__MACOSX/._endsong_0.json': 'resource fork',
      'history/._hidden.json': 'resource fork',
      'history/endsong_0.json': SPOTIFY_ROWS,
    });

    const result = await expandZipArchives([archive]);

    expect(result.files.map(file => file.name)).toEqual(['endsong_0.json']);
  });

  it('reports an archive that holds nothing importable instead of failing silently', async () => {
    const archive = zipFile('photos.zip', { 'holiday/beach.txt': 'not music' });

    const result = await expandZipArchives([archive]);

    expect(result.files).toEqual([]);
    expect(result.emptyArchives).toEqual(['photos.zip']);
  });

  it('reports an unreadable archive by name rather than dropping it', async () => {
    const broken = new File([new Uint8Array([1, 2, 3, 4]) as BlobPart], 'broken.zip');

    const result = await expandZipArchives([broken]);

    expect(result.unreadableArchives).toEqual(['broken.zip']);
    expect(result.files).toEqual([]);
  });

  it('leaves loose files untouched and keeps them alongside archive contents', async () => {
    const loose = new File(['artist,track\n' as BlobPart], 'lastfm.csv');
    const archive = zipFile('spotify.zip', { 'endsong_0.json': SPOTIFY_ROWS });

    const result = await expandZipArchives([loose, archive]);

    expect(result.files.map(file => file.name)).toEqual(['lastfm.csv', 'endsong_0.json']);
  });

  it('preserves the decompressed contents so the parser sees real rows', async () => {
    const archive = zipFile('spotify.zip', { 'endsong_0.json': SPOTIFY_ROWS });

    const result = await expandZipArchives([archive]);

    await expect(result.files[0].text()).resolves.toBe(SPOTIFY_ROWS);
  });
});
