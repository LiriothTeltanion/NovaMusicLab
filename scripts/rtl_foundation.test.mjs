import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const css = readFileSync(resolve(root, 'src', 'index.css'), 'utf8');
const prepaint = html.match(/<script id="nova-language-prepaint">([\s\S]*?)<\/script>/)?.[1] ?? '';

describe('Hebrew prepaint and RTL foundation', () => {
  it('restores the saved Hebrew direction before remote styles are requested', () => {
    const prepaintIndex = html.indexOf('id="nova-language-prepaint"');
    const fontIndex = html.indexOf('fonts.googleapis.com/css2');

    expect(prepaintIndex).toBeGreaterThan(0);
    expect(prepaintIndex).toBeLessThan(fontIndex);
    expect(html).toContain("localStorage.getItem('nml_lang')");
    expect(html).toContain("language === 'he' ? 'rtl' : 'ltr'");
    expect(html).toContain('root.dataset.language = language');
  });

  it('executes the prepaint contract for a returning Hebrew session', () => {
    const documentElement = { lang: 'en', dir: 'ltr', dataset: { language: 'en' } };
    runInNewContext(prepaint, {
      document: { documentElement },
      localStorage: { getItem: () => 'he' },
    });

    expect(documentElement).toEqual({ lang: 'he', dir: 'rtl', dataset: { language: 'he' } });
  });

  it('keeps safe HTML defaults when browser storage is unavailable', () => {
    const documentElement = { lang: 'en', dir: 'ltr', dataset: { language: 'en' } };
    runInNewContext(prepaint, {
      document: { documentElement },
      localStorage: { getItem: () => { throw new Error('blocked'); } },
    });

    expect(documentElement).toEqual({ lang: 'en', dir: 'ltr', dataset: { language: 'en' } });
  });

  it('loads a Hebrew-native typeface and removes Latin display conventions', () => {
    expect(html).toContain('Noto+Sans+Hebrew');
    expect(css).toContain(":root[lang='he']");
    expect(css).toContain('--font-display: var(--font-hebrew)');
    expect(css).toContain('text-transform: none');
  });

  it('provides explicit bidi, chart and directional-icon boundaries', () => {
    expect(css).toContain('.nova-bidi-auto');
    expect(css).toContain('.nova-data-ltr');
    expect(css).toContain('.nova-mirror-rtl');
    expect(css).toContain("inset-inline-end: 0");
  });
});
