import type { GenreFamilyId } from '../utils/genreTaxonomy';

export type GenreTermRole =
  | 'family'
  | 'genre'
  | 'subgenre'
  | 'scene'
  | 'style'
  | 'descriptor';

export type GenreTermStatus = 'reviewed' | 'provisional' | 'deprecated';

export type GenreEvidenceProvider =
  | 'nova-catalog'
  | 'nova-curation'
  | 'musicbrainz'
  | 'wikidata';

export interface GenreTermProvenance {
  provider: 'nova-taxonomy' | 'nova-catalog' | 'musicbrainz';
  sourceId: string | null;
  sourceUrl: string;
}

/**
 * One searchable vocabulary term. A term may be both an analytical family
 * and a genre, so roles are intentionally many-to-many.
 */
export interface GenreTerm {
  id: string;
  canonicalName: string;
  normalizedName: string;
  roles: GenreTermRole[];
  status: GenreTermStatus;
  aliases: string[];
  familyIds: GenreFamilyId[];
  provenance: GenreTermProvenance[];
}

export interface GenreOntologyArtifact {
  schemaVersion: 1;
  snapshotDate: string;
  scope: 'musicbrainz-plus-nova-observed';
  sources: Array<{
    provider: 'musicbrainz' | 'nova-taxonomy' | 'nova-catalog';
    sourceUrl: string;
    retrievedAt: string | null;
    note: string;
  }>;
  stats: {
    termCount: number;
    reviewedTermCount: number;
    provisionalTermCount: number;
    musicBrainzTermCount: number;
    novaObservedTermCount: number;
  };
  terms: GenreTerm[];
}

export type ArtistGenreAssertionRole =
  | 'primary'
  | 'secondary'
  | 'influence'
  | 'scene'
  | 'descriptor';

export type ArtistGenreAssertionStatus = 'accepted' | 'candidate' | 'rejected';

export type ArtistGenreAssertionConfidence =
  | 'verified'
  | 'curated'
  | 'matched'
  | 'unverified';

export interface GenreEvidenceReference {
  provider: GenreEvidenceProvider;
  sourceId: string | null;
  sourceUrl: string;
  observedLabel: string;
}

export interface ArtistGenreAssertion {
  id: string;
  artistKey: string;
  termId: string;
  rawLabel: string;
  role: ArtistGenreAssertionRole;
  status: ArtistGenreAssertionStatus;
  confidence: ArtistGenreAssertionConfidence;
  evidence: GenreEvidenceReference[];
}

export interface ArtistGenreKnowledgeRecord {
  artistKey: string;
  artistName: string;
  chartFamilyId: GenreFamilyId;
  assertionIds: string[];
}

export interface ArtistGenreKnowledgeArtifact {
  schemaVersion: 1;
  generatedAt: string;
  ontologySnapshotDate: string;
  sourceFiles: string[];
  stats: {
    catalogArtistCount: number;
    catalogPlayCount: number;
    classifiedArtistCount: number;
    classifiedPlayCount: number;
    unclassifiedArtistCount: number;
    unclassifiedPlayCount: number;
    knowledgeArtistCount: number;
    acceptedAssertionCount: number;
    candidateAssertionCount: number;
    rejectedAssertionCount: number;
  };
  artists: ArtistGenreKnowledgeRecord[];
  assertions: ArtistGenreAssertion[];
}
