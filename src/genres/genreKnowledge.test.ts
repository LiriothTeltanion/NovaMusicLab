import { describe, expect, it } from 'vitest';
import {
  artistGenreIdentityKey,
  loadGenreKnowledge,
  resetGenreKnowledgeLoader,
  resolveArtistGenreKnowledge,
  type GenreKnowledgeBundle,
  validateArtistGenreKnowledge,
  validateGenreOntology,
} from './genreKnowledge';
import type { ArtistGenreAssertion, GenreTerm } from './types';

describe('genre knowledge artifacts', () => {
  it('loads a lazy ontology and evidence index with stable references', async () => {
    resetGenreKnowledgeLoader();
    const bundle = await loadGenreKnowledge();

    expect(bundle.ontology.terms.length).toBeGreaterThan(2_000);
    expect(bundle.knowledge.stats.catalogArtistCount).toBe(6_413);
    expect(bundle.knowledge.stats.unclassifiedArtistCount).toBe(5_960);
    expect(bundle.knowledge.stats.rejectedAssertionCount).toBeGreaterThan(0);
    expect(bundle.knowledge.assertions.every(assertion => (
      bundle.termsById.has(assertion.termId)
    ))).toBe(true);
  });

  it('resolves case variants into one artist profile and keeps evidence states separate', async () => {
    resetGenreKnowledgeLoader();
    const bundle = await loadGenreKnowledge();
    const acceptedProfile = resolveArtistGenreKnowledge(bundle, 'ANNIHILATOR');
    const mergedCaseProfile = resolveArtistGenreKnowledge(bundle, 'A DAY TO REMEMBER');

    expect(acceptedProfile.accepted.map(item => item.term.canonicalName)).toEqual(
      expect.arrayContaining(['Thrash Metal', 'Heavy Metal']),
    );
    expect(acceptedProfile.candidates.map(item => item.term.canonicalName)).toContain('Speed Metal');
    expect(acceptedProfile.accepted.every(item => item.assertion.status === 'accepted')).toBe(true);
    expect(acceptedProfile.candidates.every(item => item.assertion.status === 'candidate')).toBe(true);
    expect(mergedCaseProfile.records.map(record => record.artistName)).toEqual(
      expect.arrayContaining(['A Day to Remember', 'A Day To Remember']),
    );
    expect(new Set([
      ...mergedCaseProfile.accepted,
      ...mergedCaseProfile.candidates,
    ].map(item => item.term.normalizedName)).size).toBe(
      mergedCaseProfile.accepted.length + mergedCaseProfile.candidates.length,
    );
  });

  it('orders visible suggestions by confidence and provider diversity before labels', () => {
    const artistName = 'Priority Artist';
    const identityKey = artistGenreIdentityKey(artistName);
    const term = (id: string, name: string): GenreTerm => ({
      id,
      canonicalName: name,
      normalizedName: name.toLowerCase(),
      roles: ['subgenre'],
      status: 'provisional',
      aliases: [],
      familyIds: ['Alternative'],
      provenance: [{
        provider: 'nova-catalog',
        sourceId: null,
        sourceUrl: 'https://example.test/ontology',
      }],
    });
    const curatedTerm = term('genre:curated', 'Zulu Curated');
    const diverseTerm = term('genre:diverse', 'Zulu Diverse');
    const singleTerm = term('genre:single', 'Alpha Single');
    const assertion = (
      id: string,
      termId: string,
      rawLabel: string,
      confidence: ArtistGenreAssertion['confidence'],
      providers: ArtistGenreAssertion['evidence'][number]['provider'][],
    ): ArtistGenreAssertion => ({
      id,
      artistKey: artistName,
      termId,
      rawLabel,
      role: 'secondary',
      status: 'candidate',
      confidence,
      evidence: providers.map(provider => ({
        provider,
        sourceId: null,
        sourceUrl: `https://example.test/${provider}`,
        observedLabel: rawLabel,
      })),
    });
    const curated = assertion('assertion:curated', curatedTerm.id, curatedTerm.canonicalName, 'curated', ['nova-curation']);
    const diverse = assertion(
      'assertion:diverse',
      diverseTerm.id,
      diverseTerm.canonicalName,
      'matched',
      ['musicbrainz', 'wikidata'],
    );
    const single = assertion('assertion:single', singleTerm.id, singleTerm.canonicalName, 'matched', ['musicbrainz']);
    const assertions = [single, diverse, curated];
    const terms = [singleTerm, diverseTerm, curatedTerm];
    const bundle = {
      ontology: {
        schemaVersion: 1,
        snapshotDate: '2026-07-29',
        scope: 'musicbrainz-plus-nova-observed',
        sources: [],
        stats: {
          termCount: terms.length,
          reviewedTermCount: 0,
          provisionalTermCount: terms.length,
          musicBrainzTermCount: 0,
          novaObservedTermCount: terms.length,
        },
        terms,
      },
      knowledge: {
        schemaVersion: 1,
        generatedAt: '2026-07-29T00:00:00.000Z',
        ontologySnapshotDate: '2026-07-29',
        sourceFiles: [],
        stats: {
          catalogArtistCount: 1,
          catalogPlayCount: 1,
          classifiedArtistCount: 1,
          classifiedPlayCount: 1,
          unclassifiedArtistCount: 0,
          unclassifiedPlayCount: 0,
          knowledgeArtistCount: 1,
          acceptedAssertionCount: 0,
          candidateAssertionCount: assertions.length,
          rejectedAssertionCount: 0,
        },
        artists: [{
          artistKey: artistName,
          artistName,
          chartFamilyId: 'Alternative',
          assertionIds: assertions.map(item => item.id),
        }],
        assertions,
      },
      termsById: new Map(terms.map(item => [item.id, item])),
      recordsByArtist: new Map(),
      assertionsByArtist: new Map(),
      recordsByArtistIdentity: new Map([[
        identityKey,
        [{
          artistKey: artistName,
          artistName,
          chartFamilyId: 'Alternative',
          assertionIds: assertions.map(item => item.id),
        }],
      ]]),
      assertionsByArtistIdentity: new Map([[identityKey, assertions]]),
    } satisfies GenreKnowledgeBundle;

    expect(resolveArtistGenreKnowledge(bundle, artistName).candidates.map(item => item.term.canonicalName))
      .toEqual(['Zulu Curated', 'Zulu Diverse', 'Alpha Single']);
  });

  it('rejects duplicate ontology names and orphaned assertions', () => {
    const term = {
      id: 'genre:test',
      canonicalName: 'Test',
      normalizedName: 'test',
      roles: ['genre'],
      status: 'reviewed',
      aliases: [],
      familyIds: ['Alternative'],
      provenance: [{
        provider: 'nova-taxonomy',
        sourceId: null,
        sourceUrl: 'https://example.test/taxonomy',
      }],
    };
    expect(() => validateGenreOntology({
      schemaVersion: 1,
      snapshotDate: '2026-07-29',
      scope: 'musicbrainz-plus-nova-observed',
      sources: [],
      stats: {
        termCount: 2,
        reviewedTermCount: 2,
        provisionalTermCount: 0,
        musicBrainzTermCount: 0,
        novaObservedTermCount: 2,
      },
      terms: [term, { ...term, id: 'genre:duplicate' }],
    })).toThrow(/duplicate normalized names/i);

    const ontology = validateGenreOntology({
      schemaVersion: 1,
      snapshotDate: '2026-07-29',
      scope: 'musicbrainz-plus-nova-observed',
      sources: [],
      stats: {
        termCount: 1,
        reviewedTermCount: 1,
        provisionalTermCount: 0,
        musicBrainzTermCount: 0,
        novaObservedTermCount: 1,
      },
      terms: [term],
    });

    expect(() => validateArtistGenreKnowledge({
      schemaVersion: 1,
      generatedAt: '2026-07-29T00:00:00.000Z',
      ontologySnapshotDate: '2026-07-29',
      sourceFiles: [],
      stats: {},
      artists: [],
      assertions: [{
        id: 'assertion:orphan',
        artistKey: 'Artist',
        termId: 'missing',
        rawLabel: 'Missing',
        role: 'secondary',
        status: 'candidate',
        confidence: 'unverified',
        evidence: [{
          provider: 'nova-catalog',
          sourceId: null,
          sourceUrl: 'https://example.test/catalog',
          observedLabel: 'Missing',
        }],
      }],
    }, ontology)).toThrow(/unknown ontology term/i);
  });
});
