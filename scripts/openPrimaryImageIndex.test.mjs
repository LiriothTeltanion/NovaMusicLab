import { describe, expect, it } from 'vitest';

import { buildOpenPrimaryImageIndex } from './lib/openPrimaryImageIndex.mjs';

function manifestWith(visualAssets) {
  return {
    artists: [
      { id: 'artist:eligible', name: 'Eligible Artist', normalizedName: 'eligible artist' },
      { id: 'artist:tesseract', name: 'TesseracT', normalizedName: 'tesseract' },
    ],
    visualAssets,
  };
}

function primaryAsset(overrides = {}) {
  return {
    id: 'visual:eligible',
    entityId: 'artist:eligible',
    role: 'primary',
    provider: 'wikimedia-commons',
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Eligible.jpg',
    license: { status: 'declared' },
    ...overrides,
  };
}

describe('open primary image runtime index', () => {
  it('includes declared and verified Wikimedia primary images', () => {
    const index = buildOpenPrimaryImageIndex(manifestWith([
      primaryAsset(),
      primaryAsset({
        id: 'visual:tesseract',
        entityId: 'artist:tesseract',
        url: 'https://commons.wikimedia.org/wiki/Special:FilePath/TesseracT.jpg',
        license: { status: 'verified' },
      }),
    ]));

    expect(index).toEqual({
      'eligible artist': 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Eligible.jpg',
      tesseract: 'https://commons.wikimedia.org/wiki/Special:FilePath/TesseracT.jpg',
    });
  });

  it('excludes unverified, restricted, non-primary and non-Wikimedia assets', () => {
    const index = buildOpenPrimaryImageIndex(manifestWith([
      primaryAsset({ license: { status: 'unverified' } }),
      primaryAsset({
        id: 'visual:restricted',
        entityId: 'artist:tesseract',
        license: { status: 'restricted' },
      }),
      primaryAsset({ id: 'visual:gallery', role: 'gallery' }),
      primaryAsset({ id: 'visual:spotify', provider: 'spotify' }),
      primaryAsset({ id: 'visual:spoofed', url: 'https://example.com/Wikimedia.jpg' }),
    ]));

    expect(index).toEqual({});
  });

  it('preserves punctuation and diacritics in browser-compatible artist keys', () => {
    const artists = [
      { id: 'artist:heat', name: ' H.E.A.T ', normalizedName: 'h e a t' },
      { id: 'artist:nothing-nowhere', name: 'nothing,nowhere.', normalizedName: 'nothing nowhere' },
      { id: 'artist:sigur-ros', name: 'Sigur Ro\u0301s', normalizedName: 'sigur ros' },
    ];
    const visualAssets = artists.map((artist, index) => primaryAsset({
      id: `visual:${index}`,
      entityId: artist.id,
      url: `https://upload.wikimedia.org/wikipedia/commons/a/ab/Eligible_${index}.jpg`,
    }));

    expect(buildOpenPrimaryImageIndex({ artists, visualAssets })).toEqual({
      'h.e.a.t': 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Eligible_0.jpg',
      'nothing,nowhere.': 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Eligible_1.jpg',
      'sigur rós': 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Eligible_2.jpg',
    });
  });

  it('rejects multiple eligible primary images for the same artist', () => {
    expect(() => buildOpenPrimaryImageIndex(manifestWith([
      primaryAsset(),
      primaryAsset({
        id: 'visual:duplicate',
        url: 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Duplicate.jpg',
      }),
    ]))).toThrow(/Multiple eligible primary images/);
  });
});
