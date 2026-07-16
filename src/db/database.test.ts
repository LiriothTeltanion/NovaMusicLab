import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';
import { artistKnowledgeManifest } from '../knowledge/manifest';
import { createNovaMusicDatabase, type NovaMusicDatabase } from './database';
import {
  activateStagedMuseum,
  initializeDatabase,
  installArtistKnowledge,
  loadMuseum,
  saveMuseum,
} from './repository';
import type { MuseumRecord } from './schema';
import {
  DATABASE_METADATA_KEY,
  NOVA_DATABASE_NAME,
  NOVA_DATABASE_SCHEMA_VERSION,
  NOVA_PARSER_VERSION,
} from './schema';

const openDatabases: NovaMusicDatabase[] = [];

function testDatabase(name: string, indexedDB = new IDBFactory()) {
  const db = createNovaMusicDatabase({ name, indexedDB, IDBKeyRange });
  openDatabases.push(db);
  return { db, indexedDB };
}

function museum(id: string, status: MuseumRecord['status'] = 'staging'): MuseumRecord {
  return {
    id,
    profileId: `profile:${id}`,
    schemaVersion: NOVA_DATABASE_SCHEMA_VERSION,
    datasetKind: 'private-import',
    displayName: `Museum ${id}`,
    timeZone: 'Asia/Jerusalem',
    privacyMode: true,
    status,
    activeImportId: null,
    importIds: [],
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z',
  };
}

afterEach(async () => {
  for (const db of openDatabases.splice(0)) {
    db.close();
    await db.delete();
  }
});

describe('NovaMusicDatabase v4', () => {
  it('opens the complete local-first schema and writes explicit metadata', async () => {
    const { db } = testDatabase('nova-test-schema');
    const result = await initializeDatabase(db);

    expect(result).toMatchObject({
      ok: true,
      status: 'success',
      action: 'opened',
      value: {
        schemaVersion: 4,
        localFirst: true,
        cloudDependency: null,
      },
    });
    expect(db.tables.map(table => table.name).sort()).toEqual([
      'aggregates',
      'artistKnowledge',
      'capabilities',
      'datasets',
      'dedupeClusters',
      'entities',
      'events',
      'importIssues',
      'imports',
      'insights',
      'museums',
      'settings',
      'snapshots',
      'visualAssets',
    ]);
  });

  it('preserves the existing v2 datasets store during the v4 upgrade', async () => {
    const indexedDB = new IDBFactory();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('nova-test-legacy', 2);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('datasets').put({ schemaVersion: 3, marker: 'legacy' }, 'active');
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });

    const { db } = testDatabase('nova-test-legacy', indexedDB);
    await initializeDatabase(db);

    await expect(db.datasets.get('active')).resolves.toEqual({ schemaVersion: 3, marker: 'legacy' });
  });

  it('rewrites incomplete metadata instead of accepting a partial object as valid', async () => {
    const { db } = testDatabase('nova-test-metadata-repair');
    await db.open();
    await db.settings.put({
      key: DATABASE_METADATA_KEY,
      museumId: null,
      value: { schemaVersion: 4, localFirst: true },
      updatedAt: '2026-07-16T00:00:00.000Z',
    });

    const result = await initializeDatabase(db);

    expect(result).toMatchObject({
      ok: true,
      value: {
        databaseName: NOVA_DATABASE_NAME,
        parserVersion: NOVA_PARSER_VERSION,
        cloudDependency: null,
        initializedAt: expect.any(String),
      },
    });
    await expect(db.settings.get(DATABASE_METADATA_KEY)).resolves.toMatchObject({
      value: {
        databaseName: NOVA_DATABASE_NAME,
        parserVersion: NOVA_PARSER_VERSION,
        cloudDependency: null,
      },
    });
  });

  it('returns explicit save, load, not-found and validation states', async () => {
    const { db } = testDatabase('nova-test-results');
    const saved = await saveMuseum(museum('private'), db);
    const loaded = await loadMuseum('private', db);
    const missing = await loadMuseum('missing', db);
    const invalid = await saveMuseum({ ...museum('invalid'), timeZone: '' }, db);

    expect(saved).toMatchObject({ ok: true, action: 'saved' });
    expect(loaded).toMatchObject({ ok: true, action: 'loaded', value: { id: 'private' } });
    expect(missing).toMatchObject({ ok: false, status: 'not-found' });
    expect(invalid).toMatchObject({ ok: false, status: 'validation-error' });
  });

  it('atomically archives the previous museum when a staged museum activates', async () => {
    const { db } = testDatabase('nova-test-activation');
    await saveMuseum(museum('current', 'active'), db);
    await saveMuseum(museum('next', 'staging'), db);

    const activated = await activateStagedMuseum('next', db);

    expect(activated).toMatchObject({ ok: true, value: { id: 'next', status: 'active' } });
    await expect(db.museums.get('current')).resolves.toMatchObject({ status: 'archived' });
  });

  it('rejects a second direct active save without mutating either museum', async () => {
    const { db } = testDatabase('nova-test-single-active');
    const current = museum('current', 'active');
    const replacement = museum('replacement', 'active');

    await expect(saveMuseum(current, db)).resolves.toMatchObject({ ok: true });
    await expect(saveMuseum(replacement, db)).resolves.toMatchObject({
      ok: false,
      status: 'validation-error',
      errorName: 'ActiveMuseumConflictError',
    });

    await expect(db.museums.where('status').equals('active').toArray()).resolves.toEqual([current]);
    await expect(db.museums.get('replacement')).resolves.toBeUndefined();
  });

  it('serializes competing active saves so exactly one candidate wins', async () => {
    const { db } = testDatabase('nova-test-concurrent-active');

    const results = await Promise.all([
      saveMuseum(museum('candidate-a', 'active'), db),
      saveMuseum(museum('candidate-b', 'active'), db),
    ]);

    expect(results.filter(result => result.ok)).toHaveLength(1);
    expect(results.filter(result => !result.ok && result.status === 'validation-error')).toHaveLength(1);
    await expect(db.museums.where('status').equals('active').count()).resolves.toBe(1);
    await expect(db.museums.count()).resolves.toBe(1);
  });

  it('allows an in-place update of the existing active museum', async () => {
    const { db } = testDatabase('nova-test-active-update');
    const current = museum('current', 'active');

    await saveMuseum(current, db);
    const updated = { ...current, displayName: 'Updated museum' };

    await expect(saveMuseum(updated, db)).resolves.toMatchObject({
      ok: true,
      value: { id: 'current', displayName: 'Updated museum', status: 'active' },
    });
    await expect(db.museums.where('status').equals('active').count()).resolves.toBe(1);
  });

  it('installs artist knowledge and artwork in one transaction', async () => {
    const { db } = testDatabase('nova-test-knowledge');

    const result = await installArtistKnowledge(artistKnowledgeManifest, db);

    expect(result).toMatchObject({
      ok: true,
      value: {
        artists: artistKnowledgeManifest.meta.artistCount,
        visualAssets: artistKnowledgeManifest.meta.visualAssetCount,
      },
    });
    await expect(db.artistKnowledge.count()).resolves.toBe(artistKnowledgeManifest.meta.artistCount);
    await expect(db.visualAssets.count()).resolves.toBe(artistKnowledgeManifest.meta.visualAssetCount);
  });
});
