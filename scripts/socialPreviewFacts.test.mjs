import { describe, expect, it } from 'vitest';

import { buildSocialPreviewFacts } from './lib/socialPreviewFacts.mjs';

describe('social preview facts', () => {
  it('formats every public metric from the supplied data contracts', () => {
    const facts = buildSocialPreviewFacts(
      { plays: 12345, tracks: 2345, artists: 345 },
      {
        catalogIdentity: { catalogEntryCount: 345 },
        snapshotFreshness: { observedThrough: '2027-02-03' },
      },
    );

    expect(facts).toEqual({
      catalogEntryLabel: '345',
      metricsLabel: '12,345 plays · 2,345 tracks · 345 catalog entries',
      observedThroughLabel: 'FEB 3, 2027',
    });
  });

  it('rejects a share card whose artist count disagrees with the manifest', () => {
    expect(() => buildSocialPreviewFacts(
      { plays: 12345, tracks: 2345, artists: 345 },
      {
        catalogIdentity: { catalogEntryCount: 346 },
        snapshotFreshness: { observedThrough: '2027-02-03' },
      },
    )).toThrow(/share metrics report 345.*manifest reports 346/i);
  });
});
