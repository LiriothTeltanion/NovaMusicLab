import { afterEach, describe, expect, it, vi } from 'vitest';
import defaultMusicData from '../data/music_dna_compiled.json';
import type { GenreAssignment, MusicDnaData } from '../types';
import {
  buildExport,
  clearDataset,
  DATASET_SCHEMA_VERSION,
  isMusicDnaData,
  loadDataset,
  NOVA_EXPORT_VERSION,
  parseExport,
  saveDataset,
} from './datasetStorage';

const data = defaultMusicData as unknown as MusicDnaData;
const ACTIVE_KEY = 'active';
const genreAssignments: GenreAssignment[] = [{
  artistKey: 'sleep token',
  artistName: 'Sleep Token',
  family: 'Metal',
  tags: ['Progressive Metal', 'Djent'],
  updatedAt: '2026-07-14T10:00:00.000Z',
}];

interface FakeIndexedDb {
  factory: IDBFactory;
  records: Map<IDBValidKey, unknown>;
}

function createFakeIndexedDb(seed?: unknown): FakeIndexedDb {
  const records = new Map<IDBValidKey, unknown>();
  if (seed !== undefined) records.set(ACTIVE_KEY, seed);
  let version = 0;
  let storeExists = false;

  const factory = {
    open: (_name: string, requestedVersion?: number) => {
      const request = {} as IDBOpenDBRequest;
      queueMicrotask(() => {
        const targetVersion = requestedVersion ?? 1;
        const objectStoreNames = ({
          contains: (name: string) => name === 'datasets' && storeExists,
        } as unknown) as DOMStringList;

        const db = {
          objectStoreNames,
          onversionchange: null,
          createObjectStore: () => {
            storeExists = true;
            return {} as IDBObjectStore;
          },
          close: vi.fn(),
          transaction: () => {
            if (!storeExists) throw new DOMException('Object store not found', 'NotFoundError');
            const transaction = {
              oncomplete: null,
              onerror: null,
              onabort: null,
            } as unknown as IDBTransaction;
            let pending = 0;
            let completed = false;
            let completionTicket = 0;

            const scheduleComplete = () => {
              const ticket = ++completionTicket;
              queueMicrotask(() => {
                if (!completed && pending === 0 && ticket === completionTicket) {
                  completed = true;
                  transaction.oncomplete?.(new Event('complete'));
                }
              });
            };

            const scheduleRequest = (operation: () => unknown) => {
              pending += 1;
              completionTicket += 1;
              const req = {} as IDBRequest;
              queueMicrotask(() => {
                const result = operation();
                Object.defineProperty(req, 'result', { configurable: true, value: result });
                req.onsuccess?.(new Event('success'));
                pending -= 1;
                scheduleComplete();
              });
              return req;
            };

            const store = {
              get: (key: IDBValidKey) => scheduleRequest(() => records.get(key)),
              put: (value: unknown, key: IDBValidKey) => scheduleRequest(() => {
                records.set(key, value);
                return key;
              }),
              delete: (key: IDBValidKey) => scheduleRequest(() => records.delete(key)),
            } as unknown as IDBObjectStore;

            Object.assign(transaction, { objectStore: () => store });
            return transaction;
          },
        } as unknown as IDBDatabase;

        Object.defineProperty(request, 'result', { configurable: true, value: db });
        if (targetVersion > version) {
          request.onupgradeneeded?.(new Event('upgradeneeded') as IDBVersionChangeEvent);
          version = targetVersion;
        }
        request.onsuccess?.(new Event('success'));
      });
      return request;
    },
  } as IDBFactory;

  return { factory, records };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('datasetStorage runtime schema', () => {
  it('accepts the compiled dataset and rejects damaged metric and heatmap shapes', () => {
    expect(isMusicDnaData(data)).toBe(true);
    expect(isMusicDnaData({ ...data, core_metrics: { ...data.core_metrics, total_plays: -1 } })).toBe(false);
    expect(isMusicDnaData({ ...data, heatmap: data.heatmap.slice(0, 23) })).toBe(false);
  });

  it('validates an optional archive-wide genre catalog at the storage boundary', () => {
    const catalogEntry = {
      artistKey: 'Long Tail Artist',
      name: 'Long Tail Artist',
      plays: data.core_metrics.total_plays,
      automaticGenre: 'Unclassified',
      automaticFamily: 'Unclassified',
      country: 'Unknown',
      source: 'unclassified' as const,
    };
    const withCatalog = {
      ...data,
      core_metrics: { ...data.core_metrics, unique_artists: 1 },
      artist_genre_catalog: [catalogEntry],
    };

    expect(isMusicDnaData(withCatalog)).toBe(true);
    expect(isMusicDnaData({ ...withCatalog, artist_genre_catalog: [{ ...catalogEntry, plays: 1 }] })).toBe(false);
    expect(isMusicDnaData({ ...withCatalog, artist_genre_catalog: [catalogEntry, catalogEntry] })).toBe(false);
  });
});

describe('datasetStorage export wrapper', () => {
  it('round-trips the current schema through buildExport + parseExport', () => {
    const wrapped = buildExport(data, '  test   source  ', genreAssignments);
    expect(wrapped.nova_music_export).toBe(true);
    expect(wrapped.version).toBe(NOVA_EXPORT_VERSION);
    expect(wrapped.source_label).toBe('test source');
    expect(wrapped.genre_assignments).toEqual(genreAssignments);

    const reparsed = parseExport(JSON.parse(JSON.stringify(wrapped)));
    expect(reparsed).not.toBeNull();
    expect(reparsed?.data.core_metrics.total_plays).toBe(data.core_metrics.total_plays);
    expect(reparsed?.genre_assignments).toEqual(genreAssignments);
  });

  it.each([1, 2])('migrates a valid v%s portable export with empty assignments', version => {
    const current = buildExport(data, 'legacy source');
    const migrated = parseExport({ ...current, version, genre_assignments: 'ignored legacy field' });
    expect(migrated?.version).toBe(NOVA_EXPORT_VERSION);
    expect(migrated?.source_label).toBe('legacy source');
    expect(migrated?.genre_assignments).toEqual([]);
  });

  it('sanitizes current genre assignments without discarding their meaning', () => {
    const wrapped = buildExport(data, 'x', [{
      ...genreAssignments[0],
      artistKey: '  sleep   token ',
      artistName: ' Sleep   Token ',
      tags: [' Progressive   Metal ', 'progressive metal', ' Djent '],
      updatedAt: '2026-07-14T13:00:00+03:00',
    }]);
    expect(wrapped.genre_assignments).toEqual(genreAssignments);
  });

  it('serializes with nova_music_export as an early sniffable key', () => {
    const payload = JSON.stringify(buildExport(data, 'x'));
    expect(payload.slice(0, 300)).toContain('"nova_music_export"');
  });

  it('rejects source-service arrays, unknown versions and corrupt payloads', () => {
    expect(parseExport([{ ts: '2024-01-01T00:00:00Z', master_metadata_track_name: 'Song' }])).toBeNull();
    expect(parseExport({ ...buildExport(data, 'x'), version: NOVA_EXPORT_VERSION + 1 })).toBeNull();
    expect(parseExport({ ...buildExport(data, 'x'), exported_at: 'not-a-date' })).toBeNull();
    expect(parseExport({ ...buildExport(data, 'x'), data: { ...data, top_artists: [{ name: 'Broken' }] } })).toBeNull();
  });

  it('rejects malformed or ambiguous assignments in current v3 exports', () => {
    const current = buildExport(data, 'x', genreAssignments);
    expect(parseExport({ ...current, genre_assignments: undefined })).toBeNull();
    expect(parseExport({ ...current, genre_assignments: [{ ...genreAssignments[0], tags: 'Metal' }] })).toBeNull();
    expect(parseExport({ ...current, genre_assignments: [{ ...genreAssignments[0], updatedAt: 'yesterday' }] })).toBeNull();
    expect(parseExport({
      ...current,
      genre_assignments: [...genreAssignments, { ...genreAssignments[0], artistName: 'Duplicate' }],
    })).toBeNull();
  });

  it('rejects unrelated objects and near-misses', () => {
    expect(parseExport(null)).toBeNull();
    expect(parseExport('nova_music_export')).toBeNull();
    expect(parseExport({ nova_music_export: true })).toBeNull();
    expect(parseExport({ nova_music_export: true, version: 2, data: {} })).toBeNull();
    expect(parseExport({ nova_music_export: 'yes', version: 2, data })).toBeNull();
  });
});

describe('datasetStorage IndexedDB helpers', () => {
  it('degrades gracefully when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);
    await expect(saveDataset(data, 'test')).resolves.toBe(false);
    await expect(loadDataset()).resolves.toBeNull();
    await expect(clearDataset()).resolves.toBeUndefined();
  });

  it('persists, restores and clears a validated v3 record', async () => {
    const fake = createFakeIndexedDb();
    vi.stubGlobal('indexedDB', fake.factory);

    await expect(saveDataset(data, '  Last.fm   + Spotify  ', genreAssignments)).resolves.toBe(true);
    expect(fake.records.get(ACTIVE_KEY)).toMatchObject({
      schemaVersion: DATASET_SCHEMA_VERSION,
      sourceLabel: 'Last.fm + Spotify',
      genreAssignments,
    });

    await expect(loadDataset()).resolves.toMatchObject({
      schemaVersion: DATASET_SCHEMA_VERSION,
      sourceLabel: 'Last.fm + Spotify',
      data,
      genreAssignments,
    });
    await clearDataset();
    expect(fake.records.has(ACTIVE_KEY)).toBe(false);
  });

  it('migrates a valid legacy record in place without losing the archive', async () => {
    const fake = createFakeIndexedDb({
      data,
      savedAt: '2025-05-01T10:00:00.000Z',
      sourceLabel: 'Legacy upload',
    });
    vi.stubGlobal('indexedDB', fake.factory);

    await expect(loadDataset()).resolves.toMatchObject({
      schemaVersion: DATASET_SCHEMA_VERSION,
      sourceLabel: 'Legacy upload',
      data,
      genreAssignments: [],
    });
    expect(fake.records.get(ACTIVE_KEY)).toMatchObject({
      schemaVersion: DATASET_SCHEMA_VERSION,
      genreAssignments: [],
    });
  });

  it('migrates a valid v2 record in place with empty assignments', async () => {
    const fake = createFakeIndexedDb({
      schemaVersion: 2,
      data,
      savedAt: '2025-05-01T10:00:00.000Z',
      sourceLabel: 'Version two upload',
    });
    vi.stubGlobal('indexedDB', fake.factory);

    await expect(loadDataset()).resolves.toMatchObject({
      schemaVersion: DATASET_SCHEMA_VERSION,
      genreAssignments: [],
    });
    expect(fake.records.get(ACTIVE_KEY)).toMatchObject({
      schemaVersion: DATASET_SCHEMA_VERSION,
      genreAssignments: [],
    });
  });

  it('refuses a corrupt current-v3 assignment list without overwriting it', async () => {
    const corrupt = {
      schemaVersion: DATASET_SCHEMA_VERSION,
      data,
      savedAt: '2025-05-01T10:00:00.000Z',
      sourceLabel: 'Current upload',
      genreAssignments: [{ ...genreAssignments[0], family: '' }],
    };
    const fake = createFakeIndexedDb(corrupt);
    vi.stubGlobal('indexedDB', fake.factory);

    await expect(loadDataset()).resolves.toBeNull();
    expect(fake.records.get(ACTIVE_KEY)).toBe(corrupt);
  });

  it('refuses corrupt records and leaves them untouched for possible recovery', async () => {
    const corrupt = { data: { core_metrics: { total_plays: 'many' } }, savedAt: '2025-05-01' };
    const fake = createFakeIndexedDb(corrupt);
    vi.stubGlobal('indexedDB', fake.factory);

    await expect(loadDataset()).resolves.toBeNull();
    expect(fake.records.get(ACTIVE_KEY)).toBe(corrupt);
  });

  it('does not open IndexedDB when asked to save an invalid runtime payload', async () => {
    const open = vi.fn();
    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory);
    const invalid = { ...data, heatmap: [] } as MusicDnaData;
    await expect(saveDataset(invalid, 'broken')).resolves.toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it('does not open IndexedDB when asked to save invalid genre assignments', async () => {
    const open = vi.fn();
    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory);
    const invalid = [{ ...genreAssignments[0], updatedAt: 'not-a-date' }] as GenreAssignment[];
    await expect(saveDataset(data, 'broken', invalid)).resolves.toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
});
