import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { AppProvider, STRINGS, useApp } from './AppContext';
import {
  hasRequestedHebrewExperience,
  loadHebrewExperience,
  resetHebrewExperienceLoader,
} from '../i18n/loadHebrewExperience';
import { DOCUMENT_METADATA } from '../utils/i18n';
import { resetSafeStorageFallback } from '../utils/safeStorage';

function translationShape(value: unknown): unknown {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'function') return 'function';
  if (Array.isArray(value)) return value.map(translationShape);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, translationShape(child)]),
    );
  }
  return typeof value;
}

function LanguageProbe() {
  const { lang, setLang, t, isLanguageReady } = useApp();
  return (
    <>
      <button type="button" onClick={() => setLang(lang === 'en' ? 'he' : lang === 'he' ? 'es' : 'en')}>
        {lang}
      </button>
      <p>{t.appSubtitle}</p>
      <output>{isLanguageReady ? 'ready' : 'loading'}</output>
    </>
  );
}

function PreferenceProbe() {
  const { lang, setLang, theme, setTheme } = useApp();
  return (
    <>
      <button type="button" onClick={() => {
        setLang('es');
        setTheme('daylight');
      }}>
        set preferences
      </button>
      <output aria-label="language">{lang}</output>
      <output aria-label="theme">{theme}</output>
    </>
  );
}

describe('AppProvider document language', () => {
  afterEach(() => {
    cleanup();
    resetSafeStorageFallback();
    window.localStorage.clear();
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
    delete document.documentElement.dataset.language;
    resetHebrewExperienceLoader();
  });

  it('keeps the root lang attribute synchronized with the interface language', async () => {
    window.localStorage.setItem('nml_lang', 'en');
    render(
      <AppProvider>
        <LanguageProbe />
      </AppProvider>
    );

    expect(document.documentElement).toHaveAttribute('lang', 'en');
    fireEvent.click(screen.getByRole('button', { name: 'en' }));
    expect(document.documentElement).toHaveAttribute('lang', 'he');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(document.documentElement).toHaveAttribute('data-language', 'he');
    expect(document.title).toBe(DOCUMENT_METADATA.he.title);
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', DOCUMENT_METADATA.he.description);
    expect(window.localStorage.getItem('nml_lang')).toBe('he');
    expect(screen.getByRole('status', { name: 'טעינת הממשק בעברית' })).toHaveTextContent('טוענים את הממשק המלא בעברית');
    expect(screen.queryByText(STRINGS.en.appSubtitle)).not.toBeInTheDocument();
    expect(screen.queryByText(STRINGS.es.appSubtitle)).not.toBeInTheDocument();

    expect(await screen.findByText('היקום המוזיקלי שלך')).toBeInTheDocument();
    expect(screen.getByText('ready')).toBeInTheDocument();
  });

  it('does not request Hebrew-only catalogs for Spanish or English', () => {
    window.localStorage.setItem('nml_lang', 'en');
    render(<AppProvider><LanguageProbe /></AppProvider>);

    expect(hasRequestedHebrewExperience()).toBe(false);
    expect(screen.getByText(STRINGS.en.appSubtitle)).toBeInTheDocument();
  });

  it('keeps language and theme usable when localStorage throws SecurityError', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    const securityError = new DOMException('Storage access denied.', 'SecurityError');
    const blockedStorage: Storage = {
      get length(): number { throw securityError; },
      clear(): void { throw securityError; },
      getItem(_key: string): string | null { throw securityError; },
      key(_index: number): string | null { throw securityError; },
      removeItem(_key: string): void { throw securityError; },
      setItem(_key: string, _value: string): void { throw securityError; },
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: blockedStorage,
    });

    try {
      const firstRender = render(<AppProvider><PreferenceProbe /></AppProvider>);
      expect(screen.getByRole('status', { name: 'language' })).toHaveTextContent('en');
      expect(screen.getByRole('status', { name: 'theme' })).toHaveTextContent('cyber');

      fireEvent.click(screen.getByRole('button', { name: 'set preferences' }));
      expect(screen.getByRole('status', { name: 'language' })).toHaveTextContent('es');
      expect(screen.getByRole('status', { name: 'theme' })).toHaveTextContent('daylight');

      firstRender.unmount();
      render(<AppProvider><PreferenceProbe /></AppProvider>);
      expect(screen.getByRole('status', { name: 'language' })).toHaveTextContent('es');
      expect(screen.getByRole('status', { name: 'theme' })).toHaveTextContent('daylight');
    } finally {
      cleanup();
      if (originalDescriptor) {
        Object.defineProperty(window, 'localStorage', originalDescriptor);
      } else {
        Reflect.deleteProperty(window, 'localStorage');
      }
    }
  });

  it('keeps Hebrew structurally complete with the canonical Spanish and English copy', async () => {
    const hebrew = await loadHebrewExperience();

    expect(translationShape(hebrew)).toEqual(translationShape(STRINGS.en));
    expect(translationShape(hebrew)).toEqual(translationShape(STRINGS.es));
    expect(JSON.stringify(hebrew)).not.toMatch(/NOVA_(?:VAR|ITEM)/);
  });
});
