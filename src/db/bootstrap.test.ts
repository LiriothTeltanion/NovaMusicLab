import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';
import artistKnowledgeManifestMeta from '../data/artist_knowledge_manifest_meta.json';
import { bootstrapLocalDataLayer, PUBLIC_DEMO_MUSEUM_ID } from './bootstrap';
import { createNovaMusicDatabase, type NovaMusicDatabase } from './database';
import { saveMuseum } from './repository';
import { NOVA_DATABASE_SCHEMA_VERSION, type MuseumRecord } from './schema';

const openDatabases: NovaMusicDatabase[] = [];

function testDatabase(name: string) {
  const db = createNovaMusicDatabase({
    name,
    indexedDB: new IDBFactory(),
    IDBKeyRange,
  });
  openDatabases.push(db);
  return db;
}

afterEach(async () => {
  for (const db of openDatabases.splice(0)) {
    db.close();
    await db.delete();
  }
});

describe('local data bootstrap', () => {
  it('installs the public museum and provenance-rich artist knowledge once', async () => {
    const db = testDatabase('nova-bootstrap-test');

    const first = await bootstrapLocalDataLayer(db);
    const second = await bootstrapLocalDataLayer(db);

    expect(first).toMatchObject({
      ok: true,
      value: {
        museumCreated: true,
        knowledgeInstalled: true,
        artistCount: artistKnowledgeManifestMeta.artistCount,
        visualAssetCount: artistKnowledgeManifestMeta.visualAssetCount,
      },
    });
    expect(second).toMatchObject({
      ok: true,
      value: { museumCreated: false, knowledgeInstalled: false },
    });
    await expect(db.museums.get(PUBLIC_DEMO_MUSEUM_ID)).resolves.toMatchObject({
      datasetKind: 'public-demo',
      status: 'archived',
    });
    await expect(db.museums.where('status').equals('active').count()).resolves.toBe(0);
    await expect(db.artistKnowledge.count()).resolves.toBe(artistKnowledgeManifestMeta.artistCount);
    await expect(db.visualAssets.count()).resolves.toBe(artistKnowledgeManifestMeta.visualAssetCount);
  });

  it('keeps a pre-existing private museum active and creates the public demo archived', async () => {
    const db = testDatabase('nova-bootstrap-private-active-test');
    const privateMuseum: MuseumRecord = {
      id: 'museum:private-kevin',
      profileId: 'profile:private-kevin',
      schemaVersion: NOVA_DATABASE_SCHEMA_VERSION,
      datasetKind: 'private-import',
      displayName: 'Kevin private museum',
      timeZone: 'Asia/Jerusalem',
      privacyMode: true,
      status: 'active',
      activeImportId: null,
      importIds: [],
      createdAt: '2026-07-16T00:00:00.000Z',
      updatedAt: '2026-07-16T00:00:00.000Z',
    };
    await saveMuseum(privateMuseum, db);

    const result = await bootstrapLocalDataLayer(db);

    expect(result).toMatchObject({ ok: true, value: { museumCreated: true } });
    await expect(db.museums.get(privateMuseum.id)).resolves.toMatchObject({ status: 'active' });
    await expect(db.museums.get(PUBLIC_DEMO_MUSEUM_ID)).resolves.toMatchObject({ status: 'archived' });
    await expect(db.museums.where('status').equals('active').count()).resolves.toBe(1);
  });

  it('does not create a split active pointer beside a legacy visitor archive', async () => {
    const db = testDatabase('nova-bootstrap-legacy-active-test');
    await db.open();
    await db.datasets.put({
      schemaVersion: 3,
      savedAt: '2026-07-16T00:00:00.000Z',
      sourceLabel: 'Visitor archive',
    }, 'active');

    const result = await bootstrapLocalDataLayer(db);

    expect(result).toMatchObject({ ok: true, value: { museumCreated: true } });
    await expect(db.datasets.get('active')).resolves.toMatchObject({ sourceLabel: 'Visitor archive' });
    await expect(db.museums.get(PUBLIC_DEMO_MUSEUM_ID)).resolves.toMatchObject({ status: 'archived' });
    await expect(db.museums.where('status').equals('active').count()).resolves.toBe(0);
  });
});
