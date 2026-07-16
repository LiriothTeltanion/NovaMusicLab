import Dexie, { type DexieOptions, type EntityTable, type Table } from 'dexie';
import type {
  AggregateRecord,
  ArtistKnowledgeDbRecord,
  CapabilityRecord,
  DedupeClusterRecord,
  EntityRecord,
  ImportIssueRecord,
  ImportRecord,
  InsightRecord,
  LegacyDatasetRecord,
  ListeningEventRecord,
  MuseumRecord,
  SettingRecord,
  SnapshotRecord,
  VisualAssetDbRecord,
} from './schema';
import { NOVA_DATABASE_NAME, NOVA_DATABASE_SCHEMA_VERSION } from './schema';

/**
 * Store and index declarations are exported so audits and migration tests can
 * assert the exact contract without opening a browser database.
 */
export const NOVA_DATABASE_STORES = {
  museums: 'id, profileId, datasetKind, status, updatedAt',
  imports: 'id, museumId, [museumId+status], source, status, createdAt, fileHash',
  events: [
    'id',
    'museumId',
    'importId',
    '[museumId+playedAtMs]',
    '[museumId+artistId]',
    '[museumId+trackId]',
    '[museumId+localDate]',
    '[museumId+fingerprint]',
    'playedAtMs',
  ].join(', '),
  entities: 'id, museumId, [museumId+type], [type+normalizedName], type, normalizedName, *aliases',
  dedupeClusters: 'id, museumId, [museumId+canonicalEventId], *eventIds',
  importIssues: 'id, museumId, importId, [importId+severity], code, createdAt',
  capabilities: 'id, museumId, [museumId+capability], status',
  aggregates: 'id, museumId, [museumId+kind], [museumId+cacheKey], generatedAt',
  insights: 'id, museumId, [museumId+kind], provenance, generatedAt',
  snapshots: 'id, museumId, [museumId+createdAt], schemaVersion',
  settings: 'key, museumId, updatedAt',
  artistKnowledge: 'id, normalizedName, *aliases, updatedAt',
  visualAssets: 'id, entityId, [entityId+role], provider, verifiedAt, status',
  // Legacy v2 store: keep it intact until the dedicated migration wave.
  datasets: '',
} as const;

export interface NovaMusicDatabaseOptions {
  name?: string;
  indexedDB?: IDBFactory;
  IDBKeyRange?: typeof IDBKeyRange;
  autoOpen?: boolean;
}

export class NovaMusicDatabase extends Dexie {
  museums!: EntityTable<MuseumRecord, 'id'>;
  imports!: EntityTable<ImportRecord, 'id'>;
  events!: EntityTable<ListeningEventRecord, 'id'>;
  entities!: EntityTable<EntityRecord, 'id'>;
  dedupeClusters!: EntityTable<DedupeClusterRecord, 'id'>;
  importIssues!: EntityTable<ImportIssueRecord, 'id'>;
  capabilities!: EntityTable<CapabilityRecord, 'id'>;
  aggregates!: EntityTable<AggregateRecord, 'id'>;
  insights!: EntityTable<InsightRecord, 'id'>;
  snapshots!: EntityTable<SnapshotRecord, 'id'>;
  settings!: EntityTable<SettingRecord, 'key'>;
  artistKnowledge!: EntityTable<ArtistKnowledgeDbRecord, 'id'>;
  visualAssets!: EntityTable<VisualAssetDbRecord, 'id'>;
  datasets!: Table<LegacyDatasetRecord, string>;

  constructor(name: string = NOVA_DATABASE_NAME, options?: DexieOptions) {
    super(name, options);
    this.version(NOVA_DATABASE_SCHEMA_VERSION).stores(NOVA_DATABASE_STORES);
  }
}

export function createNovaMusicDatabase(options: NovaMusicDatabaseOptions = {}): NovaMusicDatabase {
  const dexieOptions: DexieOptions = {};
  if (options.indexedDB) dexieOptions.indexedDB = options.indexedDB;
  if (options.IDBKeyRange) dexieOptions.IDBKeyRange = options.IDBKeyRange;
  if (options.autoOpen !== undefined) dexieOptions.autoOpen = options.autoOpen;
  const hasOptions = Object.keys(dexieOptions).length > 0;
  return new NovaMusicDatabase(options.name ?? NOVA_DATABASE_NAME, hasOptions ? dexieOptions : undefined);
}

let defaultDatabase: NovaMusicDatabase | undefined;

/** Lazily create the browser database so Node tooling can import schemas safely. */
export function getNovaMusicDatabase(): NovaMusicDatabase {
  defaultDatabase ??= createNovaMusicDatabase();
  return defaultDatabase;
}
