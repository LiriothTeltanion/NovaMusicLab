import artistKnowledgeManifestMetaJson from '../data/artist_knowledge_manifest_meta.json';
import type { ArtistKnowledgeManifest } from '../knowledge/types';
import { getNovaMusicDatabase, type NovaMusicDatabase } from './database';
import { initializeDatabase, installArtistKnowledge, saveMuseum } from './repository';
import {
  NOVA_DATABASE_SCHEMA_VERSION,
  type MuseumRecord,
  type SettingRecord,
} from './schema';
import { storageFailure, storageSuccess, type StorageResult } from './storageResult';

export const PUBLIC_DEMO_MUSEUM_ID = 'museum:public-demo' as const;
const KNOWLEDGE_FINGERPRINT_KEY = 'system:artist-knowledge-fingerprint' as const;
const artistKnowledgeManifestMeta = artistKnowledgeManifestMetaJson as ArtistKnowledgeManifest['meta'];

export interface LocalDataBootstrapSummary {
  museumCreated: boolean;
  knowledgeInstalled: boolean;
  artistCount: number;
  visualAssetCount: number;
}

function publicDemoMuseum(now: string, status: MuseumRecord['status']): MuseumRecord {
  return {
    id: PUBLIC_DEMO_MUSEUM_ID,
    profileId: 'profile:public-demo',
    schemaVersion: NOVA_DATABASE_SCHEMA_VERSION,
    datasetKind: 'public-demo',
    displayName: 'Nova Music Lab · Flagship Exhibition',
    timeZone: 'Asia/Jerusalem',
    privacyMode: false,
    status,
    activeImportId: null,
    importIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Prepare the v4 local-first database after first paint. The bootstrap is
 * idempotent: it creates the public museum once and only reinstalls artist
 * knowledge when the generated source fingerprint changes.
 */
export async function bootstrapLocalDataLayer(
  db: NovaMusicDatabase = getNovaMusicDatabase(),
): Promise<StorageResult<LocalDataBootstrapSummary>> {
  const initialized = await initializeDatabase(db);
  if (!initialized.ok) return initialized;

  try {
    const now = new Date().toISOString();
    const existingMuseum = await db.museums.get(PUBLIC_DEMO_MUSEUM_ID);
    let museumCreated = false;

    if (!existingMuseum) {
      // The React product still restores its active aggregate from the legacy
      // `datasets.active` record. Until normalized event migration is wired to
      // production, v4 must not publish a competing active pointer.
      const saved = await saveMuseum(publicDemoMuseum(now, 'archived'), db);
      if (!saved.ok) return saved;
      museumCreated = true;
    } else if (existingMuseum.status === 'active') {
      // Reconcile databases created by early release-candidate builds that
      // incorrectly promoted the public demo inside v4.
      const reconciled = await saveMuseum({ ...existingMuseum, status: 'archived', updatedAt: now }, db);
      if (!reconciled.ok) return reconciled;
    }

    const installedFingerprint = await db.settings.get(KNOWLEDGE_FINGERPRINT_KEY);
    const knowledgeInstalled = installedFingerprint?.value !== artistKnowledgeManifestMeta.sourceFingerprint;

    if (knowledgeInstalled) {
      // The full provenance manifest is intentionally a second-level dynamic
      // import. Repeat visits only download this 650 KB payload when the
      // generated source fingerprint has actually changed.
      const { artistKnowledgeManifest } = await import('../knowledge/manifest');
      const installed = await installArtistKnowledge(artistKnowledgeManifest, db);
      if (!installed.ok) return installed;
      const fingerprintSetting: SettingRecord = {
        key: KNOWLEDGE_FINGERPRINT_KEY,
        museumId: null,
        value: artistKnowledgeManifestMeta.sourceFingerprint,
        updatedAt: now,
      };
      await db.settings.put(fingerprintSetting);
    }

    return storageSuccess({
      museumCreated,
      knowledgeInstalled,
      artistCount: artistKnowledgeManifestMeta.artistCount,
      visualAssetCount: artistKnowledgeManifestMeta.visualAssetCount,
    }, 'opened');
  } catch (error) {
    return storageFailure(error, 'Bootstrapping the local artist database');
  }
}
