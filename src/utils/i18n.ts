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

/**
 * Written for someone who just tapped a link a friend sent them, not for a
 * technical reader. "local-first", "evidence-linked", "trilingual" and
 * "ListenBrainz" carry no meaning in a chat preview or a browser tab; the
 * concrete numbers do the work instead. Keep in step with the og:/twitter:
 * tags in index.html, which is what link scrapers actually read.
 */
export const DOCUMENT_METADATA: Record<Lang, { title: string; description: string }> = {
  es: {
    title: '11 años de música, convertidos en museo',
    description: '80.550 reproducciones. 20.551 canciones. 6.413 entradas de nombres de artistas. Explora 11 años de escucha como un museo vivo y crea el tuyo en privado.',
  },
  en: {
    title: '11 years of music, turned into a living museum',
    description: '80,550 plays. 20,551 tracks. 6,413 artist-name catalog entries. Explore 11 years of listening as a living museum, then build yours from files processed on your device.',
  },
  he: {
    title: '11 שנים של מוזיקה, שהפכו למוזיאון',
    description: '80,550 השמעות. 20,551 שירים. 6,413 רשומות שמות אמנים בקטלוג. חקרו 11 שנות האזנה כמוזיאון חי, ואז בנו אחד משלכם באופן פרטי.',
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
