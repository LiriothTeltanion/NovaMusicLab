import { describe, expect, it } from 'vitest';
import identityPolicy from './artist_external_identity_policy.json';
import identityRegistry from './artist_identity_registry.json';
import offlineKnowledge from './offline_artist_knowledge.json';
import { canonicalArtistName } from '../utils/artistIdentity';

describe('artist identity registry', () => {
  it('documents the Girafot transliteration split without rewriting published aggregates', () => {
    expect(canonicalArtistName("ג'ירפות")).toBe("ג'ירפות");
    expect(canonicalArtistName('ג׳ירפות')).toBe('ג׳ירפות');
    expect(canonicalArtistName('גירפות')).toBe('גירפות');
    expect(canonicalArtistName('girafot')).toBe('girafot');
    const relationship = identityPolicy.relationshipGroups.find(
      group => group.relationship === 'same-artist-transliteration',
    );
    expect(relationship).toMatchObject({
      canonical: 'Girafot',
      preserveArchiveNames: true,
    });
  });

  it('keeps the historical Slaves name distinct from Rain City Drive in archive analytics', () => {
    expect(canonicalArtistName('Slaves')).toBe('Slaves');
    expect(canonicalArtistName('Rain City Drive')).toBe('Rain City Drive');
    const relationship = identityPolicy.relationshipGroups.find(
      group => group.relationship === 'historical-rename',
    );
    expect(relationship).toMatchObject({
      canonical: 'Rain City Drive',
      preserveArchiveNames: true,
    });
  });

  it('does not expose the rejected nightlife barbershop identity', () => {
    const nightlife = offlineKnowledge.artists.find(artist => artist.name === 'nightlife');
    const rejected = identityPolicy.rejectedMatches.find(match => match.archiveName === 'nightlife');

    expect(rejected?.externalId).toBe('a8fba99c-f74d-4f5e-aee0-11a91d3e0573');
    expect(nightlife?.musicbrainz).toBeUndefined();
    expect(nightlife?.curated?.background).toContain('Barbershop Quartet');
    expect(nightlife?.releaseGroups).toEqual([]);
    expect(nightlife?.bandMembers).toBeUndefined();
  });

  it('keeps all canonical and alias spellings unique', () => {
    const names = identityRegistry.identities.flatMap(identity => [identity.canonical, ...identity.aliases]);
    expect(new Set(names).size).toBe(names.length);
  });
});
