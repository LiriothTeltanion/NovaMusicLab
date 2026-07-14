import { describe, expect, it } from 'vitest';

import {
  LANGUAGE_OPTIONS,
  DOCUMENT_METADATA,
  directionFor,
  isLang,
  languageUiFor,
  localeFor,
  pickLanguage,
} from './i18n';

describe('i18n foundations', () => {
  it('exposes Spanish, English and Hebrew as supported languages', () => {
    expect(LANGUAGE_OPTIONS.map(option => option.code)).toEqual(['es', 'en', 'he']);
    expect(isLang('he')).toBe(true);
    expect(isLang('fr')).toBe(false);
  });

  it('uses the Israeli Hebrew locale and right-to-left direction', () => {
    expect(localeFor('he')).toBe('he-IL');
    expect(directionFor('he')).toBe('rtl');
    expect(directionFor('es')).toBe('ltr');
    expect(DOCUMENT_METADATA.he.title).toContain('הדנ״א המוזיקלי שלך');
  });

  it('keeps language controls localized in Hebrew', () => {
    expect(languageUiFor('he').groupLabel).toBe('שפת הממשק');
    expect(languageUiFor('he').switchTo.en).toContain('לאנגלית');
    expect(pickLanguage('he', { es: 'uno', en: 'one', he: 'אחד' })).toBe('אחד');
  });
});
