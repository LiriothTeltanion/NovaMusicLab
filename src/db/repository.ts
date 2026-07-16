import type { ArtistKnowledgeManifest } from '../knowledge/types';
import { getNovaMusicDatabase, type NovaMusicDatabase } from './database';
import type { DatabaseMetadata, MuseumRecord, SettingRecord } from './schema';
import {
  DATABASE_METADATA_KEY,
  NOVA_DATABASE_NAME,
  NOVA_DATABASE_SCHEMA_VERSION,
  NOVA_PARSER_VERSION,
} from './schema';
import {
  storageFailure,
  storageNotFound,
  storageSuccess,
  type StorageResult,
} from './storageResult';
import { isMuseumRecord, validateArtistKnowledgeManifest } from './validation';

function nowIso(): string {
  return new Date().toISOString();
}

function isDatabaseMetadata(value: unknown): value is DatabaseMetadata {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const metadata = value as Partial<DatabaseMetadata>;
  return metadata.schemaVersion === NOVA_DATABASE_SCHEMA_VERSION
    && metadata.parserVersion === NOVA_PARSER_VERSION
    && metadata.databaseName === NOVA_DATABASE_NAME
    && metadata.localFirst === true
    && metadata.cloudDependency === null
    && typeof metadata.initializedAt === 'string'
    && Number.isFinite(Date.parse(metadata.initializedAt));
}

export async function initializeDatabase(
  db: NovaMusicDatabase = getNovaMusicDatabase(),
): Promise<StorageResult<DatabaseMetadata>> {
  try {
    await db.open();
    const current = await db.settings.get(DATABASE_METADATA_KEY);
    if (isDatabaseMetadata(current?.value)) {
      return storageSuccess(current.value, 'opened');
    }

    const metadata: DatabaseMetadata = {
      schemaVersion: NOVA_DATABASE_SCHEMA_VERSION,
      parserVersion: NOVA_PARSER_VERSION,
      databaseName: NOVA_DATABASE_NAME,
      localFirst: true,
      cloudDependency: null,
      initializedAt: nowIso(),
    };
    const setting: SettingRecord = {
      key: DATABASE_METADATA_KEY,
      museumId: null,
      value: metadata,
      updatedAt: metadata.initializedAt,
    };
    await db.settings.put(setting);
    return storageSuccess(metadata, 'opened');
  } catch (error) {
    return storageFailure(error, 'Opening local museum storage');
  }
}

export async function saveMuseum(
  museum: MuseumRecord,
  db: NovaMusicDatabase = getNovaMusicDatabase(),
): Promise<StorageResult<MuseumRecord>> {
  if (!isMuseumRecord(museum)) {
    return {
      ok: false,
      status: 'validation-error',
      recoverable: true,
      message: 'Saving local museum storage rejected an invalid museum record.',
      errorName: 'ValidationError',
    };
  }

  const initialized = await initializeDatabase(db);
  if (!initialized.ok) return initialized;
  try {
    const conflictingActiveMuseumId = await db.transaction('rw', db.museums, async () => {
      if (museum.status === 'active') {
        const existingActiveMuseum = await db.museums
          .where('status')
          .equals('active')
          .filter(candidate => candidate.id !== museum.id)
          .first();
        if (existingActiveMuseum) return existingActiveMuseum.id;
      }

      await db.museums.put(museum);
      return null;
    });

    if (conflictingActiveMuseumId) {
      return {
        ok: false,
        status: 'validation-error',
        recoverable: true,
        message: `Museum ${conflictingActiveMuseumId} is already active. Stage this museum and activate it atomically instead.`,
        errorName: 'ActiveMuseumConflictError',
      };
    }
    return storageSuccess(museum, 'saved');
  } catch (error) {
    return storageFailure(error, 'Saving local museum storage');
  }
}

export async function loadMuseum(
  museumId: string,
  db: NovaMusicDatabase = getNovaMusicDatabase(),
): Promise<StorageResult<MuseumRecord>> {
  if (!museumId.trim()) {
    return {
      ok: false,
      status: 'validation-error',
      recoverable: true,
      message: 'Loading local museum storage requires a museum id.',
      errorName: 'ValidationError',
    };
  }
  const initialized = await initializeDatabase(db);
  if (!initialized.ok) return initialized;
  try {
    const museum = await db.museums.get(museumId);
    if (!museum) return storageNotFound(`Museum ${museumId} was not found in local storage.`);
    if (!isMuseumRecord(museum)) {
      return {
        ok: false,
        status: 'migration-error',
        recoverable: false,
        message: `Museum ${museumId} uses an invalid or unsupported local schema.`,
        errorName: 'SchemaMismatchError',
      };
    }
    return storageSuccess(museum, 'loaded');
  } catch (error) {
    return storageFailure(error, 'Loading local museum storage');
  }
}

/**
 * Activate a fully staged museum atomically. A failed transaction cannot
 * demote the previously active museum.
 */
export async function activateStagedMuseum(
  museumId: string,
  db: NovaMusicDatabase = getNovaMusicDatabase(),
): Promise<StorageResult<MuseumRecord>> {
  const initialized = await initializeDatabase(db);
  if (!initialized.ok) return initialized;
  try {
    const activated = await db.transaction('rw', db.museums, async () => {
      const staged = await db.museums.get(museumId);
      if (!staged) throw new Error(`Museum ${museumId} was not found.`);
      if (staged.status !== 'staging') throw new TypeError(`Museum ${museumId} is not staged.`);

      const now = nowIso();
      const activeMuseums = await db.museums.where('status').equals('active').toArray();
      await Promise.all(activeMuseums
        .filter(museum => museum.id !== museumId)
        .map(museum => db.museums.put({ ...museum, status: 'archived', updatedAt: now })));
      const next: MuseumRecord = { ...staged, status: 'active', updatedAt: now };
      await db.museums.put(next);
      return next;
    });
    return storageSuccess(activated, 'saved');
  } catch (error) {
    return storageFailure(error, 'Activating staged museum storage');
  }
}

export async function deleteMuseum(
  museumId: string,
  db: NovaMusicDatabase = getNovaMusicDatabase(),
): Promise<StorageResult<void>> {
  const initialized = await initializeDatabase(db);
  if (!initialized.ok) return initialized;
  try {
    const exists = await db.museums.get(museumId);
    if (!exists) return storageNotFound(`Museum ${museumId} was not found in local storage.`);
    const museumTables = [
      db.museums,
      db.imports,
      db.events,
      db.entities,
      db.dedupeClusters,
      db.importIssues,
      db.capabilities,
      db.aggregates,
      db.insights,
      db.snapshots,
      db.settings,
    ] as const;
    await db.transaction('rw', museumTables, async () => {
      await Promise.all([
        db.imports.where('museumId').equals(museumId).delete(),
        db.events.where('museumId').equals(museumId).delete(),
        db.entities.where('museumId').equals(museumId).delete(),
        db.dedupeClusters.where('museumId').equals(museumId).delete(),
        db.importIssues.where('museumId').equals(museumId).delete(),
        db.capabilities.where('museumId').equals(museumId).delete(),
        db.aggregates.where('museumId').equals(museumId).delete(),
        db.insights.where('museumId').equals(museumId).delete(),
        db.snapshots.where('museumId').equals(museumId).delete(),
        db.settings.where('museumId').equals(museumId).delete(),
      ]);
      await db.museums.delete(museumId);
    });
    return storageSuccess(undefined, 'deleted');
  } catch (error) {
    return storageFailure(error, 'Deleting local museum storage');
  }
}

export async function installArtistKnowledge(
  manifest: ArtistKnowledgeManifest,
  db: NovaMusicDatabase = getNovaMusicDatabase(),
): Promise<StorageResult<{ artists: number; visualAssets: number }>> {
  const validationErrors = validateArtistKnowledgeManifest(manifest);
  if (validationErrors.length) {
    return {
      ok: false,
      status: 'validation-error',
      recoverable: true,
      message: `Artist knowledge manifest failed validation: ${validationErrors.slice(0, 3).join(' ')}`,
      errorName: 'ManifestValidationError',
    };
  }

  const initialized = await initializeDatabase(db);
  if (!initialized.ok) return initialized;
  try {
    await db.transaction('rw', [db.artistKnowledge, db.visualAssets], async () => {
      await db.artistKnowledge.clear();
      await db.visualAssets.clear();
      await db.artistKnowledge.bulkPut(manifest.artists);
      await db.visualAssets.bulkPut(manifest.visualAssets);
    });
    return storageSuccess({
      artists: manifest.artists.length,
      visualAssets: manifest.visualAssets.length,
    }, 'saved');
  } catch (error) {
    return storageFailure(error, 'Installing local artist knowledge');
  }
}
