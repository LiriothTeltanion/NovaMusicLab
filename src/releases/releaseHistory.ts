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
        name: 'The Living Archive Finds Its Voice',
        summary: 'Nova presents Kevin / Lirioth’s listening history more clearly, invites visitors to build a private local museum, and makes artists, genres and obsessions easier to explore without presenting interpretations as diagnoses.',
        highlights: [
          'The Spotify, Last.fm and YouTube archive grows to 82,661 plays and 6,593 catalog entries, with every snapshot date shown honestly.',
          'The Atlas opens all 6,593 exact-name catalog entries through search, A–Z and most-listened views, while human introductions appear before technical evidence.',
          'Genre views keep Unclassified visible and say how many smaller known families are grouped instead of letting a large “Other” hide the long tail.',
          'Obsessions gain a cover-led spotlight and visual grid; all 50 bundled obsession moments have exact track-art matches, with a stable generated fallback if remote art cannot load.',
          'Overview now distinguishes Kevin / Lirioth’s public exhibition from the local “Build my museum” path, and emotional or personality readings are clearly interpretive and non-clinical.',
        ],
      },
      es: {
        name: 'El archivo vivo encuentra su voz',
        summary: 'Nova presenta con más claridad la historia musical de Kevin / Lirioth, invita a cada visitante a crear un museo privado local y hace más fácil explorar artistas, géneros y obsesiones sin presentar interpretaciones como diagnósticos.',
        highlights: [
          'El archivo de Spotify, Last.fm y YouTube crece a 82.661 escuchas y 6.593 entradas de catálogo, con cada fecha del snapshot mostrada con honestidad.',
          'El Atlas abre las 6.593 entradas de nombre exacto mediante búsqueda, A–Z y más escuchados, con una introducción humana antes de la evidencia técnica.',
          'Las vistas de géneros mantienen Sin clasificar visible e indican cuántas familias conocidas menores se agrupan, en vez de esconder la cola larga bajo un “Otros” enorme.',
          'Obsesiones gana un gran momento visual y una cuadrícula de portadas; sus 50 momentos incluidos tienen coincidencia exacta de arte, con fallback generado si una imagen remota falla.',
          'Resumen diferencia la exposición pública de Kevin / Lirioth del camino local “Crear mi museo”, y las lecturas emocionales o de personalidad se presentan como interpretativas y no clínicas.',
        ],
      },
      he: {
        name: 'הארכיון החי מוצא את קולו',
        summary: 'Nova מציגה בצורה ברורה יותר את היסטוריית ההאזנה של Kevin / Lirioth, מזמינה כל מבקר לבנות מוזיאון פרטי מקומי והופכת אמנים, ז׳אנרים ואובססיות לקלים יותר לחקירה בלי להציג פרשנות כאבחון.',
        highlights: [
          'ארכיון Spotify, Last.fm ו־YouTube גדל ל־82,661 השמעות ול־6,593 רשומות קטלוג, וכל תאריך בתמונת המצב מוצג בכנות.',
          'האטלס פותח את כל 6,593 רשומות השמות המדויקים באמצעות חיפוש, A–Z ולפי מספר השמעות, עם מבוא אנושי לפני הראיות הטכניות.',
          'תצוגות הז׳אנרים משאירות את הקטגוריה ללא סיווג גלויה ומציינות כמה משפחות מוכרות קטנות קובצו, במקום להסתיר את הזנב הארוך תחת “אחר” גדול.',
          'חדר האובססיות מקבל רגע חזותי מרכזי ורשת עטיפות; לכל 50 הרגעים הכלולים יש התאמת עטיפה מדויקת, עם גיבוי חזותי יציב אם תמונה מרוחקת נכשלת.',
          'מסך הסקירה מבדיל בין התערוכה הציבורית של Kevin / Lirioth לבין המסלול המקומי “בניית המוזיאון שלי”, ומציג קריאות רגשיות או אישיות כפרשניות ולא קליניות.',
        ],
      },
    },
  },
  {
    version: '1.5.0',
    date: '2026-08-01',
    status: 'deployed',
    current: false,
    story: {
      en: {
        name: 'The Living Archive Gets a Face',
        summary: 'Nova makes its historical snapshot easier to trust and explore, with dependable artist portraits, clearer genre evidence and safer local imports.',
        highlights: [
          'Broken artist placeholders are removed and replaced by deterministic visual fallbacks.',
          'Genre families, reviewed evidence and open research gaps are explained as different layers.',
          'Archive limits, mobile layouts, Hebrew RTL and keyboard access are strengthened for a safer first visit.',
        ],
      },
      es: {
        name: 'El archivo vivo cobra rostro',
        summary: 'Nova hace que su snapshot histórico sea más confiable y fácil de explorar, con retratos consistentes, evidencia de géneros más clara e importaciones locales más seguras.',
        highlights: [
          'Los placeholders rotos se retiran y se sustituyen por fallbacks visuales deterministas.',
          'Las familias de género, la evidencia revisada y los vacíos por investigar se explican como capas diferentes.',
          'Los límites de archivos, móvil, hebreo RTL y acceso por teclado mejoran para una primera visita más segura.',
        ],
      },
      he: {
        name: 'הארכיון החי מקבל פנים',
        summary: 'Nova הופכת את תמונת המצב ההיסטורית לאמינה וקלה יותר לחקירה, עם דיוקנאות עקביים, עדויות ז׳אנר ברורות יותר וייבוא מקומי בטוח יותר.',
        highlights: [
          'מצייני מקום שבורים של אמנים הוסרו והוחלפו בגיבויים חזותיים עקביים.',
          'משפחות ז׳אנר, עדויות שנבדקו ופערי מחקר מוצגים כשכבות נפרדות.',
          'מגבלות ארכיון, תצוגת מובייל, RTL עברי וגישה במקלדת חוזקו לביקור ראשון בטוח יותר.',
        ],
      },
    },
  },
  {
    version: '1.4.0',
    date: '2026-07-29',
    status: 'deployed',
    secondaryStatus: 'superseded',
    current: false,
    story: {
      en: {
        name: 'Living Genre Atlas',
        summary: 'Nova became a museum that visitors can make their own, while the artist atlas gained source-aware genres and subgenres.',
        highlights: [
          'A clearer sticky expedition console keeps hubs, rooms and search within reach.',
          'Guests can name a private local museum, import compatible files and compare it with Kevin’s public exhibition.',
        ],
      },
      es: {
        name: 'Atlas Vivo de Géneros',
        summary: 'Nova se convirtió en un museo que los visitantes también pueden hacer suyo, mientras el atlas ganó géneros y subgéneros con fuentes.',
        highlights: [
          'Una consola de expedición más clara mantiene hubs, salas y búsqueda siempre al alcance.',
          'Un visitante puede nombrar un museo local privado, importar archivos compatibles y compararlo con la exposición pública de Kevin.',
        ],
      },
      he: {
        name: 'אטלס ז׳אנרים חי',
        summary: 'Nova הפכה למוזיאון שגם מבקרים יכולים להפוך לשלהם, ואטלס האמנים קיבל ז׳אנרים ותתי־ז׳אנרים עם מקורות.',
        highlights: [
          'מסוף מסע ברור יותר משאיר את המוקדים, החדרים והחיפוש בהישג יד.',
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
    secondaryStatus: 'superseded',
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
