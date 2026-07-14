import { describe, expect, it } from 'vitest';
import type { ArtistGenreCatalogEntry } from '../types';
import {
  isArtistGenreCatalog,
  loadDefaultGenreCatalog,
  validateArtistGenreCatalog,
} from './defaultGenreCatalog';

const row: ArtistGenreCatalogEntry = {
  artistKey: 'Example Artist',
  name: 'Example Artist',
  plays: 4,
  automaticGenre: 'Unclassified',
  automaticFamily: 'Unclassified',
  country: 'Unknown',
  source: 'unclassified',
};

describe('default genre catalog', () => {
  it('loads the separately bundled catalog with unique, complete artist rows', async () => {
    const catalog = await loadDefaultGenreCatalog();

    expect(catalog.length).toBeGreaterThan(6_000);
    expect(new Set(catalog.map(artist => artist.artistKey)).size).toBe(catalog.length);
    expect(catalog.every(artist => artist.plays > 0)).toBe(true);
  });

  it('rejects duplicate identities and inconsistent unclassified provenance', () => {
    expect(isArtistGenreCatalog([row])).toBe(true);
    expect(isArtistGenreCatalog([row, { ...row }])).toBe(false);
    expect(isArtistGenreCatalog([{
      ...row,
      source: 'unclassified',
      automaticGenre: 'Metalcore',
      automaticFamily: 'Metalcore',
    }])).toBe(false);
    expect(() => validateArtistGenreCatalog([{ ...row, artistKey: 'different' }]))
      .toThrow('Invalid Nova Music Lab artist genre catalog.');
  });
});
