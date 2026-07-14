import { describe, expect, it } from 'vitest';
import { localizeGenreName, localizePlatformName } from './localizedDatasetText';

describe('localizeGenreName', () => {
  it('localizes synthetic genre buckets in all supported languages', () => {
    expect(localizeGenreName('Unclassified', 'he')).toBe('לא מסווג');
    expect(localizeGenreName('Alternative / Miscellaneous', 'he')).toBe('אלטרנטיבי / שונות');
    expect(localizeGenreName('Other', 'he')).toBe('אחר');
    expect(localizeGenreName('Other', 'es')).toBe('Otros');
    expect(localizeGenreName('Unclassified', 'en')).toBe('Unclassified');
  });

  it('preserves real genre names verbatim', () => {
    expect(localizeGenreName('Blackgaze', 'he')).toBe('Blackgaze');
  });
});

describe('localizePlatformName', () => {
  it('localizes normalized descriptive families and preserves brands', () => {
    expect(localizePlatformName('Other', 'he')).toBe('אחר');
    expect(localizePlatformName('Web player', 'he')).toBe('נגן רשת');
    expect(localizePlatformName('Android phone', 'es')).toBe('Teléfono Android');
    expect(localizePlatformName('PlayStation', 'he')).toBe('PlayStation');
  });
});
