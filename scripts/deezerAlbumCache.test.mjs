import { describe, expect, it, vi } from 'vitest';

import {
  albumCacheFileName,
  albumCacheRecord,
  artistSearchCacheFileName,
  artistSearchCacheRecord,
  fetchAllDeezerAlbums,
  persistDeezerCache,
  readAlbumCache,
  readArtistSearchCache,
  requireDeezerData,
} from './lib/deezerAlbumCache.mjs';

const completeResult = (data, total = data.length) => ({
  data,
  pages: 1,
  receivedRows: total,
  total,
  complete: true,
});

describe('Deezer album cache contract', () => {
  it('versions filenames and rejects legacy, partial or differently sized caches', () => {
    expect(artistSearchCacheFileName('Post Malone')).toContain('.v1-limit-5.json');
    expect(albumCacheFileName(7543848)).toBe('artist-7543848-albums.v1-limit-100.json');

    expect(readArtistSearchCache([{ id: 1 }])).toBeNull();
    expect(readAlbumCache({ data: [{ id: 1 }], total: 40 }, 7543848)).toBeNull();
    expect(readAlbumCache(albumCacheRecord(7543848, completeResult([{ id: 1 }]), 12), 7543848, 100)).toBeNull();
    expect(readAlbumCache({ ...albumCacheRecord(7543848, completeResult([{ id: 1 }])), complete: false }, 7543848)).toBeNull();

    expect(readArtistSearchCache(artistSearchCacheRecord([{ id: 7543848 }]))).toEqual([{ id: 7543848 }]);
    expect(readAlbumCache(albumCacheRecord(7543848, completeResult([{ id: 1 }])), 7543848)).toEqual([{ id: 1 }]);
    expect(() => albumCacheRecord(7543848, {
      data: [{ id: 1 }], pages: 1, receivedRows: 1, total: 2, complete: true,
    })).toThrow('Cannot cache an incomplete Deezer album result');
  });

  it('follows every next page and removes duplicate album IDs', async () => {
    const responses = [
      {
        data: [{ id: 1, title: 'One' }, { id: 2, title: 'Two' }],
        total: 4,
        next: 'https://api.deezer.com/artist/7543848/albums?index=2&limit=2',
      },
      { data: [{ id: 2, title: 'Two' }, { id: 3, title: 'Three' }], total: 4 },
    ];
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => responses.shift(),
    }));
    const onRequest = vi.fn();

    const result = await fetchAllDeezerAlbums({
      artistId: 7543848,
      requestLimit: 2,
      fetchImpl,
      onRequest,
    });

    expect(result.pages).toBe(2);
    expect(result).toMatchObject({ receivedRows: 4, total: 4, complete: true });
    expect(result.data.map(album => album.id)).toEqual([1, 2, 3]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(onRequest).toHaveBeenCalledTimes(2);
  });

  it('rejects a pagination URL outside the official Deezer API', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ data: [], total: 0, next: 'https://example.com/collect' }),
    }));

    await expect(fetchAllDeezerAlbums({ artistId: 7543848, fetchImpl }))
      .rejects.toThrow('Unsafe Deezer pagination URL');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects a truncated 200 response instead of caching it as complete', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ data: [{ id: 1, title: 'Only page' }], total: 3 }),
    }));

    await expect(fetchAllDeezerAlbums({ artistId: 7543848, fetchImpl }))
      .rejects.toThrow('received 1 of 3 rows without a next page');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects provider errors and malformed successful bodies', async () => {
    const providerError = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ error: { type: 'DataException', message: 'Quota exceeded' } }),
    }));
    await expect(fetchAllDeezerAlbums({ artistId: 7543848, fetchImpl: providerError }))
      .rejects.toThrow('Deezer albums provider error: Quota exceeded');

    const malformed = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ total: 1 }),
    }));
    await expect(fetchAllDeezerAlbums({ artistId: 7543848, fetchImpl: malformed }))
      .rejects.toThrow('Deezer albums response has no data array');

    const missingTotal = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ data: [] }),
    }));
    await expect(fetchAllDeezerAlbums({ artistId: 7543848, fetchImpl: missingTotal }))
      .rejects.toThrow('Deezer albums response has no valid total');

    expect(() => requireDeezerData(
      { error: { message: 'Quota exceeded' } },
      'artist search',
    )).toThrow('Deezer artist search provider error: Quota exceeded');
    expect(() => requireDeezerData({ total: 1 }, 'artist search'))
      .toThrow('Deezer artist search response has no data array');
  });

  it('performs no filesystem operation in dry-run mode', () => {
    const mkdirSync = vi.fn();
    const writeFileSync = vi.fn();

    expect(persistDeezerCache({
      filePath: 'ignored/cache.json',
      record: albumCacheRecord(7543848, completeResult([])),
      dryRun: true,
      mkdirSync,
      writeFileSync,
    })).toBe(false);
    expect(mkdirSync).not.toHaveBeenCalled();
    expect(writeFileSync).not.toHaveBeenCalled();
  });
});
