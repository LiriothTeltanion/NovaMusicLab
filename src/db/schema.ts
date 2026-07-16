import type { ArtistKnowledgeRecord, VisualAssetRecord } from '../knowledge/types';

export const NOVA_DATABASE_NAME = 'nova-music-lab' as const;
export const NOVA_DATABASE_SCHEMA_VERSION = 4 as const;
export const NOVA_PARSER_VERSION = '1.0.0' as const;
export const DATABASE_METADATA_KEY = 'system:database-schema' as const;

export type IsoDateTime = string;
export type DatasetKind = 'public-demo' | 'private-import' | 'legacy-aggregate';
export type MuseumStatus = 'staging' | 'active' | 'archived' | 'corrupt';
export type ImportStatus = 'queued' | 'preflight' | 'parsing' | 'validating' | 'ready' | 'failed' | 'cancelled';
export type ImportSource = 'spotify' | 'lastfm' | 'youtube' | 'apple-music' | 'listenbrainz' | 'nova-export' | 'unknown';
export type EntityKind = 'artist' | 'track' | 'album' | 'genre';
export type EvidenceProvenance = 'observed' | 'inferred' | 'estimated' | 'unavailable';

export interface MuseumRecord {
  id: string;
  profileId: string;
  schemaVersion: typeof NOVA_DATABASE_SCHEMA_VERSION;
  datasetKind: DatasetKind;
  displayName: string;
  timeZone: string;
  privacyMode: boolean;
  status: MuseumStatus;
  activeImportId: string | null;
  importIds: string[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ImportIssueSummary {
  code: string;
  severity: 'info' | 'warning' | 'error';
  count: number;
  sample: string | null;
}

export interface ImportRecord {
  id: string;
  museumId: string;
  schemaVersion: typeof NOVA_DATABASE_SCHEMA_VERSION;
  parserVersion: string;
  source: ImportSource;
  fileName: string;
  fileHash: string | null;
  bytesTotal: number;
  bytesProcessed: number;
  rowsAccepted: number;
  rowsRejected: number;
  status: ImportStatus;
  issues: ImportIssueSummary[];
  createdAt: IsoDateTime;
  completedAt: IsoDateTime | null;
}

export interface ListeningEventRecord {
  id: string;
  museumId: string;
  importId: string;
  source: ImportSource;
  sourceEventId: string | null;
  playedAt: IsoDateTime;
  playedAtMs: number;
  originalTimeZoneOffsetMinutes: number | null;
  analysisTimeZone: string;
  localDate: string;
  artistId: string;
  trackId: string;
  albumId: string | null;
  /** Null means the archive did not provide a trustworthy played duration. */
  playedDurationMs: number | null;
  /** Track metadata duration is never silently substituted for played time. */
  trackDurationMs: number | null;
  durationProvenance: EvidenceProvenance;
  skipped: boolean | null;
  platform: string | null;
  countryCode: string | null;
  fingerprint: string;
  createdAt: IsoDateTime;
}

export interface EntityRecord {
  id: string;
  museumId: string;
  type: EntityKind;
  name: string;
  normalizedName: string;
  sortName: string;
  aliases: string[];
  externalIds: Record<string, string>;
  attributes: Record<string, unknown>;
  provenance: EvidenceProvenance;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DedupeClusterRecord {
  id: string;
  museumId: string;
  canonicalEventId: string;
  eventIds: string[];
  method: 'exact-source-id' | 'exact-hash' | 'cross-source-window' | 'manual';
  confidence: number;
  reversible: true;
  createdAt: IsoDateTime;
}

export interface ImportIssueRecord {
  id: string;
  museumId: string;
  importId: string;
  code: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  rowNumber: number | null;
  evidence: Record<string, unknown>;
  createdAt: IsoDateTime;
}

export interface CapabilityRecord {
  id: string;
  museumId: string;
  capability: string;
  status: 'available' | 'limited' | 'estimated' | 'unavailable';
  evidenceCount: number;
  sources: ImportSource[];
  reason: string | null;
  evaluatedAt: IsoDateTime;
}

export interface AggregateRecord {
  id: string;
  museumId: string;
  kind: string;
  cacheKey: string;
  parserVersion: string;
  analysisTimeZone: string;
  filterHash: string;
  sourceImportIds: string[];
  evidenceEventCount: number;
  dimensions: Record<string, string | number | boolean | null>;
  metrics: Record<string, number | string | boolean | null>;
  generatedAt: IsoDateTime;
}

export interface InsightRecord {
  id: string;
  museumId: string;
  kind: string;
  value: unknown;
  provenance: EvidenceProvenance;
  confidence: number | null;
  evidenceIds: string[];
  parserVersion: string;
  generatedAt: IsoDateTime;
}

export interface SnapshotRecord {
  id: string;
  museumId: string;
  schemaVersion: typeof NOVA_DATABASE_SCHEMA_VERSION;
  label: string;
  museum: MuseumRecord;
  importIds: string[];
  checksum: string;
  createdAt: IsoDateTime;
}

export interface SettingRecord {
  key: string;
  museumId: string | null;
  value: unknown;
  updatedAt: IsoDateTime;
}

export interface DatabaseMetadata {
  schemaVersion: typeof NOVA_DATABASE_SCHEMA_VERSION;
  parserVersion: string;
  databaseName: typeof NOVA_DATABASE_NAME;
  localFirst: true;
  cloudDependency: null;
  initializedAt: IsoDateTime;
}

/**
 * The existing v2 `datasets` object store remains declared during the v4
 * upgrade. It is read by the legacy storage module until migration is enabled
 * in a later integration wave.
 */
export type LegacyDatasetRecord = unknown;

export type ArtistKnowledgeDbRecord = ArtistKnowledgeRecord;
export type VisualAssetDbRecord = VisualAssetRecord;
