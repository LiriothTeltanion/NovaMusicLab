import type {
  ArtistGenreAssertion,
  ArtistGenreKnowledgeArtifact,
  ArtistGenreKnowledgeRecord,
  GenreOntologyArtifact,
  GenreTerm,
} from './types';
import { isGenreFamily } from '../utils/genreTaxonomy';
import { normalizeCatalogName } from '../utils/catalogName';

export interface GenreKnowledgeBundle {
  ontology: GenreOntologyArtifact;
  knowledge: ArtistGenreKnowledgeArtifact;
  termsById: Map<string, GenreTerm>;
  recordsByArtist: Map<string, ArtistGenreKnowledgeRecord>;
  assertionsByArtist: Map<string, ArtistGenreAssertion[]>;
  recordsByArtistIdentity: Map<string, ArtistGenreKnowledgeRecord[]>;
  assertionsByArtistIdentity: Map<string, ArtistGenreAssertion[]>;
}

export interface ResolvedArtistGenreAssertion {
  assertion: ArtistGenreAssertion;
  term: GenreTerm;
}

export interface ResolvedArtistGenreKnowledge {
  records: ArtistGenreKnowledgeRecord[];
  chartFamilyId: ArtistGenreKnowledgeRecord['chartFamilyId'] | null;
  accepted: ResolvedArtistGenreAssertion[];
  candidates: ResolvedArtistGenreAssertion[];
}

let genreKnowledgePromise: Promise<GenreKnowledgeBundle> | null = null;
let artistGenreKnowledgePromise: Promise<ArtistGenreKnowledgeArtifact> | null = null;

/**
 * Artist evidence is joined through the same punctuation-, accent- and
 * case-insensitive identity shape used by the local catalog. The source
 * display name is preserved in every artifact record.
 */
export function artistGenreIdentityKey(value: string): string {
  return normalizeCatalogName(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isGenreTerm(value: unknown): value is GenreTerm {
  if (!isPlainObject(value)) return false;
  return isNonEmptyString(value.id)
    && isNonEmptyString(value.canonicalName)
    && isNonEmptyString(value.normalizedName)
    && Array.isArray(value.roles)
    && value.roles.length > 0
    && value.roles.every(isNonEmptyString)
    && (value.status === 'reviewed' || value.status === 'provisional' || value.status === 'deprecated')
    && Array.isArray(value.aliases)
    && value.aliases.every(isNonEmptyString)
    && Array.isArray(value.familyIds)
    && value.familyIds.every(item => isNonEmptyString(item) && isGenreFamily(item))
    && Array.isArray(value.provenance)
    && value.provenance.length > 0;
}

export function validateGenreOntology(value: unknown): GenreOntologyArtifact {
  if (!isPlainObject(value)
    || value.schemaVersion !== 1
    || value.scope !== 'musicbrainz-plus-nova-observed'
    || !isNonEmptyString(value.snapshotDate)
    || !Array.isArray(value.terms)
    || !value.terms.every(isGenreTerm)) {
    throw new TypeError('Invalid Nova Music Lab genre ontology.');
  }

  const ontology = value as unknown as GenreOntologyArtifact;
  if (new Set(ontology.terms.map(term => term.id)).size !== ontology.terms.length) {
    throw new TypeError('Genre ontology contains duplicate term identifiers.');
  }
  if (new Set(ontology.terms.map(term => term.normalizedName)).size !== ontology.terms.length) {
    throw new TypeError('Genre ontology contains duplicate normalized names.');
  }
  return ontology;
}

function isArtistGenreAssertion(value: unknown): value is ArtistGenreAssertion {
  if (!isPlainObject(value)) return false;
  return isNonEmptyString(value.id)
    && isNonEmptyString(value.artistKey)
    && isNonEmptyString(value.termId)
    && isNonEmptyString(value.rawLabel)
    && ['primary', 'secondary', 'influence', 'scene', 'descriptor'].includes(String(value.role))
    && ['accepted', 'candidate', 'rejected'].includes(String(value.status))
    && ['verified', 'curated', 'matched', 'unverified'].includes(String(value.confidence))
    && Array.isArray(value.evidence)
    && value.evidence.length > 0;
}

export function validateArtistGenreKnowledge(
  value: unknown,
  ontology: GenreOntologyArtifact,
): ArtistGenreKnowledgeArtifact {
  if (!isPlainObject(value)
    || value.schemaVersion !== 1
    || !isNonEmptyString(value.generatedAt)
    || !Array.isArray(value.artists)
    || !Array.isArray(value.assertions)
    || !value.assertions.every(isArtistGenreAssertion)) {
    throw new TypeError('Invalid Nova Music Lab artist genre knowledge.');
  }

  const knowledge = value as unknown as ArtistGenreKnowledgeArtifact;
  const termIds = new Set(ontology.terms.map(term => term.id));
  const assertionIds = new Set(knowledge.assertions.map(assertion => assertion.id));
  if (assertionIds.size !== knowledge.assertions.length) {
    throw new TypeError('Artist genre knowledge contains duplicate assertions.');
  }
  if (knowledge.assertions.some(assertion => !termIds.has(assertion.termId))) {
    throw new TypeError('Artist genre knowledge references an unknown ontology term.');
  }
  if (knowledge.artists.some(artist => (
    !isNonEmptyString(artist.artistKey)
    || !isNonEmptyString(artist.artistName)
    || !isGenreFamily(artist.chartFamilyId)
    || artist.assertionIds.some(id => !assertionIds.has(id))
  ))) {
    throw new TypeError('Artist genre knowledge contains an invalid artist record.');
  }
  return knowledge;
}

export async function loadArtistGenreKnowledge(): Promise<ArtistGenreKnowledgeArtifact> {
  artistGenreKnowledgePromise ??= import('../data/artist_genre_assertions.v1.json')
    .then(module => {
      const value: unknown = module.default;
      if (!isPlainObject(value)
        || value.schemaVersion !== 1
        || !isNonEmptyString(value.generatedAt)
        || !Array.isArray(value.artists)
        || !Array.isArray(value.assertions)
        || !value.assertions.every(isArtistGenreAssertion)) {
        throw new TypeError('Invalid Nova Music Lab artist genre knowledge.');
      }
      return value as unknown as ArtistGenreKnowledgeArtifact;
    });
  return artistGenreKnowledgePromise;
}

export async function loadGenreKnowledge(): Promise<GenreKnowledgeBundle> {
  genreKnowledgePromise ??= Promise.all([
    import('../data/genre_ontology.v1.json'),
    loadArtistGenreKnowledge(),
  ]).then(([ontologyModule, knowledgeArtifact]) => {
    const ontology = validateGenreOntology(ontologyModule.default);
    const knowledge = validateArtistGenreKnowledge(knowledgeArtifact, ontology);
    const termsById = new Map(ontology.terms.map(term => [term.id, term]));
    const recordsByArtist = new Map(
      knowledge.artists.map(artist => [artist.artistKey, artist]),
    );
    const assertionsByArtist = new Map<string, ArtistGenreAssertion[]>();
    const recordsByArtistIdentity = new Map<string, ArtistGenreKnowledgeRecord[]>();
    const assertionsByArtistIdentity = new Map<string, ArtistGenreAssertion[]>();

    knowledge.artists.forEach(record => {
      const identityKey = artistGenreIdentityKey(record.artistKey);
      const rows = recordsByArtistIdentity.get(identityKey) ?? [];
      rows.push(record);
      recordsByArtistIdentity.set(identityKey, rows);
    });

    knowledge.assertions.forEach(assertion => {
      const rows = assertionsByArtist.get(assertion.artistKey) ?? [];
      rows.push(assertion);
      assertionsByArtist.set(assertion.artistKey, rows);

      const identityKey = artistGenreIdentityKey(assertion.artistKey);
      const identityRows = assertionsByArtistIdentity.get(identityKey) ?? [];
      identityRows.push(assertion);
      assertionsByArtistIdentity.set(identityKey, identityRows);
    });

    return {
      ontology,
      knowledge,
      termsById,
      recordsByArtist,
      assertionsByArtist,
      recordsByArtistIdentity,
      assertionsByArtistIdentity,
    };
  });

  return genreKnowledgePromise;
}

const assertionRolePriority: Record<ArtistGenreAssertion['role'], number> = {
  primary: 0,
  secondary: 1,
  scene: 2,
  influence: 3,
  descriptor: 4,
};

const assertionStatusPriority: Record<ArtistGenreAssertion['status'], number> = {
  accepted: 0,
  candidate: 1,
  rejected: 2,
};

const assertionConfidencePriority: Record<ArtistGenreAssertion['confidence'], number> = {
  verified: 0,
  curated: 1,
  matched: 2,
  unverified: 3,
};

function evidenceProviderCount(assertion: ArtistGenreAssertion): number {
  return new Set(assertion.evidence.map(reference => reference.provider)).size;
}

/**
 * Resolves all case variants of an artist into one presentation model.
 * Duplicate terms prefer accepted evidence, primary roles, stronger
 * confidence and broader provider diversity. Rejected assertions never reach
 * the visitor-facing Atlas.
 */
export function resolveArtistGenreKnowledge(
  bundle: GenreKnowledgeBundle,
  artistName: string,
): ResolvedArtistGenreKnowledge {
  const identityKey = artistGenreIdentityKey(artistName);
  const records = bundle.recordsByArtistIdentity.get(identityKey) ?? [];
  const exactRecord = records.find(record => (
    record.artistKey.normalize('NFC').trim() === artistName.normalize('NFC').trim()
  ));
  const assertions = [...(bundle.assertionsByArtistIdentity.get(identityKey) ?? [])]
    .filter(assertion => assertion.status !== 'rejected')
    .sort((left, right) => (
      assertionStatusPriority[left.status] - assertionStatusPriority[right.status]
      || assertionRolePriority[left.role] - assertionRolePriority[right.role]
      || assertionConfidencePriority[left.confidence] - assertionConfidencePriority[right.confidence]
      || evidenceProviderCount(right) - evidenceProviderCount(left)
      || left.rawLabel.localeCompare(right.rawLabel, 'en')
    ));
  const seenTerms = new Set<string>();
  const resolved = assertions.flatMap<ResolvedArtistGenreAssertion>(assertion => {
    const term = bundle.termsById.get(assertion.termId);
    if (!term || seenTerms.has(term.normalizedName)) return [];
    seenTerms.add(term.normalizedName);
    return [{ assertion, term }];
  });

  return {
    records,
    chartFamilyId: (exactRecord ?? records[0])?.chartFamilyId ?? null,
    accepted: resolved.filter(item => item.assertion.status === 'accepted'),
    candidates: resolved.filter(item => item.assertion.status === 'candidate'),
  };
}

export function resetGenreKnowledgeLoader() {
  genreKnowledgePromise = null;
  artistGenreKnowledgePromise = null;
}
