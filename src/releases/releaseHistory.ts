import type { Lang } from '../utils/i18n';
import {
  CURRENT_NOVA_RELEASE_DATE,
  CURRENT_NOVA_RELEASE_STATUS,
  CURRENT_NOVA_VERSION,
} from './currentRelease';

export type NovaReleaseStatus =
  | 'private-candidate'
  | 'private-checkpoint'
  | 'deployed'
  | 'published'
  | 'superseded';

interface LocalizedReleaseStory {
  name: string;
  summary: string;
  highlights: string[];
}

export interface NovaReleaseStory {
  version: string;
  date: string;
  status: NovaReleaseStatus;
  secondaryStatus?: NovaReleaseStatus;
  current: boolean;
  story: Record<Lang, LocalizedReleaseStory>;
}

export const NOVA_RELEASE_HISTORY: readonly NovaReleaseStory[] = [
  {
    version: CURRENT_NOVA_VERSION,
    date: CURRENT_NOVA_RELEASE_DATE,
    status: CURRENT_NOVA_RELEASE_STATUS,
    current: true,
    story: {
      en: {
        name: 'Living Genre Atlas',
        summary: 'Nova becomes a museum that visitors can also make their own, while the artist atlas gains source-aware genres and subgenres.',
        highlights: [
          'A clearer sticky expedition console keeps hubs, rooms and search within reach.',
          'Artist genres are separated into documented facts, suggestions and honest research gaps.',
          'Guests can name a private local museum, import compatible files and compare it with Kevin’s public exhibition.',
        ],
      },
      es: {
        name: 'Atlas Vivo de Géneros',
        summary: 'Nova se convierte en un museo que los visitantes también pueden hacer suyo, mientras el atlas gana géneros y subgéneros con fuentes.',
        highlights: [
          'Una consola de expedición más clara mantiene hubs, salas y búsqueda siempre al alcance.',
          'Los géneros se separan en hechos documentados, sugerencias y vacíos honestos por investigar.',
          'Un visitante puede nombrar un museo local privado, importar archivos compatibles y compararlo con la exposición pública de Kevin.',
        ],
      },
      he: {
        name: 'אטלס ז׳אנרים חי',
        summary: 'Nova הופכת למוזיאון שגם מבקרים יכולים להפוך לשלהם, ואטלס האמנים מקבל ז׳אנרים ותתי־ז׳אנרים עם מקורות.',
        highlights: [
          'מסוף מסע ברור יותר משאיר את המוקדים, החדרים והחיפוש בהישג יד.',
          'ז׳אנרים מופרדים לעובדות מתועדות, הצעות ופערים כנים למחקר.',
          'אורחים יכולים לתת שם למוזיאון מקומי פרטי, לייבא קבצים נתמכים ולהשוות לתערוכה הציבורית של Kevin.',
        ],
      },
    },
  },
  {
    version: '1.3.0',
    date: '2026-07-29',
    status: 'private-checkpoint',
    secondaryStatus: 'superseded',
    current: false,
    story: {
      en: {
        name: 'Living Constellation',
        summary: 'A private visual checkpoint that introduced the changing artist constellation and was folded into 1.4.0.',
        highlights: ['It was never published as a public release.'],
      },
      es: {
        name: 'Constelación Viva',
        summary: 'Un checkpoint visual privado que introdujo la constelación cambiante de artistas y fue integrado en 1.4.0.',
        highlights: ['Nunca se publicó como versión pública.'],
      },
      he: {
        name: 'קונסטלציה חיה',
        summary: 'נקודת ביקורת חזותית פרטית שהציגה את קבוצת האמנים המשתנה ושולבה בגרסה 1.4.0.',
        highlights: ['היא מעולם לא פורסמה כגרסה ציבורית.'],
      },
    },
  },
  {
    version: '1.2.0',
    date: '2026-07-29',
    status: 'deployed',
    current: false,
    story: {
      en: {
        name: 'Five Hubs, Three Depths',
        summary: 'Nova gained guided, explore and deep-dive modes, five understandable hubs, sharing tools and important speed improvements.',
        highlights: [],
      },
      es: {
        name: 'Cinco hubs, tres profundidades',
        summary: 'Nova añadió los modos guiado, explorar y a fondo, cinco hubs comprensibles, herramientas para compartir y mejoras importantes de velocidad.',
        highlights: [],
      },
      he: {
        name: 'חמישה מוקדים, שלוש רמות עומק',
        summary: 'Nova קיבלה מצבים מודרך, חקירה ועומק, חמישה מוקדים ברורים, כלי שיתוף ושיפורי מהירות חשובים.',
        highlights: [],
      },
    },
  },
  {
    version: '1.1.0',
    date: '2026-07-26',
    status: 'deployed',
    secondaryStatus: 'superseded',
    current: false,
    story: {
      en: {
        name: 'Living Artist Atlas',
        summary: 'Artist exploration, an active local archive and museum-wide search became part of the main experience.',
        highlights: [],
      },
      es: {
        name: 'Atlas Vivo de Artistas',
        summary: 'La exploración de artistas, el archivo local activo y la búsqueda de todo el museo entraron en la experiencia principal.',
        highlights: [],
      },
      he: {
        name: 'אטלס אמנים חי',
        summary: 'חקר אמנים, ארכיון מקומי פעיל וחיפוש בכל המוזיאון הפכו לחלק מהחוויה הראשית.',
        highlights: [],
      },
    },
  },
  {
    version: '1.0.0',
    date: '2026-07-16',
    status: 'published',
    secondaryStatus: 'superseded',
    current: false,
    story: {
      en: {
        name: 'First Stable Edition',
        summary: 'The first stable multilingual, local-first edition established Nova as a personal music museum.',
        highlights: [],
      },
      es: {
        name: 'Primera edición estable',
        summary: 'La primera edición estable, multilingüe y local estableció Nova como un museo musical personal.',
        highlights: [],
      },
      he: {
        name: 'מהדורה יציבה ראשונה',
        summary: 'המהדורה היציבה, הרב־לשונית והמקומית הראשונה ביססה את Nova כמוזיאון מוזיקה אישי.',
        highlights: [],
      },
    },
  },
] as const;

export const CURRENT_NOVA_RELEASE = NOVA_RELEASE_HISTORY.find(release => release.current)
  ?? NOVA_RELEASE_HISTORY[0];
