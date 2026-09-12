import shareMetrics from '../data/share_metrics.json';

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
 * concrete numbers do the work instead.
 *
 * The numbers are no longer typed here. They were, in three languages, next to
 * a comment asking whoever came next to keep them in step with index.html - and
 * after the archive refresh the preview card advertised 80,550 plays while the
 * hero counted up to 82,661. share_metrics.json is generated from the same
 * core_metrics fields HeroSection animates, by scripts/sync_share_metrics.mjs,
 * whose --check mode fails the build if any share surface drifts again. The
 * file is three integers, so importing it costs the landing shell nothing.
 */
// localeFor is a hoisted function declaration further down this file, so it is
// callable while these module-level constants are being built.
//
// useGrouping 'always' because Spanish drops the separator on four-digit
// numbers, and "82.661 reproducciones. 20.908 canciones. 6593 entradas" reads
// like a typo sitting between two grouped figures.
const shareCount = (value: number, lang: Lang) =>
  value.toLocaleString(localeFor(lang), { useGrouping: 'always' });

export const DOCUMENT_METADATA: Record<Lang, { title: string; description: string }> = {
  es: {
    title: '11 años de música, convertidos en museo',
    description: `${shareCount(shareMetrics.plays, 'es')} reproducciones. ${shareCount(shareMetrics.tracks, 'es')} canciones. ${shareCount(shareMetrics.artists, 'es')} entradas de nombres de artistas. Explora 11 años de escucha como un museo vivo y crea el tuyo en privado.`,
  },
  en: {
    title: '11 years of music, turned into a living museum',
    description: `${shareCount(shareMetrics.plays, 'en')} plays. ${shareCount(shareMetrics.tracks, 'en')} tracks. ${shareCount(shareMetrics.artists, 'en')} artist-name catalog entries. Explore 11 years of listening as a living museum, then build yours from files processed on your device.`,
  },
  he: {
    title: '11 שנים של מוזיקה, שהפכו למוזיאון',
    description: `${shareCount(shareMetrics.plays, 'he')} השמעות. ${shareCount(shareMetrics.tracks, 'he')} שירים. ${shareCount(shareMetrics.artists, 'he')} רשומות שמות אמנים בקטלוג. חקרו 11 שנות האזנה כמוזיאון חי, ואז בנו אחד משלכם באופן פרטי.`,
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
