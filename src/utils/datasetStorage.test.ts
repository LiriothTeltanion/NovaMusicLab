import { IDBFactory as MemoryIDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import defaultMusicData from '../data/music_dna_compiled.json';
import { createNovaMusicDatabase } from '../db/database';
import { initializeDatabase } from '../db/repository';
import type { GenreAssignment, MusicDnaData } from '../types';
import {
  buildExport,
  claimDatasetMutationIntent,
  clearDataset,
  clearDatasetResult,
  DATASET_SCHEMA_VERSION,
  isMusicDnaData,
  loadDataset,
  loadDatasetResult,
  NOVA_EXPORT_VERSION,
  parseExport,
  saveDataset,
  saveDatasetResult,
} from './datasetStorage';

const data = defaultMusicData as unknown as MusicDnaData;
const ACTIVE_KEY = 'active';
const MUTATION_INTENT_KEY = '__nova_dataset_mutation_intent__';
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
  getOpenCount: () => number;
  waitForFirstMutation: () => Promise<void>;
  releaseFirstMutation: () => void;
}

function createFakeIndexedDb(seed?: unknown, delayFirstMutation = false): FakeIndexedDb {
  const records = new Map<IDBValidKey, unknown>();
  if (seed !== undefined) records.set(ACTIVE_KEY, seed);
  let version = 0;
  let storeExists = false;
  let openCount = 0;
  let firstMutationClaimed = false;
  let signalFirstMutation!: () => void;
  let releaseFirstMutation!: () => void;
  const firstMutationStarted = new Promise<void>(resolve => {
    signalFirstMutation = resolve;
  });
  const firstMutationRelease = new Promise<void>(resolve => {
    releaseFirstMutation = resolve;
  });

  const factory = {
    open: (_name: string, requestedVersion?: number) => {
      openCount += 1;
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

            const scheduleRequest = (operation: () => unknown, mutation = false) => {
              pending += 1;
              completionTicket += 1;
              const req = {} as IDBRequest;
              queueMicrotask(async () => {
                if (delayFirstMutation && mutation && !firstMutationClaimed) {
                  firstMutationClaimed = true;
                  signalFirstMutation();
                  await firstMutationRelease;
                }
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
              }, true),
              delete: (key: IDBValidKey) => scheduleRequest(() => records.delete(key), true),
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

  return {
    factory,
    records,
    getOpenCount: () => openCount,
    waitForFirstMutation: () => firstMutationStarted,
    releaseFirstMutation,
  };
}

function createFailingIndexedDb(
  failedMethod: 'get' | 'put' | 'delete',
  errorName: string,
): IDBFactory {
  return {
    open: () => {
      const openRequest = {} as IDBOpenDBRequest;
      queueMicrotask(() => {
        const db = {
          objectStoreNames: { contains: () => true } as unknown as DOMStringList,
          close: vi.fn(),
          onversionchange: null,
          transaction: () => {
            const transaction = {
              oncomplete: null,
              onerror: null,
              onabort: null,
            } as unknown as IDBTransaction;
            const fail = () => {
              const request = {} as IDBRequest;
              const error = { name: errorName };
              Object.defineProperty(request, 'error', { configurable: true, value: error });
              queueMicrotask(() => {
                Object.defineProperty(transaction, 'error', { configurable: true, value: error });
                transaction.onerror?.(new Event('error'));
              });
              return request;
            };
            const complete = (value?: unknown) => {
              const request = {} as IDBRequest;
              queueMicrotask(() => {
                Object.defineProperty(request, 'result', { configurable: true, value });
                request.onsuccess?.(new Event('success'));
                // Let an onsuccess handler enqueue a follow-up request before
                // the fake transaction completes, matching real IndexedDB.
                queueMicrotask(() => transaction.oncomplete?.(new Event('complete')));
              });
              return request;
            };
            const store = {
              get: () => failedMethod === 'get' ? fail() : complete(undefined),
              put: () => failedMethod === 'put' ? fail() : complete(ACTIVE_KEY),
              delete: () => failedMethod === 'delete' ? fail() : complete(undefined),
            } as unknown as IDBObjectStore;
            Object.assign(transaction, { objectStore: () => store });
            return transaction;
          },
        } as unknown as IDBDatabase;
        Object.defineProperty(openRequest, 'result', { configurable: true, value: db });
        openRequest.onsuccess?.(new Event('success'));
      });
      return openRequest;
    },
  } as unknown as IDBFactory;
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

  it('keeps archives compatible when every optional dataset field is absent', () => {
    const legacyCore = { ...data } as Record<string, unknown>;
    [
      'artist_genre_catalog',
      'artist_origin_countries',
      'daily_plays',
      'monthly_activity',
      'platform_breakdown',
      'source_summary',
      'knowledge_summary',
      'records',
      'personality_matrix',
      'archetypes',
      'artist_profile',
    ].forEach(field => delete legacyCore[field]);

    expect(isMusicDnaData(legacyCore)).toBe(true);
  });

  it('accepts complete legacy identity blocks that older backups may contain', () => {
    const trait = {
      score: 72,
      evidence: 'Documented listening pattern',
      artists: ['Archive Artist'],
      positive: 'Curiosity',
      shadow: 'Restlessness',
      tip: 'Keep exploring',
    };
    const legacyIdentity = {
      ...data,
      personality_matrix: {
        sensibilidad_emocional: trait,
        nostalgia: trait,
        energia: trait,
        oscuridad_estetica: trait,
        creatividad: trait,
        rebeldia: trait,
        futurismo: trait,
      },
      archetypes: [{
        name: 'The Explorer',
        desc: 'A documented legacy archetype',
        artists: ['Archive Artist'],
        tracks: ['Archive Track'],
        color: '#00e5ff',
        aesthetic: 'Prismatic archive',
        strength: 'Curiosity',
        wound: 'Restlessness',
        advice: 'Keep exploring',
      }],
      artist_profile: {
        alias: 'Nova',
        sound: 'Layered',
        tempo: 'Variable',
        influences: ['Archive Artist'],
        aesthetic: 'Cyber museum',
        ep_concept: {
          title: 'Memory Atlas',
          description: 'A legacy concept',
          tracklist: ['First Light'],
        },
        live_show: 'Immersive projections',
      },
    };

    expect(isMusicDnaData(legacyIdentity)).toBe(true);
  });

  it.each([
    ['artist_origin_countries', { artist_origin_countries: [{ country: 'Japan', plays: 'many' }] }],
    ['daily_plays', { daily_plays: { '2026-07-16': 'many' } }],
    ['monthly_activity', { monthly_activity: [{ year: 2026, month: 'July', plays: 4 }] }],
    ['platform_breakdown', { platform_breakdown: {} }],
    ['source_summary', { source_summary: { ...data.source_summary!, source_note: [] } }],
    ['knowledge_summary', { knowledge_summary: { ...data.knowledge_summary!, top_matches: [{}] } }],
    ['records', { records: { ...data.records!, best_session_tracks: 'many' } }],
    ['personality_matrix', { personality_matrix: { nostalgia: { score: 1 } } }],
    ['archetypes', { archetypes: [{ name: 'Incomplete' }] }],
    ['artist_profile', { artist_profile: { alias: 'Incomplete' } }],
  ])('rejects a malformed optional %s block', (_field, invalidOptional) => {
    expect(isMusicDnaData({ ...data, ...invalidOptional })).toBe(false);
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
    expect(parseExport({
      ...buildExport(data, 'x'),
      data: { ...data, platform_breakdown: {} },
    })).toBeNull();
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
    await expect(saveDatasetResult(data, 'test')).resolves.toMatchObject({
      ok: false,
      status: 'unavailable',
      reason: 'indexeddb-unavailable',
    });
    await expect(loadDatasetResult()).resolves.toMatchObject({ ok: false, status: 'unavailable' });
    await expect(clearDatasetResult()).resolves.toMatchObject({ ok: false, status: 'unavailable' });
    await expect(saveDataset(data, 'test')).resolves.toBe(false);
    await expect(loadDataset()).resolves.toBeNull();
    await expect(clearDataset()).resolves.toBeUndefined();
  });

  it('distinguishes a missing archive from an invalid record and a restore transaction failure', async () => {
    const empty = createFakeIndexedDb();
    vi.stubGlobal('indexedDB', empty.factory);
    await expect(loadDatasetResult()).resolves.toEqual({ ok: true, status: 'missing' });

    const invalid = createFakeIndexedDb({ data: { core_metrics: 'broken' } });
    vi.stubGlobal('indexedDB', invalid.factory);
    await expect(loadDatasetResult()).resolves.toMatchObject({
      ok: false,
      status: 'invalid',
      reason: 'invalid-stored-record',
    });

    vi.stubGlobal('indexedDB', createFailingIndexedDb('get', 'TransactionError'));
    await expect(loadDatasetResult()).resolves.toMatchObject({
      ok: false,
      status: 'error',
      reason: 'transaction-failed',
    });
  });

  it('rejects a stored archive whose platform breakdown is an object instead of rows', async () => {
    const corrupt = {
      schemaVersion: DATASET_SCHEMA_VERSION,
      data: { ...data, platform_breakdown: {} },
      savedAt: '2026-07-16T10:00:00.000Z',
      sourceLabel: 'Corrupt platform backup',
      genreAssignments: [],
    };
    const fake = createFakeIndexedDb(corrupt);
    vi.stubGlobal('indexedDB', fake.factory);

    await expect(loadDatasetResult()).resolves.toMatchObject({
      ok: false,
      status: 'invalid',
      reason: 'invalid-stored-record',
    });
    expect(fake.records.get(ACTIVE_KEY)).toBe(corrupt);
  });

  it('reports a quota-like save denial instead of claiming persistence', async () => {
    vi.stubGlobal('indexedDB', createFailingIndexedDb('put', 'QuotaExceededError'));

    await expect(saveDatasetResult(data, 'large archive')).resolves.toMatchObject({
      ok: false,
      status: 'error',
      reason: 'quota-exceeded',
      recoverable: true,
    });
    await expect(saveDataset(data, 'large archive')).resolves.toBe(false);
  });

  it('reports a clear transaction failure instead of silently succeeding', async () => {
    vi.stubGlobal('indexedDB', createFailingIndexedDb('delete', 'TransactionError'));

    await expect(clearDatasetResult()).resolves.toMatchObject({
      ok: false,
      status: 'error',
      operation: 'clear',
      reason: 'transaction-failed',
    });
  });

  it('serializes overlapping saves so the latest invocation remains active', async () => {
    const fake = createFakeIndexedDb(undefined, true);
    vi.stubGlobal('indexedDB', fake.factory);
    const completionOrder: string[] = [];

    const firstSave = saveDatasetResult(data, 'First save')
      .then(result => { completionOrder.push('first-save'); return result; });
    await fake.waitForFirstMutation();
    const secondSave = saveDatasetResult(data, 'Second save')
      .then(result => { completionOrder.push('second-save'); return result; });
    await Promise.resolve();
    await Promise.resolve();
    const opensBeforeRelease = fake.getOpenCount();
    fake.releaseFirstMutation();

    await expect(Promise.all([firstSave, secondSave])).resolves.toMatchObject([
      { ok: true, status: 'saved' },
      { ok: true, status: 'saved' },
    ]);
    expect(opensBeforeRelease).toBe(1);
    expect(completionOrder).toEqual(['first-save', 'second-save']);
    expect(fake.records.get(ACTIVE_KEY)).toMatchObject({ sourceLabel: 'Second save' });
  });

  it('serializes clear then save so the replacement archive is not deleted', async () => {
    const fake = createFakeIndexedDb(buildExport(data, 'Existing archive'), true);
    vi.stubGlobal('indexedDB', fake.factory);
    const completionOrder: string[] = [];

    const clear = clearDatasetResult()
      .then(result => { completionOrder.push('clear'); return result; });
    await fake.waitForFirstMutation();
    const save = saveDatasetResult(data, 'Replacement archive')
      .then(result => { completionOrder.push('save'); return result; });
    await Promise.resolve();
    await Promise.resolve();
    const opensBeforeRelease = fake.getOpenCount();
    fake.releaseFirstMutation();

    await expect(Promise.all([clear, save])).resolves.toMatchObject([
      { ok: true, status: 'cleared' },
      { ok: true, status: 'saved' },
    ]);
    expect(opensBeforeRelease).toBe(1);
    expect(completionOrder).toEqual(['clear', 'save']);
    expect(fake.records.get(ACTIVE_KEY)).toMatchObject({ sourceLabel: 'Replacement archive' });
  });

  it('serializes save then clear so a delayed save cannot recreate the archive', async () => {
    const fake = createFakeIndexedDb(undefined, true);
    vi.stubGlobal('indexedDB', fake.factory);
    const completionOrder: string[] = [];

    const save = saveDatasetResult(data, 'Archive to clear')
      .then(result => { completionOrder.push('save'); return result; });
    await fake.waitForFirstMutation();
    const clear = clearDatasetResult()
      .then(result => { completionOrder.push('clear'); return result; });
    await Promise.resolve();
    await Promise.resolve();
    const opensBeforeRelease = fake.getOpenCount();
    fake.releaseFirstMutation();

    await expect(Promise.all([save, clear])).resolves.toMatchObject([
      { ok: true, status: 'saved' },
      { ok: true, status: 'cleared' },
    ]);
    expect(opensBeforeRelease).toBe(1);
    expect(completionOrder).toEqual(['save', 'clear']);
    expect(fake.records.has(ACTIVE_KEY)).toBe(false);
  });

  it('rejects a slow tab A import after tab B claims and completes a newer Clear', async () => {
    const fake = createFakeIndexedDb();
    vi.stubGlobal('indexedDB', fake.factory);
    await saveDatasetResult(data, 'Existing archive');

    const tabAImport = await claimDatasetMutationIntent('save');
    const tabBClear = await claimDatasetMutationIntent('clear');
    expect(tabAImport).toMatchObject({ ok: true, status: 'claimed' });
    expect(tabBClear).toMatchObject({ ok: true, status: 'claimed' });
    if (!tabAImport.ok || !tabBClear.ok) throw new Error('Intent setup failed.');

    await expect(clearDatasetResult(tabBClear.intent)).resolves.toEqual({
      ok: true,
      status: 'cleared',
    });
    await expect(saveDatasetResult(data, 'Slow tab A import', [], tabAImport.intent)).resolves.toMatchObject({
      ok: false,
      status: 'stale',
      operation: 'save',
      reason: 'stale-intent',
    });

    expect(fake.records.has(ACTIVE_KEY)).toBe(false);
    expect(fake.records.get(MUTATION_INTENT_KEY)).toMatchObject({
      epoch: tabBClear.intent.epoch,
      ownerId: tabBClear.intent.ownerId,
      operation: 'clear',
    });
  });

  it('keeps tab B import when an older tab A import finishes afterward', async () => {
    const fake = createFakeIndexedDb();
    vi.stubGlobal('indexedDB', fake.factory);

    const tabAImport = await claimDatasetMutationIntent('save');
    const tabBImport = await claimDatasetMutationIntent('save');
    if (!tabAImport.ok || !tabBImport.ok) throw new Error('Intent setup failed.');

    await expect(saveDatasetResult(data, 'Newer tab B import', [], tabBImport.intent)).resolves.toMatchObject({
      ok: true,
      status: 'saved',
    });
    await expect(saveDatasetResult(data, 'Older tab A import', [], tabAImport.intent)).resolves.toMatchObject({
      ok: false,
      status: 'stale',
      reason: 'stale-intent',
    });

    expect(fake.records.get(ACTIVE_KEY)).toMatchObject({ sourceLabel: 'Newer tab B import' });
  });

  it('uses an exclusive Web Lock when the supported browser API is available', async () => {
    const fake = createFakeIndexedDb();
    const request = vi.fn(async (
      _name: string,
      _options: LockOptions,
      callback: LockGrantedCallback<unknown>,
    ) => callback(null));
    vi.stubGlobal('indexedDB', fake.factory);
    vi.stubGlobal('navigator', { locks: { request } });

    await expect(claimDatasetMutationIntent('save')).resolves.toMatchObject({
      ok: true,
      status: 'claimed',
    });
    expect(request).toHaveBeenCalledWith(
      'nova-music-lab:dataset-mutation',
      { mode: 'exclusive' },
      expect.any(Function),
    );
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

  it('interoperates after the Dexie v4 bootstrap upgrades IndexedDB to version 40', async () => {
    const indexedDB = new MemoryIDBFactory();
    const db = createNovaMusicDatabase({
      name: 'nova-music-lab',
      indexedDB,
      IDBKeyRange,
    });
    await initializeDatabase(db);
    expect(db.backendDB().version).toBe(40);
    vi.stubGlobal('indexedDB', indexedDB);

    await expect(saveDataset(data, 'Dexie v4 compatible', genreAssignments)).resolves.toBe(true);
    await expect(loadDataset()).resolves.toMatchObject({
      sourceLabel: 'Dexie v4 compatible',
      genreAssignments,
    });
    await clearDataset();
    await expect(loadDataset()).resolves.toBeNull();

    db.close();
    await db.delete();
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
