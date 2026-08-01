import { describe, expect, it, vi } from 'vitest';
import { zipSync, strToU8 } from 'fflate';

import {
  expandZipArchives,
  ZIP_IMPORT_LIMITS,
  type ZipArchiveErrorCode,
} from './zipArchive';

/** Builds a real ZIP in memory so the test exercises actual decompression. */
function zipFile(name: string, entries: Record<string, string>): File {
  const packed = zipSync(
    Object.fromEntries(Object.entries(entries).map(([path, text]) => [path, strToU8(text)])),
  );
  return new File([packed as BlobPart], name);
}

function zipBytes(entries: Record<string, string>): Uint8Array {
  return zipSync(
    Object.fromEntries(Object.entries(entries).map(([path, text]) => [path, strToU8(text)])),
  );
}

function setCentralDirectoryCompression(
  bytes: Uint8Array,
  targetName: string,
  compression: number,
): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();

  for (let offset = 0; offset <= bytes.length - 46; offset += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) continue;
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (name === targetName) {
      view.setUint16(offset + 10, compression, true);
      return;
    }
    offset += 45 + nameLength + extraLength + commentLength;
  }

  throw new Error(`ZIP central-directory entry not found: ${targetName}`);
}

async function expectSafetyError(
  promise: Promise<unknown>,
  code: ZipArchiveErrorCode,
): Promise<void> {
  await expect(promise).rejects.toMatchObject({
    name: 'ZipArchiveError',
    code,
  });
}

const SPOTIFY_ROWS = JSON.stringify([
  { ts: '2024-03-02T21:14:00Z', master_metadata_track_name: 'In Blur', ms_played: 240000 },
]);

describe('expandZipArchives', () => {
  it('publishes the exact browser-memory safety boundary', () => {
    expect(ZIP_IMPORT_LIMITS).toEqual({
      maxCompressedBytes: 104_857_600,
      maxEntries: 128,
      maxEntryBytes: 67_108_864,
      maxExpandedBytes: 134_217_728,
      maxCompressionRatio: 100,
    });
  });

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

  it('filters excluded entries before inflation begins', async () => {
    const bytes = zipBytes({
      'Spotify Account Data/Identity.json': '{"contact":"redacted"}',
      'Spotify Extended Streaming History/endsong_0.json': SPOTIFY_ROWS,
    });
    // An unsupported compression method would make fflate fail immediately if
    // Nova tried to inflate this excluded identity payload.
    setCentralDirectoryCompression(bytes, 'Spotify Account Data/Identity.json', 99);
    const archive = new File([bytes as BlobPart], 'spotify.zip');

    const result = await expandZipArchives([archive]);

    expect(result.unreadableArchives).toEqual([]);
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

  it('rejects a compressed archive before reading it when it exceeds 100 MiB', async () => {
    const archive = zipFile('oversized.zip', { 'endsong_0.json': SPOTIFY_ROWS });
    Object.defineProperty(archive, 'size', {
      configurable: true,
      value: ZIP_IMPORT_LIMITS.maxCompressedBytes + 1,
    });
    const read = Object.defineProperty(archive, 'arrayBuffer', {
      configurable: true,
      value: () => Promise.reject(new Error('must not read oversized archive')),
    });

    await expectSafetyError(expandZipArchives([read]), 'ARCHIVE_TOO_LARGE');
  });

  it('rejects an archive containing more than 128 directory entries', async () => {
    const entries = Object.fromEntries(
      Array.from({ length: ZIP_IMPORT_LIMITS.maxEntries + 1 }, (_, index) => [
        `history/endsong_${index}.json`,
        '[]',
      ]),
    );

    await expectSafetyError(
      expandZipArchives([zipFile('too-many.zip', entries)]),
      'TOO_MANY_ENTRIES',
    );
  });

  it('rejects an importable entry that exceeds the per-entry boundary', async () => {
    const archive = zipFile('large-entry.zip', {
      'history/endsong_0.json': '0123456789abcdefg',
    });

    await expectSafetyError(
      expandZipArchives([archive], { limits: { maxEntryBytes: 16 } }),
      'ENTRY_TOO_LARGE',
    );
  });

  it('rejects a batch whose approved expanded payload exceeds the total boundary', async () => {
    const archive = zipFile('large-total.zip', {
      'history/endsong_0.json': '0123456789ab',
      'history/endsong_1.json': 'abcdefghijkl',
    });

    await expectSafetyError(
      expandZipArchives([archive], { limits: { maxExpandedBytes: 20 } }),
      'EXPANDED_TOO_LARGE',
    );
  });

  it('rejects a highly compressed importable payload before inflating it', async () => {
    const archive = zipFile('ratio-bomb.zip', {
      'history/endsong_0.json': '0'.repeat(1024 * 1024),
    });

    await expectSafetyError(
      expandZipArchives([archive]),
      'COMPRESSION_RATIO_TOO_HIGH',
    );
  });

  it('rejects different ZIP paths that flatten to the same normalized name', async () => {
    const archive = zipFile('duplicates.zip', {
      'first/endsong_0.json': '[]',
      'second/ENDSONG_0.JSON': '[]',
    });

    await expectSafetyError(
      expandZipArchives([archive]),
      'DUPLICATE_FLATTENED_NAME',
    );
  });

  it('cancels cleanly while the browser is still reading the archive', async () => {
    const bytes = zipBytes({ 'endsong_0.json': SPOTIFY_ROWS });
    const archive = new File([bytes as BlobPart], 'spotify.zip');
    let finishRead: ((value: ArrayBuffer) => void) | undefined;
    Object.defineProperty(archive, 'arrayBuffer', {
      configurable: true,
      value: () => new Promise<ArrayBuffer>(resolve => {
        finishRead = resolve;
      }),
    });
    const controller = new AbortController();
    const expansion = expandZipArchives([archive], { signal: controller.signal });
    const fulfilled = vi.fn();
    const rejected = vi.fn();
    void expansion.then(fulfilled, rejected);

    controller.abort();

    await expect(expansion).rejects.toMatchObject({ name: 'AbortError' });
    finishRead?.(bytes.slice().buffer);
    await Promise.resolve();
    await Promise.resolve();
    expect(fulfilled).not.toHaveBeenCalled();
    expect(rejected).toHaveBeenCalledTimes(1);
    expect(rejected.mock.calls[0][0]).toMatchObject({ name: 'AbortError' });
  });
});
