import { describe, expect, it } from 'vitest';

import shareMetrics from '../data/share_metrics.json';
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
    expect(DOCUMENT_METADATA.he.title).toBe('11 שנים של מוזיקה, שהפכו למוזיאון');
  });

  it('states the generated archive size, in every language', () => {
    // This used to assert the literal "80,550 השמעות". The archive grew, the
    // literal did not, and the assertion kept passing while the browser tab and
    // the WhatsApp card advertised a dataset the app no longer had.
    //
    // The guarantee is split in two. Here: the metadata renders whatever is in
    // share_metrics.json, so nobody can quietly re-hardcode a number. Outside
    // vitest: `npm run audit:share` proves share_metrics.json still equals the
    // compiled archive. That split is deliberate - test-setup.ts mocks
    // music_dna_compiled.json with a 50,476-play fixture, so a test comparing
    // against the real archive could never pass here.
    for (const [lang, plural] of [['es', 'reproducciones'], ['en', 'plays'], ['he', 'השמעות']] as const) {
      expect(DOCUMENT_METADATA[lang].description, lang)
        .toContain(shareMetrics.plays.toLocaleString(localeFor(lang), { useGrouping: 'always' }));
      expect(DOCUMENT_METADATA[lang].description, lang).toContain(plural);
    }
  });

  it('keeps language controls localized in Hebrew', () => {
    expect(languageUiFor('he').groupLabel).toBe('שפת הממשק');
    expect(languageUiFor('he').switchTo.en).toContain('לאנגלית');
    expect(pickLanguage('he', { es: 'uno', en: 'one', he: 'אחד' })).toBe('אחד');
  });
});
