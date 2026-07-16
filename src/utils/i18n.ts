export type Lang = 'es' | 'en' | 'he';

export type TextDirection = 'ltr' | 'rtl';

export interface LanguageOption {
  code: Lang;
  shortLabel: string;
  nativeLabel: string;
  locale: string;
  direction: TextDirection;
  emoji: string;
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { code: 'es', shortLabel: 'ES', nativeLabel: 'Español', locale: 'es-ES', direction: 'ltr', emoji: '🇪🇸' },
  { code: 'en', shortLabel: 'EN', nativeLabel: 'English', locale: 'en-US', direction: 'ltr', emoji: '🇬🇧' },
  { code: 'he', shortLabel: 'עב', nativeLabel: 'עברית', locale: 'he-IL', direction: 'rtl', emoji: '🇮🇱' },
] as const;

export const DOCUMENT_METADATA: Record<Lang, { title: string; description: string }> = {
  es: {
    title: 'Nova Music Lab ✧ Tu ADN musical',
    description: 'Un museo musical trilingüe y local que convierte exportaciones de Spotify, Last.fm, Apple Music, ListenBrainz y YouTube en análisis, historias y arte generativo con evidencia.',
  },
  en: {
    title: 'Nova Music Lab ✧ Your Musical DNA',
    description: 'A trilingual, local-first music museum that turns Spotify, Last.fm, Apple Music, ListenBrainz and YouTube exports into evidence-linked analytics, stories and generative art.',
  },
  he: {
    title: 'Nova Music Lab ✧ הדנ״א המוזיקלי שלך',
    description: 'מוזיאון מוזיקלי תלת־לשוני ומקומי שהופך את היסטוריית ההאזנה שלך מייצואי Spotify, Last.fm, Apple Music, ListenBrainz ו-YouTube לניתוחים, סיפורים ואמנות גנרטיבית מבוססי ראיות.',
  },
};

const LANGUAGE_UI: Record<Lang, {
  groupLabel: string;
  selectLabel: string;
  switchTo: Record<Lang, string>;
}> = {
  es: {
    groupLabel: 'Idioma de la interfaz',
    selectLabel: 'Seleccionar idioma de la interfaz',
    switchTo: {
      es: 'Cambiar idioma a español',
      en: 'Cambiar idioma a inglés',
      he: 'Cambiar idioma a hebreo',
    },
  },
  en: {
    groupLabel: 'Interface language',
    selectLabel: 'Select interface language',
    switchTo: {
      es: 'Switch language to Spanish',
      en: 'Switch language to English',
      he: 'Switch language to Hebrew',
    },
  },
  he: {
    groupLabel: 'שפת הממשק',
    selectLabel: 'בחירת שפת הממשק',
    switchTo: {
      es: 'החלפת השפה לספרדית',
      en: 'החלפת השפה לאנגלית',
      he: 'החלפת השפה לעברית',
    },
  },
};

export function isLang(value: string | null): value is Lang {
  return value === 'es' || value === 'en' || value === 'he';
}

export function localeFor(lang: Lang): string {
  return LANGUAGE_OPTIONS.find(option => option.code === lang)?.locale ?? 'en-US';
}

export function directionFor(lang: Lang): TextDirection {
  return lang === 'he' ? 'rtl' : 'ltr';
}

export function languageUiFor(lang: Lang) {
  return LANGUAGE_UI[lang];
}

export function pickLanguage<T>(lang: Lang, values: Record<Lang, T>): T {
  return values[lang];
}
