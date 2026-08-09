import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseLastfmCsvRows } from '../src/utils/parser.ts';
import {
  fetchLastfmHistory,
  lastfmRowsToCsv,
  normalizeLastfmTrack,
  parseUtcBoundary,
  writeLastfmCsvAtomically,
} from './lib/lastfmHistoryExport.mjs';

const API_KEY = 'synthetic-test-key';
const temporaryDirectories = [];

function response(payload, { status = 200, headers = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: key => headers[key.toLowerCase()] ?? null },
    json: async () => payload,
  };
}

function track({ artist, album = '', name, uts, nowPlaying = false }) {
  return {
    artist: { '#text': artist },
    album: { '#text': album },
    name,
    ...(uts === undefined ? {} : { date: { uts: String(uts) } }),
    ...(nowPlaying ? { '@attr': { nowplaying: 'true' } } : {}),
  };
}

function pagePayload({ page, totalPages, total, tracks }) {
  return {
    recenttracks: {
      track: tracks,
      '@attr': {
        page: String(page),
        totalPages: String(totalPages),
        total: String(total),
      },
    },
  };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

describe('Last.fm local history export', () => {
  it('downloads a frozen paginated snapshot, skips explicit now-playing and preserves repeats', async () => {
    const requestedUrls = [];
    const fetchImpl = vi.fn(async url => {
      requestedUrls.push(new URL(url));
      const page = Number(new URL(url).searchParams.get('page'));
      if (page === 1) {
        return response(pagePayload({
          page: 1,
          totalPages: 2,
          total: 3,
          tracks: [
            track({ artist: 'Now', name: 'Playing', nowPlaying: true }),
            track({ artist: 'Björk', album: 'Debut', name: 'Human Behaviour', uts: 300 }),
            track({ artist: 'Loop Artist', album: 'Loop Album', name: 'Again', uts: 200 }),
          ],
        }));
      }
      return response(pagePayload({
        page: 2,
        totalPages: 2,
        total: 3,
        tracks: track({ artist: 'Loop Artist', album: 'Loop Album', name: 'Again', uts: 100 }),
      }));
    });

    const result = await fetchLastfmHistory({
      apiKey: API_KEY,
      lastfmUser: 'synthetic-listener',
      to: 500,
      fetchImpl,
      sleepImpl: async () => {},
    });

    expect(result.rows).toHaveLength(3);
    expect(result.rows.map(row => row.unixTime)).toEqual([100, 200, 300]);
    expect(result.rows.filter(row => row.track === 'Again')).toHaveLength(2);
    expect(result.nowPlayingSkipped).toBe(1);
    expect(requestedUrls).toHaveLength(2);
    expect(requestedUrls.every(url => url.searchParams.get('to') === '500')).toBe(true);
    expect(requestedUrls.every(url => url.searchParams.get('limit') === '200')).toBe(true);
  });

  it('treats an undated non-now-playing row as malformed', () => {
    expect(normalizeLastfmTrack(track({ artist: 'Artist', name: 'Track' }))).toEqual({ kind: 'invalid' });
    expect(normalizeLastfmTrack(track({ artist: 'Artist', name: 'Track', nowPlaying: true }))).toEqual({ kind: 'now-playing' });
  });

  it('retries transient HTTP and API failures without duplicating the page', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({}, { status: 429, headers: { 'retry-after': '0' } }))
      .mockResolvedValueOnce(response({ error: 16, message: 'temporary' }))
      .mockResolvedValueOnce(response(pagePayload({
        page: 1,
        totalPages: 1,
        total: 1,
        tracks: [track({ artist: 'Artist', name: 'Track', uts: 100 })],
      })));
    const sleeps = [];

    const result = await fetchLastfmHistory({
      apiKey: API_KEY,
      lastfmUser: 'synthetic-listener',
      to: 500,
      fetchImpl,
      sleepImpl: async milliseconds => sleeps.push(milliseconds),
    });

    expect(result.rows).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleeps).toEqual([0, 1_000]);
  });

  it('fails on changing totals or malformed rows instead of publishing an incomplete export', async () => {
    const changingTotalFetch = vi.fn()
      .mockResolvedValueOnce(response(pagePayload({
        page: 1,
        totalPages: 2,
        total: 2,
        tracks: [track({ artist: 'Artist', name: 'One', uts: 200 })],
      })))
      .mockResolvedValueOnce(response(pagePayload({
        page: 2,
        totalPages: 2,
        total: 3,
        tracks: [track({ artist: 'Artist', name: 'Two', uts: 100 })],
      })));

    await expect(fetchLastfmHistory({
      apiKey: API_KEY,
      lastfmUser: 'synthetic-listener',
      to: 500,
      fetchImpl: changingTotalFetch,
      sleepImpl: async () => {},
    })).rejects.toThrow('pagination changed');

    await expect(fetchLastfmHistory({
      apiKey: API_KEY,
      lastfmUser: 'synthetic-listener',
      to: 500,
      fetchImpl: async () => response(pagePayload({
        page: 1,
        totalPages: 1,
        total: 1,
        tracks: [track({ artist: '', name: 'Broken', uts: 100 })],
      })),
      sleepImpl: async () => {},
    })).rejects.toThrow('malformed dated row');
  });

  it('never includes the API key in a rejected-request error', async () => {
    let caught;
    try {
      await fetchLastfmHistory({
        apiKey: API_KEY,
        lastfmUser: 'synthetic-listener',
        to: 500,
        fetchImpl: async () => response({ error: 10, message: `bad ${API_KEY}` }),
        sleepImpl: async () => {},
      });
    } catch (error) {
      caught = error;
    }
    expect(caught?.message).toContain('invalid API key');
    expect(caught?.message).not.toContain(API_KEY);
  });

  it('round-trips commas, quotes, Unicode and newlines through Nova parser', () => {
    const rows = [{
      artist: 'Björk, Guðmundsdóttir',
      album: 'Album "One"',
      track: 'Line one\nLine two',
      date: '2026-08-01T12:34:56.000Z',
      unixTime: 1_754_051_696,
    }];
    const csv = lastfmRowsToCsv(rows);
    const parsed = parseLastfmCsvRows(csv);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      artist: rows[0].artist,
      album: rows[0].album,
      track: rows[0].track,
      ts_str: rows[0].date,
      source: 'lastfm',
    });
  });

  it('writes atomically, refuses overwrite and leaves no partial file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'nova-lastfm-test-'));
    temporaryDirectories.push(directory);
    const outputPath = join(directory, 'lastfm-history.csv');
    const rows = [{
      artist: 'Artist', album: 'Album', track: 'Track', date: '2026-08-01T00:00:00.000Z', unixTime: 1,
    }];

    const receipt = await writeLastfmCsvAtomically({ rows, outputPath });
    expect(receipt.path).toBe(outputPath);
    expect(receipt.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(await readFile(outputPath, 'utf8')).toContain('Artist,Album,Track,Date');
    await expect(writeLastfmCsvAtomically({ rows, outputPath })).rejects.toThrow('Refusing to overwrite');
  });

  it('parses intuitive UTC day boundaries', () => {
    expect(parseUtcBoundary('2026-08-01', 'from')).toBe(Date.parse('2026-08-01T00:00:00Z') / 1_000);
    expect(parseUtcBoundary('2026-08-01', 'to')).toBe(Date.parse('2026-08-01T23:59:59Z') / 1_000);
    expect(parseUtcBoundary('1754051696', 'from')).toBe(1_754_051_696);
  });
});
