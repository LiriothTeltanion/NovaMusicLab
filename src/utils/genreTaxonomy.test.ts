import { describe, expect, it } from 'vitest';
import {
  canonicalGenreFamily,
  GENRE_FAMILIES,
  GENRE_FAMILY_IDS,
  genreFamilyLabel,
  isGenreFamily,
  sanitizeSecondaryTags,
  secondaryTagsForFamily,
} from './genreTaxonomy';

describe('genreTaxonomy', () => {
  it('keeps every controlled family unique and addressable', () => {
    expect(new Set(GENRE_FAMILY_IDS).size).toBe(GENRE_FAMILY_IDS.length);
    expect(GENRE_FAMILIES.map(family => family.id)).toEqual(GENRE_FAMILY_IDS);
    expect(GENRE_FAMILY_IDS.every(isGenreFamily)).toBe(true);
  });

  it('canonicalizes family input without inventing a genre', () => {
    expect(canonicalGenreFamily('  metalcore ')).toBe('Metalcore');
    expect(canonicalGenreFamily('POST-HARDCORE')).toBe('Post-Hardcore');
    expect(canonicalGenreFamily('genre that does not exist')).toBe('Unclassified');
    expect(canonicalGenreFamily('')).toBe('Unclassified');
  });

  it('provides complete ES, EN and HE family labels', () => {
    for (const family of GENRE_FAMILY_IDS) {
      expect(genreFamilyLabel(family, 'es')).not.toBe('');
      expect(genreFamilyLabel(family, 'en')).not.toBe('');
      expect(genreFamilyLabel(family, 'he')).not.toBe('');
    }
    expect(genreFamilyLabel('Unclassified', 'es')).toBe('Sin clasificar');
    expect(genreFamilyLabel('Unclassified', 'he')).toBe('לא מסווג');
  });

  it('only accepts controlled, canonical secondary tags for the selected family', () => {
    expect(secondaryTagsForFamily('Synthwave / Darksynth')).toContain('Darksynth');
    expect(sanitizeSecondaryTags('Synthwave / Darksynth', [
      ' darksynth ',
      'DARKSYNTH',
      'Dreamwave',
      'Metalcore',
    ])).toEqual(['Darksynth', 'Dreamwave']);
    expect(sanitizeSecondaryTags('Unclassified', ['Other'])).toEqual([]);
  });
});
