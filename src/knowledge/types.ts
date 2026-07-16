/**
 * Evidence-first artist knowledge and artwork records.
 *
 * Remote artwork is intentionally modeled as a third-party request. A URL is
 * not evidence that an image can be bundled, cached forever, or redistributed.
 */

export const ARTIST_KNOWLEDGE_SCHEMA_VERSION = 1 as const;

export type KnowledgeProvider =
  | 'archive'
  | 'musicbrainz'
  | 'wikidata'
  | 'wikimedia-commons'
  | 'wikipedia'
  | 'spotify'
  | 'deezer'
  | 'curated'
  | 'other';

export interface KnowledgeProvenanceRecord {
  provider: KnowledgeProvider;
  sourceId: string | null;
  sourceUrl: string;
  /** Null means the current source did not preserve a verification date. */
  verifiedAt: string | null;
  confidence: 'verified' | 'curated' | 'matched' | 'unverified';
}

export interface ArtistKnowledgeRecord {
  id: string;
  name: string;
  normalizedName: string;
  sortName: string;
  artistType: string | null;
  aliases: string[];
  externalIds: {
    musicbrainz: string | null;
    wikidata: string | null;
    isnis: string[];
  };
  countries: string[];
  genres: string[];
  areas: string[];
  description: {
    text: string;
    language: string;
    provider: KnowledgeProvider;
    sourceUrl: string;
  } | null;
  activeRange: {
    begin: string | null;
    end: string | null;
    ended: boolean | null;
  };
  members: Array<{
    name: string;
    roles: string[];
    current: boolean;
  }>;
  releases: Array<{
    id: string;
    title: string;
    primaryType: string | null;
    firstReleaseDate: string | null;
    provider: 'musicbrainz' | 'curated';
  }>;
  officialUrls: string[];
  provenance: KnowledgeProvenanceRecord[];
  visualAssetIds: string[];
  updatedAt: string;
}

export interface VisualAssetLicense {
  /** `unverified` is explicit provenance debt, never an implied free license. */
  status: 'verified' | 'declared' | 'unverified' | 'restricted';
  id: string | null;
  name: string | null;
  url: string | null;
}

export interface VisualAssetAttribution {
  required: boolean;
  creator: string | null;
  label: string;
  url: string | null;
}

export interface VisualAssetDimensions {
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
}

export interface VisualAssetFocalPoint {
  /** Normalized image-space coordinate in the inclusive 0..1 range. */
  x: number;
  /** Normalized image-space coordinate in the inclusive 0..1 range. */
  y: number;
  source: 'curated' | 'detected' | 'default';
}

export interface VisualAssetCachePolicy {
  /**
   * `remote-browser` means an ordinary image request whose HTTP caching is
   * delegated to the browser/provider. It is descriptive, not user consent.
   */
  strategy: 'bundled' | 'cache-first' | 'remote-opt-in' | 'remote-browser' | 'no-store';
  maxAgeDays: number | null;
  privacyImpact: 'none' | 'third-party-request';
}

export interface VisualAssetRecord {
  id: string;
  entityId: string;
  kind: 'image';
  role: 'primary' | 'gallery' | 'background' | 'avatar';
  url: string;
  provider: KnowledgeProvider;
  sourceUrl: string;
  license: VisualAssetLicense;
  attribution: VisualAssetAttribution;
  /** Null is honest when legacy artwork did not record a check timestamp. */
  verifiedAt: string | null;
  dimensions: VisualAssetDimensions;
  focalPoint: VisualAssetFocalPoint;
  cachePolicy: VisualAssetCachePolicy;
  contentHash: string | null;
  status: 'active' | 'review' | 'blocked';
}

export interface ArtistKnowledgeManifest {
  meta: {
    schemaVersion: typeof ARTIST_KNOWLEDGE_SCHEMA_VERSION;
    generatedAt: string;
    sourceFingerprint: string;
    sourceFiles: string[];
    artistCount: number;
    visualAssetCount: number;
    assetsAwaitingLicenseReview: number;
  };
  artists: ArtistKnowledgeRecord[];
  visualAssets: VisualAssetRecord[];
}
