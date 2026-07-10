import { describe, expect, it } from 'vitest';
import {
  getAlbumEnrichment,
  getArtistEnrichment,
  getRelatedArchiveArtists,
  normalizeCatalogName,
  type ArtistEnrichment,
} from './artistEnrichment';
import type { MusicDnaData } from '../types';

describe('normalizeCatalogName', () => {
  it('strips diacritics, apostrophes and punctuation into comparable keys', () => {
    expect(normalizeCatalogName('Sigur Rós')).toBe('sigur ros');
    expect(normalizeCatalogName("don't stop")).toBe('dont stop');
    expect(normalizeCatalogName('Mötley Crüe & Friends')).toBe('motley crue and friends');
    expect(normalizeCatalogName('Sempiternal (Deluxe Edition)')).toBe('sempiternal');
  });

  it('treats NFC and NFD encodings of the same name as identical', () => {
    const nfc = 'Sigur Rós';
    const nfd = nfc.normalize('NFD');
    expect(nfc).not.toBe(nfd); // sanity: byte-different inputs
    expect(normalizeCatalogName(nfc)).toBe(normalizeCatalogName(nfd));
  });

  it('keeps non-Latin scripts instead of erasing them', () => {
    expect(normalizeCatalogName('היהודים')).toBe('היהודים');
  });
});

const fakeProfile: ArtistEnrichment = {
  name: 'Test Band',
  aliases: [],
  origin: { es: '', en: '' },
  country: { es: '', en: '' },
  start_year: 2010,
  status: { es: '', en: '' },
  bio: { es: '', en: '' },
  archive_role: { es: '', en: '' },
  sound_evolution: { es: '', en: '' },
  why_it_matters: { es: '', en: '' },
  signature_moods: { es: [], en: [] },
  key_albums: [
    { title: 'Sempiternal', year: 2013, description: { es: '', en: '' } },
    { title: 'Live at the Union Chapel', year: 2015, description: { es: '', en: '' } },
  ],
};

describe('getAlbumEnrichment', () => {
  it('matches exact titles and deluxe-suffixed variants', () => {
    expect(getAlbumEnrichment(fakeProfile, 'Sempiternal')?.year).toBe(2013);
    expect(getAlbumEnrichment(fakeProfile, 'Sempiternal (Deluxe)')?.year).toBe(2013);
  });

  it('never lets a short generic title substring-match an unrelated album', () => {
    // "Live" is contained in "Live at the Union Chapel" but is far too generic
    // to inherit that album's year/description.
    expect(getAlbumEnrichment(fakeProfile, 'Live')).toBeUndefined();
    expect(getAlbumEnrichment(fakeProfile, 'II')).toBeUndefined();
  });

  it('returns undefined without a profile', () => {
    expect(getAlbumEnrichment(undefined, 'Sempiternal')).toBeUndefined();
  });
});

describe('getArtistEnrichment (real bundled data)', () => {
  it('finds curated profiles case-insensitively', () => {
    const profile = getArtistEnrichment('bring me the horizon');
    expect(profile?.name.toLowerCase()).toContain('bring me the horizon');
  });

  it('returns undefined for unknown artists instead of guessing', () => {
    expect(getArtistEnrichment('Totally Nonexistent Band XYZ')).toBeUndefined();
  });
});

describe('getRelatedArchiveArtists', () => {
  const data = {
    top_artists: [
      { name: 'Anchor', plays: 1000, genre: 'Blackgaze / Post-Metal', country: 'United States' },
      { name: 'Same Genre High Plays', plays: 900, genre: 'Blackgaze / Shoegaze', country: 'France' },
      { name: 'Same Country Only', plays: 800, genre: 'Country Pop', country: 'United States' },
      { name: 'Unrelated', plays: 2000, genre: 'Reggaeton', country: 'Puerto Rico' },
    ],
    top_tracks: [],
    top_albums: [],
    yearly_eras: [],
  } as unknown as MusicDnaData;

  it('ranks shared-genre matches above same-country-only matches', () => {
    const related = getRelatedArchiveArtists(data, 'Anchor');
    expect(related.map(r => r.artist.name)).toEqual(['Same Genre High Plays', 'Same Country Only']);
    expect(related[0].sharedGenres.length).toBeGreaterThan(0);
  });

  it('excludes artists with neither genre nor country overlap', () => {
    const related = getRelatedArchiveArtists(data, 'Anchor');
    expect(related.map(r => r.artist.name)).not.toContain('Unrelated');
  });

  it('returns empty for an artist not in the archive', () => {
    expect(getRelatedArchiveArtists(data, 'Ghost Artist')).toEqual([]);
  });
});
