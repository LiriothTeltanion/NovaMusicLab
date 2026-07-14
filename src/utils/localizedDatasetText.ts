import { localeFor, pickLanguage, type Lang } from './i18n';
import type {
  PersonalityMatrix,
  SourceSummary,
  YearlyEra,
} from '../types';

type PersonalityKey = keyof PersonalityMatrix;

interface CulturalSceneTag {
  tag: string;
  color: string;
}

const ERA_DESC_EN: Record<string, string> = {
  'Synthwave oscuro, metal técnico, Carpenter Brut y descubrimientos progresivos.':
    'Dark synthwave, technical metal, Carpenter Brut and progressive discoveries.',
  'H.E.A.T, Tokio Hotel, vibras synthwave nocturnas y estéticas melódicas.':
    'H.E.A.T, Tokio Hotel, nocturnal synthwave vibes and melodic aesthetics.',
  'Ghost, The Midnight, mística rock, misterio y sonidos cinematográficos.':
    'Ghost, The Midnight, rock mysticism, mystery and cinematic sounds.',
  'Santa Cruz, rock local e integración en nuevas escenas vitales.':
    'Santa Cruz, local rock and integration into new life scenes.',
  'The Word Alive, Emarosa, voz vulnerable y búsquedas emocionales profundas.':
    'The Word Alive, Emarosa, vulnerable vocals and deep emotional searching.',
  'Bring Me the Horizon, Bilmuri, mezcla de pop, metal y catarsis en pandemia.':
    'Bring Me the Horizon, Bilmuri, a pandemic blend of pop, metal and catharsis.',
  'Slaves, Deafheaven, Alcest, fusión gigante de post-hardcore y guitarras celestiales.':
    'Slaves, Deafheaven, Alcest, a huge fusion of post-hardcore and celestial guitars.',
  'Deafheaven (In Blur), melancolía intensa y nostalgia activa en las mañanas.':
    'Deafheaven (In Blur), intense melancholy and active nostalgia in the mornings.',
  'Nevertel, Magnolia Park, pop-punk digital y rap-rock enérgico.':
    'Nevertel, Magnolia Park, digital pop-punk and energetic rap-rock.',
  'Bilmuri, Corbin Karasu, groove reconstructivo y madurez musical.':
    'Bilmuri, Corbin Karasu, reconstructive groove and musical maturity.',
  'nothingnowhere., introspección lírica profunda y reconstrucción artística.':
    'nothingnowhere., deep lyrical introspection and artistic reconstruction.',
  'The Kid LAROI, rap-pop alternativo, sonidos modernos de alta energía.':
    'The Kid LAROI, alternative rap-pop and modern high-energy sounds.',
};

const ERA_DESC_HE: Record<string, string> = {
  'Synthwave oscuro, metal técnico, Carpenter Brut y descubrimientos progresivos.':
    "סינת'ווייב אפל, מטאל טכני, Carpenter Brut ותגליות פרוגרסיביות.",
  'H.E.A.T, Tokio Hotel, vibras synthwave nocturnas y estéticas melódicas.':
    "H.E.A.T, Tokio Hotel, אווירת סינת'ווייב לילית ואסתטיקה מלודית.",
  'Ghost, The Midnight, mística rock, misterio y sonidos cinematográficos.':
    'Ghost, The Midnight, מיסטיקה של רוק, מסתורין וצלילים קולנועיים.',
  'Santa Cruz, rock local e integración en nuevas escenas vitales.':
    'Santa Cruz, רוק מקומי והשתלבות בסצנות חיים חדשות.',
  'The Word Alive, Emarosa, voz vulnerable y búsquedas emocionales profundas.':
    'The Word Alive, Emarosa, שירה חשופה וחיפוש רגשי עמוק.',
  'Bring Me the Horizon, Bilmuri, mezcla de pop, metal y catarsis en pandemia.':
    'Bring Me the Horizon, Bilmuri, שילוב של פופ, מטאל וקתרזיס בתקופת המגפה.',
  'Slaves, Deafheaven, Alcest, fusión gigante de post-hardcore y guitarras celestiales.':
    'Slaves, Deafheaven, Alcest, מיזוג אדיר של פוסט־הארדקור וגיטרות שמימיות.',
  'Deafheaven (In Blur), melancolía intensa y nostalgia activa en las mañanas.':
    'Deafheaven (In Blur), מלנכוליה עזה ונוסטלגיה פעילה בשעות הבוקר.',
  'Nevertel, Magnolia Park, pop-punk digital y rap-rock enérgico.':
    'Nevertel, Magnolia Park, פופ־פאנק דיגיטלי וראפ־רוק אנרגטי.',
  'Bilmuri, Corbin Karasu, groove reconstructivo y madurez musical.':
    'Bilmuri, Corbin Karasu, גרוב של בנייה מחדש ובשלות מוזיקלית.',
  'nothingnowhere., introspección lírica profunda y reconstrucción artística.':
    'nothingnowhere., התבוננות לירית עמוקה ובנייה אמנותית מחדש.',
  'The Kid LAROI, rap-pop alternativo, sonidos modernos de alta energía.':
    'The Kid LAROI, ראפ־פופ אלטרנטיבי וצלילים מודרניים עתירי אנרגיה.',
};

const CULTURAL_SCENE_TAGS: Record<Lang, CulturalSceneTag[]> = {
  es: [
    { tag: '🤘 Post-Hardcore USA', color: '#3b82f6' },
    { tag: '⚡ Synthwave Francia/USA', color: '#8b5cf6' },
    { tag: '🎸 Glam Rock Escandinavia', color: '#facc15' },
    { tag: '🌌 Blackgaze Global', color: '#00f2fe' },
    { tag: '🎮 Cultura Internet', color: '#10b981' },
    { tag: '🇮🇱 Rock Israelí', color: '#34d399' },
    { tag: '🔥 Metalcore UK/USA', color: '#ef4444' },
    { tag: '🌙 Darksynth Cyberpunk', color: '#f72585' },
  ],
  en: [
    { tag: '🤘 Post-Hardcore USA', color: '#3b82f6' },
    { tag: '⚡ Synthwave France/USA', color: '#8b5cf6' },
    { tag: '🎸 Scandinavian Glam Rock', color: '#facc15' },
    { tag: '🌌 Global Blackgaze', color: '#00f2fe' },
    { tag: '🎮 Internet Culture', color: '#10b981' },
    { tag: '🇮🇱 Israeli Rock', color: '#34d399' },
    { tag: '🔥 Metalcore UK/USA', color: '#ef4444' },
    { tag: '🌙 Cyberpunk Darksynth', color: '#f72585' },
  ],
  he: [
    { tag: '🤘 פוסט־הארדקור מארה״ב', color: '#3b82f6' },
    { tag: "⚡ סינת'ווייב מצרפת/ארה״ב", color: '#8b5cf6' },
    { tag: '🎸 גלאם רוק סקנדינבי', color: '#facc15' },
    { tag: '🌌 בלאקגייז גלובלי', color: '#00f2fe' },
    { tag: '🎮 תרבות אינטרנט', color: '#10b981' },
    { tag: '🇮🇱 רוק ישראלי', color: '#34d399' },
    { tag: '🔥 מטאלקור מבריטניה/ארה״ב', color: '#ef4444' },
    { tag: "🌙 דארקסינת' סייברפאנקי", color: '#f72585' },
  ],
};

// Must cover every country value in artist_meta.json (the origin map surfaces
// them all now, not just the historical listening countries).
const COUNTRY_NAMES_ES: Record<string, string> = {
  'United States': 'Estados Unidos',
  'United Kingdom': 'Reino Unido',
  Sweden: 'Suecia',
  Finland: 'Finlandia',
  Germany: 'Alemania',
  France: 'Francia',
  India: 'India',
  Israel: 'Israel',
  Norway: 'Noruega',
  'New Zealand': 'Nueva Zelanda',
  'Puerto Rico': 'Puerto Rico',
  Venezuela: 'Venezuela',
  'Dominican Republic': 'República Dominicana',
  Romania: 'Rumanía',
  Argentina: 'Argentina',
  Australia: 'Australia',
  Barbados: 'Barbados',
  Brazil: 'Brasil',
  Canada: 'Canadá',
  Colombia: 'Colombia',
  Iceland: 'Islandia',
  Ireland: 'Irlanda',
  Italy: 'Italia',
  Japan: 'Japón',
  Mexico: 'México',
  Netherlands: 'Países Bajos',
  'South Africa': 'Sudáfrica',
  'South Korea': 'Corea del Sur',
  Spain: 'España',
  Tunisia: 'Túnez',
  Wales: 'Gales',
  Egypt: 'Egipto',
  Poland: 'Polonia',
  Austria: 'Austria',
  Denmark: 'Dinamarca',
  Unknown: 'Desconocido',
};

const COUNTRY_NAMES_HE: Record<string, string> = {
  'United States': 'ארצות הברית',
  'United Kingdom': 'הממלכה המאוחדת',
  Sweden: 'שוודיה',
  Finland: 'פינלנד',
  Germany: 'גרמניה',
  France: 'צרפת',
  India: 'הודו',
  Israel: 'ישראל',
  Norway: 'נורווגיה',
  'New Zealand': 'ניו זילנד',
  'Puerto Rico': 'פוארטו ריקו',
  Venezuela: 'ונצואלה',
  'Dominican Republic': 'הרפובליקה הדומיניקנית',
  Romania: 'רומניה',
  Argentina: 'ארגנטינה',
  Australia: 'אוסטרליה',
  Barbados: 'ברבדוס',
  Brazil: 'ברזיל',
  Canada: 'קנדה',
  Colombia: 'קולומביה',
  Iceland: 'איסלנד',
  Ireland: 'אירלנד',
  Italy: 'איטליה',
  Japan: 'יפן',
  Mexico: 'מקסיקו',
  Netherlands: 'הולנד',
  'South Africa': 'דרום אפריקה',
  'South Korea': 'קוריאה הדרומית',
  Spain: 'ספרד',
  Tunisia: 'תוניסיה',
  Wales: 'ויילס',
  Egypt: 'מצרים',
  Poland: 'פולין',
  Austria: 'אוסטריה',
  Denmark: 'דנמרק',
  Unknown: 'לא ידוע',
};

const TRAIT_AXIS_LABELS: Record<PersonalityKey, Record<Lang, string>> = {
  sensibilidad_emocional: { es: 'Sensibilidad', en: 'Sensitivity', he: 'רגישות' },
  nostalgia: { es: 'Nostalgia', en: 'Nostalgia', he: 'נוסטלגיה' },
  energia: { es: 'Energía', en: 'Energy', he: 'אנרגיה' },
  oscuridad_estetica: { es: 'Oscuridad', en: 'Darkness', he: 'אפלוליות' },
  creatividad: { es: 'Creatividad', en: 'Creativity', he: 'יצירתיות' },
  rebeldia: { es: 'Rebeldía', en: 'Rebellion', he: 'מרדנות' },
  futurismo: { es: 'Futurismo', en: 'Futurism', he: 'עתידנות' },
};

const GENERIC_GENRE_LABELS: Record<string, Record<Lang, string>> = {
  'Alternative / Miscellaneous': { es: 'Alternativo / Miscelánea', en: 'Alternative / Miscellaneous', he: 'אלטרנטיבי / שונות' },
  Unclassified: { es: 'Sin clasificar', en: 'Unclassified', he: 'לא מסווג' },
  Other: { es: 'Otros', en: 'Other', he: 'אחר' },
};

const PLATFORM_FAMILY_LABELS: Record<string, Record<Lang, string>> = {
  'Smart TV': { es: 'Televisor inteligente', en: 'Smart TV', he: 'טלוויזיה חכמה' },
  'YouTube import': { es: 'Importación de YouTube', en: 'YouTube import', he: 'ייבוא מ־YouTube' },
  'Android tablet': { es: 'Tablet Android', en: 'Android tablet', he: 'טאבלט Android' },
  'Android phone': { es: 'Teléfono Android', en: 'Android phone', he: 'טלפון Android' },
  'Windows desktop': { es: 'Escritorio Windows', en: 'Windows desktop', he: 'מחשב Windows' },
  'Apple mobile': { es: 'Apple móvil', en: 'Apple mobile', he: 'מכשיר Apple נייד' },
  'Web player': { es: 'Reproductor web', en: 'Web player', he: 'נגן רשת' },
  Other: { es: 'Otros', en: 'Other', he: 'אחר' },
};

export function localizeEraDescription(era: YearlyEra, lang: Lang, locale = localeFor(lang)) {
  if (/^Un año marcado por /i.test(era.era_desc)) {
    const plays = era.plays.toLocaleString(locale);
    const artists = era.unique_artists.toLocaleString(locale);
    return pickLanguage(lang, {
      es: `Un año marcado por ${era.top_artist}, ${plays} reproducciones y ${artists} artistas únicos.`,
      en: `A year shaped by ${era.top_artist}, ${plays} plays and ${artists} unique artists.`,
      he: `שנה שעוצבה בידי ${era.top_artist}, עם ${plays} השמעות ו־${artists} אמנים ייחודיים.`,
    });
  }

  if (lang === 'en') return ERA_DESC_EN[era.era_desc] ?? era.era_desc;
  if (lang === 'he') return ERA_DESC_HE[era.era_desc] ?? era.era_desc;
  return era.era_desc;
}

export function localizeSourceNote(source: SourceSummary, lang: Lang) {
  if (lang === 'he') {
    if (source.source_type === 'merged') {
      return 'העלאה משולבת: הסכומים כוללים את כל האירועים שיובאו. החפיפה נמדדת לפי שמות מנורמלים של אמן ושיר.';
    }
    if (source.source_type === 'spotify') {
      return 'העלאת Spotify בלבד: דילוגים, פלטפורמה ומדינה נמדדים ישירות מקובץ הייצוא.';
    }
    if (source.source_type === 'youtube') {
      return 'העלאת YouTube בלבד: זמני הצפייה נלקחים ישירות, ואילו שמות האמן והשיר מוסקים מכותרות הסרטונים ומהערוצים.';
    }
    if (source.source_type === 'apple_music') {
      return 'העלאת Apple Music בלבד: חותמות הזמן של Play Activity נלקחות ישירות; שורות ללא אמן שניתן לזהות מושמטות במקום לנחש.';
    }
    if (source.source_type === 'listenbrainz') {
      return 'העלאת ListenBrainz בלבד: ההאזנות נלקחות ישירות, כולל שדות האמן, השיר והאלבום שכבר תיעדת שם.';
    }
    if (source.source_type === 'lastfm' && (source.spotify_plays > 0 || source.spotify_short_plays > 0)) {
      return 'ניתוח ההדגמה המובנה: Last.fm הוא ציר הזמן המאומת העיקרי; נתוני Spotify הם אומדנים ברמת הדוח, אלא אם מעלים ייצוא עדכני של Spotify.';
    }
    if (source.source_type === 'lastfm') {
      return 'העלאת Last.fm בלבד: חותמות הזמן וההשמעות נלקחות ישירות; נתוני דילוגים ופלטפורמה אינם זמינים.';
    }
    return 'מקור לא מזוהה: תצוגה זו משתמשת באירועים המיובאים הזמינים ביותר ומסמנת בנפרד שדות שאינם זמינים.';
  }

  if (lang === 'en') {
    if (source.source_type === 'merged') {
      return 'Merged upload: totals include all imported events. Overlap is measured by normalized artist + track names.';
    }
    if (source.source_type === 'spotify') {
      return 'Spotify-only upload: skip, platform and country data are measured directly from the export.';
    }
    if (source.source_type === 'youtube') {
      return 'YouTube-only upload: watch timestamps are direct, while artist and track names are inferred from video titles and channels.';
    }
    if (source.source_type === 'apple_music') {
      return 'Apple Music-only upload: Play Activity timestamps are direct, while rows without a resolvable artist are skipped rather than guessed.';
    }
    if (source.source_type === 'listenbrainz') {
      return 'ListenBrainz-only upload: listens are direct, including the artist, track and album fields you already scrobbled there.';
    }
    if (source.source_type === 'lastfm' && (source.spotify_plays > 0 || source.spotify_short_plays > 0)) {
      return 'Bundled demo analysis: Last.fm is the primary verified timeline; Spotify values are report-level estimates unless a fresh Spotify export is uploaded.';
    }
    if (source.source_type === 'lastfm') {
      return 'Last.fm-only upload: timestamps and scrobbles are direct, while skip/platform data are unavailable.';
    }
    return 'Unknown source: this view is using the best available imported events and marks unavailable fields separately.';
  }

  if (source.source_type === 'merged') {
    return 'Carga combinada: los totales incluyen todos los eventos importados. El solapamiento se mide por nombres normalizados de artista y canción.';
  }
  if (source.source_type === 'spotify') {
    return 'Carga solo de Spotify: saltos, plataforma y país se miden directamente desde la exportación.';
  }
  if (source.source_type === 'youtube') {
    return 'Carga solo de YouTube: los timestamps son directos, mientras artista y canción se infieren desde títulos de video y canales.';
  }
  if (source.source_type === 'apple_music') {
    return 'Carga solo de Apple Music: los timestamps de Play Activity son directos; las filas sin artista identificable se descartan en vez de adivinarse.';
  }
  if (source.source_type === 'listenbrainz') {
    return 'Carga solo de ListenBrainz: los listens son directos, incluyendo artista, canción y álbum que ya scrobbleaste ahí.';
  }
  if (source.source_type === 'lastfm' && (source.spotify_plays > 0 || source.spotify_short_plays > 0)) {
    return 'Análisis demo incluido: Last.fm es la línea temporal verificada principal; los valores de Spotify son estimaciones del informe salvo que se suba una exportación fresca de Spotify.';
  }
  if (source.source_type === 'lastfm') {
    return 'Carga solo de Last.fm: marcas de tiempo y scrobbles son directos; los datos de saltos y plataforma no están disponibles.';
  }
  return 'Fuente no identificada: esta vista usa los eventos importados disponibles y marca por separado los campos no disponibles.';
}

export function getCulturalSceneTags(lang: Lang) {
  return CULTURAL_SCENE_TAGS[lang];
}

export function localizeCountryName(country: string, lang: Lang) {
  if (lang === 'es') return COUNTRY_NAMES_ES[country] ?? country;
  if (lang === 'he') return COUNTRY_NAMES_HE[country] ?? country;
  return country;
}

export function localizeProjectLabel(project: string, lang: Lang) {
  if (lang === 'en') return project.replace('Datos Importados', 'Imported Data');
  if (lang === 'he') {
    return project
      .replace('Datos Importados', 'נתונים מיובאים')
      .replace('Imported Data', 'נתונים מיובאים');
  }
  return project.replace('Imported Data', 'Datos Importados');
}

/** Localizes only synthetic genre buckets while preserving real genre names. */
export function localizeGenreName(genre: string, lang: Lang) {
  return GENERIC_GENRE_LABELS[genre]?.[lang] ?? genre;
}

/** Localizes descriptive platform families while preserving product brands. */
export function localizePlatformName(platform: string, lang: Lang) {
  return PLATFORM_FAMILY_LABELS[platform]?.[lang] ?? platform;
}

export function localizeTraitAxis(key: PersonalityKey, lang: Lang) {
  return TRAIT_AXIS_LABELS[key]?.[lang] ?? String(key);
}
