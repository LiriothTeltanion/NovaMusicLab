import { describe, expect, it } from 'vitest';
import type { ArtistKnowledgeManifest } from '../knowledge/types';
import { validateArtistKnowledgeManifest } from './validation';

function validManifest(): ArtistKnowledgeManifest {
  return {
    meta: {
      schemaVersion: 1,
      generatedAt: '2026-07-16T00:00:00.000Z',
      sourceFingerprint: 'a'.repeat(64),
      sourceFiles: ['src/data/test-source.json'],
      artistCount: 1,
      visualAssetCount: 1,
      assetsAwaitingLicenseReview: 1,
    },
    artists: [{
      id: 'artist:test',
      name: 'Test Artist',
      normalizedName: 'test artist',
      sortName: 'Test Artist',
      artistType: 'Person',
      aliases: [],
      externalIds: { musicbrainz: null, wikidata: null, isnis: [] },
      countries: ['US'],
      genres: ['ambient'],
      areas: [],
      description: null,
      activeRange: { begin: '2020', end: null, ended: false },
      members: [],
      releases: [],
      officialUrls: ['https://example.com/artist'],
      provenance: [{
        provider: 'archive',
        sourceId: null,
        sourceUrl: 'https://example.com/archive',
        verifiedAt: null,
        confidence: 'curated',
      }],
      visualAssetIds: ['visual:test'],
      updatedAt: '2026-07-16T00:00:00.000Z',
    }],
    visualAssets: [{
      id: 'visual:test',
      entityId: 'artist:test',
      kind: 'image',
      role: 'primary',
      url: 'https://example.com/image.webp',
      provider: 'curated',
      sourceUrl: 'https://example.com/source',
      license: { status: 'unverified', id: null, name: null, url: null },
      attribution: {
        required: true,
        creator: null,
        label: 'Example archive',
        url: 'https://example.com/source',
      },
      verifiedAt: null,
      dimensions: { width: 100, height: 50, aspectRatio: 2 },
      focalPoint: { x: 0.5, y: 0.5, source: 'default' },
      cachePolicy: {
        strategy: 'remote-browser',
        maxAgeDays: null,
        privacyImpact: 'third-party-request',
      },
      contentHash: null,
      status: 'review',
    }],
  };
}

describe('validateArtistKnowledgeManifest', () => {
  it('accepts a complete, internally linked manifest', () => {
    expect(validateArtistKnowledgeManifest(validManifest())).toEqual([]);
  });

  it('reports hostile nested values without ever throwing', () => {
    const manifest = validManifest() as unknown as {
      meta: Record<string, unknown>;
      artists: unknown[];
      visualAssets: unknown[];
    };
    manifest.artists = [null, 17, { id: 'artist:broken', provenance: [undefined] }];
    manifest.visualAssets = [undefined, 'not-an-asset', { id: 'visual:broken', license: null }];

    let errors: string[] = [];
    expect(() => {
      errors = validateArtistKnowledgeManifest(manifest);
    }).not.toThrow();
    expect(errors).toEqual(expect.arrayContaining([
      'artists[0] must be an object.',
      'artists[1] must be an object.',
      'artists[2].externalIds must be an object.',
      'artists[2].provenance[0] must be an object.',
      'visualAssets[0] must be an object.',
      'visualAssets[1] must be an object.',
      'visualAssets[2].license must be an object.',
    ]));
  });

  it('requires trustworthy provenance for external identifiers and descriptions', () => {
    const manifest = structuredClone(validManifest());
    const artist = manifest.artists[0];
    artist.externalIds.musicbrainz = 'mbid-without-source';
    artist.description = {
      text: 'An unsupported description',
      language: 'en',
      provider: 'wikidata',
      sourceUrl: 'https://www.wikidata.org/wiki/Q1',
    };
    artist.provenance[0].sourceUrl = 'http://example.com/insecure';
    artist.provenance[0].confidence = 'guessed' as 'verified';

    const errors = validateArtistKnowledgeManifest(manifest);

    expect(errors).toEqual(expect.arrayContaining([
      'artists[0].provenance[0].sourceUrl must use HTTPS.',
      'artists[0].provenance[0].confidence is unsupported.',
      'artists[0].externalIds.musicbrainz requires matching provenance.',
      'artists[0].description requires matching provenance.',
    ]));
  });

  it('rejects unsafe visual lifecycle, geometry and network policy combinations', () => {
    const manifest = structuredClone(validManifest());
    const asset = manifest.visualAssets[0];
    asset.status = 'active';
    asset.dimensions.aspectRatio = 3;
    asset.focalPoint.source = 'automatic' as 'default';
    asset.cachePolicy.privacyImpact = 'none';
    asset.cachePolicy.maxAgeDays = 30;

    const errors = validateArtistKnowledgeManifest(manifest);

    expect(errors).toEqual(expect.arrayContaining([
      'visualAssets[0].dimensions.aspectRatio does not match width and height.',
      'visualAssets[0].focalPoint.source is unsupported.',
      'visualAssets[0].cachePolicy.maxAgeDays must be null when browser HTTP caching is provider-controlled.',
      'visualAssets[0].cachePolicy remote assets must declare third-party-request privacy impact.',
      'visualAssets[0].status cannot be active while its license is unverified.',
    ]));
  });

  it('enforces bidirectional ownership and one primary asset per artist', () => {
    const manifest = structuredClone(validManifest());
    manifest.artists[0].visualAssetIds = ['visual:missing'];
    manifest.visualAssets[0].entityId = 'artist:ghost';

    const errors = validateArtistKnowledgeManifest(manifest);

    expect(errors).toEqual(expect.arrayContaining([
      'visualAssets[0].entityId does not match an artist.',
      'artist:test references missing asset visual:missing.',
      'visual:test is not referenced by its artist artist:ghost.',
      'artist:test must have exactly one primary visual asset.',
    ]));
  });

  it('validates metadata counters and fingerprint integrity', () => {
    const manifest = structuredClone(validManifest());
    manifest.meta.sourceFingerprint = 'not-a-sha';
    manifest.meta.artistCount = 2;
    manifest.meta.visualAssetCount = 2;
    manifest.meta.assetsAwaitingLicenseReview = 0;

    expect(validateArtistKnowledgeManifest(manifest)).toEqual(expect.arrayContaining([
      'meta.sourceFingerprint must be a lowercase SHA-256 fingerprint.',
      'meta.artistCount is stale.',
      'meta.visualAssetCount is stale.',
      'meta.assetsAwaitingLicenseReview is stale.',
    ]));
  });
});
