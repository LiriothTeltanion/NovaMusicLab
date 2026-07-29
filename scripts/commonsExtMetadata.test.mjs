import { describe, expect, it, vi } from 'vitest';

import {
  commonsTitleForAsset,
  createCommonsMetadataCache,
  enrichManifestWithCommonsMetadata,
  fetchCommonsExtMetadata,
  normalizeCommonsTitleKey,
  parseCommonsExtMetadataPage,
  sanitizeCommonsMetadataCache,
  sanitizeCommonsMetadataText,
} from './lib/commonsExtMetadata.mjs';

const commonsAsset = {
  id: 'visual:test',
  entityId: 'artist:test',
  provider: 'wikimedia-commons',
  url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Test_Artist.jpg/640px-Test_Artist.jpg',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Test_Artist.jpg',
  license: { status: 'unverified', id: null, name: null, url: null },
  attribution: {
    required: true,
    creator: null,
    label: 'Wikimedia Commons',
    url: 'https://commons.wikimedia.org/wiki/File:Test_Artist.jpg',
  },
  verifiedAt: null,
  cachePolicy: {
    strategy: 'remote-browser',
    maxAgeDays: null,
    privacyImpact: 'third-party-request',
  },
};

function openLicensePage(overrides = {}) {
  return {
    pageid: 42,
    title: 'File:Test Artist.jpg',
    imageinfo: [{
      extmetadata: {
        LicenseShortName: { value: 'CC BY-SA 4.0' },
        UsageTerms: { value: 'Creative Commons Attribution-Share Alike 4.0' },
        LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' },
        Artist: { value: '<a href="/wiki/User:Jane">Jane&nbsp;Doe</a>' },
        Credit: { value: '<span>Jane Doe archive</span>' },
        ...overrides,
      },
    }],
  };
}

describe('Wikimedia Commons rights metadata', () => {
  it('extracts one canonical file title from source pages and thumbnail URLs', () => {
    expect(commonsTitleForAsset(commonsAsset)).toBe('File:Test Artist.jpg');
    expect(commonsTitleForAsset({
      ...commonsAsset,
      sourceUrl: 'https://example.invalid/not-commons',
    })).toBe('File:Test Artist.jpg');
    expect(normalizeCommonsTitleKey('File:Test_Artist.jpg')).toBe('file:test artist.jpg');
    expect(commonsTitleForAsset({ ...commonsAsset, provider: 'spotify' })).toBeNull();
  });

  it('removes provider HTML while preserving readable attribution text', () => {
    const publicEmail = ['andreas.lawen', 'wikipedia.de'].join('@');
    expect(sanitizeCommonsMetadataText('<b>Jane&nbsp;Doe</b><br>Archive')).toBe('Jane Doe Archive');
    expect(sanitizeCommonsMetadataText('<script>alert(1)</script>Jane&#x20;Doe')).toBe('Jane Doe');
    expect(sanitizeCommonsMetadataText('Invalid &#99999999; entity')).toBe('Invalid &#99999999; entity');
    expect(sanitizeCommonsMetadataText(`Andreas Lawen, ${publicEmail}`)).toBe('Andreas Lawen');
  });

  it('redacts email-like attribution from an existing cache and refreshes its fingerprint', () => {
    const entry = parseCommonsExtMetadataPage(openLicensePage(), '2026-07-28T12:00:00.000Z');
    const publicEmail = ['jane', 'example.org'].join('@');
    const unsafe = {
      ...entry,
      attribution: {
        ...entry.attribution,
        creator: `Jane Doe, ${publicEmail}`,
        label: `Jane Doe, ${publicEmail}`,
      },
      provenance: {
        ...entry.provenance,
        metadataFingerprint: 'unsafe-stale-fingerprint',
      },
    };
    const cache = createCommonsMetadataCache(
      { [normalizeCommonsTitleKey(entry.title)]: unsafe },
      '2026-07-28T12:00:00.000Z',
    );

    const sanitized = sanitizeCommonsMetadataCache(cache);
    const result = sanitized.entries[normalizeCommonsTitleKey(entry.title)];
    expect(result.attribution.creator).toBe('Jane Doe');
    expect(result.attribution.label).toBe('Jane Doe');
    expect(result.provenance.metadataFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result.provenance.metadataFingerprint).not.toBe('unsafe-stale-fingerprint');
  });

  it('records an open provider declaration without claiming independent verification', () => {
    const entry = parseCommonsExtMetadataPage(openLicensePage(), '2026-07-28T12:00:00.000Z');

    expect(entry).toMatchObject({
      resolved: true,
      pageId: 42,
      title: 'File:Test Artist.jpg',
      license: {
        status: 'declared',
        id: 'CC BY-SA 4.0',
        url: 'https://creativecommons.org/licenses/by-sa/4.0/',
      },
      attribution: {
        required: true,
        creator: 'Jane Doe',
        label: 'Jane Doe',
      },
      provenance: {
        provider: 'wikimedia-commons-api',
        fetchedAt: '2026-07-28T12:00:00.000Z',
      },
    });
    expect(entry.provenance.metadataFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('keeps unknown terms unverified and marks explicitly non-free terms restricted', () => {
    const unknown = parseCommonsExtMetadataPage(
      openLicensePage({
        LicenseShortName: { value: 'Custom terms' },
        UsageTerms: { value: 'See source page' },
      }),
      '2026-07-28T12:00:00.000Z',
    );
    const restricted = parseCommonsExtMetadataPage(
      openLicensePage({
        LicenseShortName: { value: 'All rights reserved' },
        UsageTerms: { value: 'Permission only' },
      }),
      '2026-07-28T12:00:00.000Z',
    );

    expect(unknown.license.status).toBe('unverified');
    expect(restricted.license.status).toBe('restricted');
  });

  it('queries only the structured Commons API and never an image URL', async () => {
    const requests = [];
    const fetchImpl = vi.fn(async url => {
      requests.push(new URL(url));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          query: {
            pages: [openLicensePage()],
          },
        }),
      };
    });

    const entries = await fetchCommonsExtMetadata(['File:Test Artist.jpg'], {
      fetchImpl,
      fetchedAt: '2026-07-28T12:00:00.000Z',
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(requests[0].hostname).toBe('commons.wikimedia.org');
    expect(requests[0].pathname).toBe('/w/api.php');
    expect(requests[0].searchParams.get('prop')).toBe('imageinfo');
    expect(requests[0].searchParams.get('iiprop')).toBe('extmetadata');
    expect(requests[0].href).not.toContain('upload.wikimedia.org');
    expect(entries['file:test artist.jpg'].license.status).toBe('declared');
  });

  it('enriches only Commons rights fields and preserves restricted provider media', () => {
    const spotifyAsset = {
      ...commonsAsset,
      id: 'visual:spotify',
      provider: 'spotify',
      url: 'https://i.scdn.co/image/example',
      sourceUrl: 'https://open.spotify.com/artist/example',
      license: {
        status: 'restricted',
        id: null,
        name: 'Provider-controlled media',
        url: null,
      },
    };
    const manifest = {
      meta: {
        assetsAwaitingLicenseReview: 1,
      },
      visualAssets: [commonsAsset, spotifyAsset],
    };
    const entry = parseCommonsExtMetadataPage(openLicensePage(), '2026-07-28T12:00:00.000Z');
    const cache = createCommonsMetadataCache(
      { [normalizeCommonsTitleKey(entry.title)]: entry },
      '2026-07-28T12:00:00.000Z',
    );

    const result = enrichManifestWithCommonsMetadata(manifest, cache);

    expect(result.manifest.visualAssets[0]).toMatchObject({
      url: commonsAsset.url,
      license: { status: 'declared', id: 'CC BY-SA 4.0' },
      rightsMetadata: {
        provider: 'wikimedia-commons-api',
        title: 'File:Test Artist.jpg',
      },
    });
    expect(result.manifest.visualAssets[0].verifiedAt).toBeNull();
    expect(result.manifest.visualAssets[1]).toEqual(spotifyAsset);
    expect(result.manifest.meta.assetsAwaitingLicenseReview).toBe(0);
    expect(result.stats).toMatchObject({
      commonsAssetCount: 1,
      matchedAssetCount: 1,
      changedAssetCount: 1,
      unresolvedCommonsAssetCount: 0,
    });
    expect(manifest.visualAssets[0].license.status).toBe('unverified');
  });
});
