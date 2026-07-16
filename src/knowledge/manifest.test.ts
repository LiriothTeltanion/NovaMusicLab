import { describe, expect, it } from 'vitest';
import { validateArtistKnowledgeManifest } from '../db/validation';
import { artistKnowledgeManifest } from './manifest';

describe('artist knowledge manifest', () => {
  it('is versioned, internally linked and provenance-rich', () => {
    expect(validateArtistKnowledgeManifest(artistKnowledgeManifest)).toEqual([]);
    expect(artistKnowledgeManifest.meta.schemaVersion).toBe(1);
    expect(artistKnowledgeManifest.meta.artistCount).toBeGreaterThanOrEqual(100);
    // Keep depth high without rewarding identity-incorrect filler imagery.
    expect(artistKnowledgeManifest.meta.visualAssetCount).toBeGreaterThanOrEqual(290);

    for (const artist of artistKnowledgeManifest.artists) {
      expect(artist.provenance.length, artist.name).toBeGreaterThan(0);
      expect(artist.visualAssetIds.length, artist.name).toBeGreaterThan(0);
    }
  });

  it('never treats a remote URL as implicit license or privacy permission', () => {
    for (const asset of artistKnowledgeManifest.visualAssets) {
      expect(asset.url, asset.id).toMatch(/^https:\/\//);
      expect(asset.license.status, asset.id).toMatch(/^(verified|declared|unverified|restricted)$/);
      expect(asset.attribution.label, asset.id).not.toBe('');
      expect(asset.cachePolicy.strategy, asset.id).toBe('remote-browser');
      expect(asset.cachePolicy.maxAgeDays, asset.id).toBeNull();
      expect(asset.cachePolicy.privacyImpact, asset.id).toBe('third-party-request');
      expect(asset.focalPoint.x, asset.id).toBeGreaterThanOrEqual(0);
      expect(asset.focalPoint.x, asset.id).toBeLessThanOrEqual(1);
      expect(asset.focalPoint.y, asset.id).toBeGreaterThanOrEqual(0);
      expect(asset.focalPoint.y, asset.id).toBeLessThanOrEqual(1);
    }
  });
});
