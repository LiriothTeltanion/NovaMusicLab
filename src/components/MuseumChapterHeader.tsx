import React, { useId } from 'react';

import type { MusicDnaData } from '../types';
import { getArtistOriginGeography } from '../utils/analytics';
import { localizeCountryName, localizeGenreName } from '../utils/localizedDatasetText';
import { directionFor, localeFor, pickLanguage, type Lang } from '../utils/i18n';
import {
  MUSEUM_CHAPTER_TABS,
  museumVisualFor,
  type MuseumChapterMotif,
  type MuseumChapterTab,
} from './museumVisualIdentity';
import './MuseumChapterHeader.css';

export type { MuseumChapterTab } from './museumVisualIdentity';
export { MUSEUM_CHAPTER_TABS } from './museumVisualIdentity';

type MetricKind =
  | 'plays'
  | 'artists'
  | 'tracks'
  | 'albums'
  | 'hours'
  | 'activeDays'
  | 'years'
  | 'peakYear'
  | 'topArtist'
  | 'topArtistPlays'
  | 'topGenre'
  | 'countries'
  | 'topCountry'
  | 'obsessions'
  | 'streak'
  | 'maxDay'
  | 'matchRate'
  | 'sessions'
  | 'sources'
  | 'platforms';

type LocalizedText = Record<Lang, string>;

interface ChapterDefinition {
  number: string;
  emoji: string;
  eyebrow: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  metrics: readonly [MetricKind, MetricKind];
}

interface MuseumChapterHeaderProps {
  activeTab: string;
  data: MusicDnaData;
  lang: Lang;
}

interface ChapterMetric {
  label: string;
  value: string;
}

const CHAPTERS: Record<MuseumChapterTab, ChapterDefinition> = {
  dashboard: {
    number: '01', emoji: '🧭', metrics: ['plays', 'artists'],
    eyebrow: { es: 'Panorama maestro', en: 'Master overview', he: 'סקירת־על' },
    title: { es: 'Sala de Control', en: 'The Control Room', he: 'חדר הבקרה' },
    description: { es: 'Tu archivo completo se ordena como una exposición viva.', en: 'Your complete archive, arranged as a living exhibition.', he: 'הארכיון המלא שלך מסודר כתערוכה חיה.' },
  },
  aiassistant: {
    number: '02', emoji: '🔮', metrics: ['artists', 'tracks'],
    eyebrow: { es: 'Inteligencia curatorial', en: 'Curatorial intelligence', he: 'אוצרות חכמה' },
    title: { es: 'Oráculo de Escucha', en: 'The Listening Oracle', he: 'אורקל ההאזנה' },
    description: { es: 'Conversaciones guiadas por las huellas reales de tu colección.', en: 'Conversations guided by the real traces inside your collection.', he: 'שיחות המונחות בידי העקבות האמיתיים שבאוסף שלך.' },
  },
  eras: {
    number: '03', emoji: '⏳', metrics: ['years', 'peakYear'],
    eyebrow: { es: 'Cronología personal', en: 'Personal chronology', he: 'כרונולוגיה אישית' },
    title: { es: 'Archivo de Eras', en: 'The Era Archive', he: 'ארכיון התקופות' },
    description: { es: 'Cada año conserva un clima, un protagonista y una transformación.', en: 'Every year preserves a mood, a protagonist and a transformation.', he: 'כל שנה משמרת אווירה, דמות מובילה ושינוי.' },
  },
  top: {
    number: '04', emoji: '🏆', metrics: ['topArtist', 'topArtistPlays'],
    eyebrow: { es: 'Colección permanente', en: 'Permanent collection', he: 'אוסף קבוע' },
    title: { es: 'Panteón Sonoro', en: 'The Sonic Pantheon', he: 'היכל הצלילים' },
    description: { es: 'Los nombres y canciones que ganaron un lugar permanente.', en: 'The names and songs that earned a permanent place.', he: 'השמות והשירים שזכו במקום קבוע.' },
  },
  timecapsule: {
    number: '05', emoji: '🕰️', metrics: ['years', 'hours'],
    eyebrow: { es: 'Memoria en movimiento', en: 'Memory in motion', he: 'זיכרון בתנועה' },
    title: { es: 'Cámara del Tiempo', en: 'The Time Chamber', he: 'חדר הזמן' },
    description: { es: 'Momentos distantes vuelven a sonar dentro de una sola línea vital.', en: 'Distant moments sound again along one continuous life line.', he: 'רגעים רחוקים נשמעים מחדש לאורך קו חיים אחד רציף.' },
  },
  personality: {
    number: '06', emoji: '🧠', metrics: ['topGenre', 'artists'],
    eyebrow: { es: 'Espejo conductual', en: 'Behavioral mirror', he: 'מראה התנהגותית' },
    title: { es: 'Espejo de Personalidad', en: 'The Personality Mirror', he: 'מראת האישיות' },
    description: { es: 'Tus patrones musicales se convierten en rasgos, tensiones y fortalezas.', en: 'Your musical patterns become traits, tensions and strengths.', he: 'הדפוסים המוזיקליים שלך הופכים לתכונות, מתחים וחוזקות.' },
  },
  emotions: {
    number: '07', emoji: '💗', metrics: ['topGenre', 'hours'],
    eyebrow: { es: 'Frecuencia afectiva', en: 'Emotional frequency', he: 'תדר רגשי' },
    title: { es: 'Galería Emocional', en: 'The Emotional Gallery', he: 'הגלריה הרגשית' },
    description: { es: 'La intensidad de tu escucha dibuja un paisaje de energía y refugio.', en: 'The intensity of your listening draws a landscape of energy and refuge.', he: 'עוצמת ההאזנה שלך מציירת נוף של אנרגיה ומפלט.' },
  },
  cultural: {
    number: '08', emoji: '🌍', metrics: ['countries', 'topCountry'],
    eyebrow: { es: 'Geografía de artistas', en: 'Artist geography', he: 'הגאוגרפיה של האמנים' },
    title: { es: 'Atlas de Orígenes', en: 'The Atlas of Origins', he: 'אטלס המקורות' },
    description: { es: 'Un mapa de los lugares que alimentan tu universo musical.', en: 'A map of the places that feed your musical universe.', he: 'מפה של המקומות שמזינים את היקום המוזיקלי שלך.' },
  },
  inner: {
    number: '09', emoji: '🎨', metrics: ['hours', 'activeDays'],
    eyebrow: { es: 'Paisaje simbólico', en: 'Symbolic landscape', he: 'נוף סמלי' },
    title: { es: 'Paisaje Interior', en: 'The Inner Landscape', he: 'הנוף הפנימי' },
    description: { es: 'Color, arquetipos y atmósfera revelan la forma de tu mundo íntimo.', en: 'Color, archetypes and atmosphere reveal the shape of your inner world.', he: 'צבע, ארכיטיפים ואווירה חושפים את צורת עולמך הפנימי.' },
  },
  artist: {
    number: '10', emoji: '✨', metrics: ['topArtist', 'topGenre'],
    eyebrow: { es: 'Alter ego creativo', en: 'Creative alter ego', he: 'אלטר־אגו יצירתי' },
    title: { es: 'Identidad de Artista', en: 'The Artist Identity', he: 'זהות האמן' },
    description: { es: 'Tu historial imagina una voz, una estética y un escenario propios.', en: 'Your history imagines a voice, an aesthetic and a stage of your own.', he: 'ההיסטוריה שלך מדמיינת קול, אסתטיקה ובמה משלך.' },
  },
  obsessions: {
    number: '11', emoji: '🔁', metrics: ['obsessions', 'streak'],
    eyebrow: { es: 'Gravedad repetitiva', en: 'Repeat gravity', he: 'כוח המשיכה של החזרות' },
    title: { es: 'Bucle de Obsesiones', en: 'The Obsession Loop', he: 'לולאת האובססיות' },
    description: { es: 'Las repeticiones dejan de ser números y se vuelven rituales.', en: 'Repeats stop being numbers and become rituals.', he: 'החזרות מפסיקות להיות מספרים והופכות לטקסים.' },
  },
  insights: {
    number: '12', emoji: '🕵️', metrics: ['matchRate', 'tracks'],
    eyebrow: { es: 'Señales bajo la superficie', en: 'Signals beneath the surface', he: 'אותות מתחת לפני השטח' },
    title: { es: 'Cámara Oculta', en: 'The Hidden Chamber', he: 'החדר הנסתר' },
    description: { es: 'Anomalías y conexiones inesperadas emergen del archivo.', en: 'Anomalies and unexpected connections emerge from the archive.', he: 'חריגות וקשרים בלתי צפויים עולים מן הארכיון.' },
  },
  achievements: {
    number: '13', emoji: '🥇', metrics: ['streak', 'maxDay'],
    eyebrow: { es: 'Hitos de escucha', en: 'Listening milestones', he: 'אבני דרך בהאזנה' },
    title: { es: 'Salón de Logros', en: 'The Hall of Achievements', he: 'היכל ההישגים' },
    description: { es: 'Tus extremos, constancia y récords reciben su propia vitrina.', en: 'Your extremes, consistency and records receive their own display case.', he: 'השיאים, ההתמדה והרשומות שלך מקבלים ויטרינה משלהם.' },
  },
  wrapped: {
    number: '14', emoji: '🎁', metrics: ['plays', 'peakYear'],
    eyebrow: { es: 'Celebración condensada', en: 'Condensed celebration', he: 'חגיגה מרוכזת' },
    title: { es: 'Ritual Wrapped', en: 'The Wrapped Ritual', he: 'טקס ה־Wrapped' },
    description: { es: 'Una síntesis brillante de lo que más definió tu recorrido.', en: 'A vivid synthesis of what defined your journey most.', he: 'סינתזה זוהרת של הדברים שהגדירו יותר מכול את המסע שלך.' },
  },
  pulse: {
    number: '15', emoji: '📡', metrics: ['maxDay', 'activeDays'],
    eyebrow: { es: 'Señal en presente', en: 'Present-tense signal', he: 'אות בזמן הווה' },
    title: { es: 'Pulso Reciente', en: 'The Recent Pulse', he: 'הדופק האחרון' },
    description: { es: 'La actividad más cercana revela hacia dónde se mueve tu gusto.', en: 'Your nearest activity reveals where your taste is moving.', he: 'הפעילות העדכנית ביותר חושפת לאן הטעם שלך מתקדם.' },
  },
  compare: {
    number: '16', emoji: '⚖️', metrics: ['sources', 'plays'],
    eyebrow: { es: 'Fuentes en diálogo', en: 'Sources in dialogue', he: 'מקורות בדיאלוג' },
    title: { es: 'Sala de Contrastes', en: 'The Contrast Room', he: 'חדר הניגודים' },
    description: { es: 'Plataformas distintas cuentan versiones complementarias de la misma historia.', en: 'Different platforms tell complementary versions of the same story.', he: 'פלטפורמות שונות מספרות גרסאות משלימות של אותו סיפור.' },
  },
  museums: {
    number: '17', emoji: '🪞', metrics: ['artists', 'albums'],
    eyebrow: { es: 'Colecciones paralelas', en: 'Parallel collections', he: 'אוספים מקבילים' },
    title: { es: 'Museos Paralelos', en: 'Parallel Museums', he: 'מוזיאונים מקבילים' },
    description: { es: 'Dos archivos se encuentran para mostrar coincidencias y singularidades.', en: 'Two archives meet to reveal overlaps and singularities.', he: 'שני ארכיונים נפגשים כדי לחשוף חפיפות וייחודיות.' },
  },
  platforms: {
    number: '18', emoji: '🎛️', metrics: ['platforms', 'sources'],
    eyebrow: { es: 'Infraestructura de escucha', en: 'Listening infrastructure', he: 'תשתית ההאזנה' },
    title: { es: 'Mesa de Dispositivos', en: 'The Device Console', he: 'קונסולת המכשירים' },
    description: { es: 'Contextos, plataformas y formatos trazan cómo llega la música a ti.', en: 'Contexts, platforms and formats trace how music reaches you.', he: 'הקשרים, פלטפורמות ופורמטים משרטטים כיצד המוזיקה מגיעה אליך.' },
  },
  quality: {
    number: '19', emoji: '🛡️', metrics: ['matchRate', 'tracks'],
    eyebrow: { es: 'Transparencia del archivo', en: 'Archive transparency', he: 'שקיפות הארכיון' },
    title: { es: 'Laboratorio de Evidencia', en: 'The Evidence Lab', he: 'מעבדת הראיות' },
    description: { es: 'Cobertura, límites y confianza permanecen visibles junto a los hallazgos.', en: 'Coverage, limits and confidence remain visible beside every finding.', he: 'הכיסוי, המגבלות ורמת הביטחון נשארים גלויים לצד כל ממצא.' },
  },
  statsdeep: {
    number: '20', emoji: '📊', metrics: ['activeDays', 'sessions'],
    eyebrow: { es: 'Observación de alta resolución', en: 'High-resolution observation', he: 'תצפית ברזולוציה גבוהה' },
    title: { es: 'Observatorio Estadístico', en: 'The Statistics Observatory', he: 'המצפה הסטטיסטי' },
    description: { es: 'Ritmos, densidad y evolución se estudian con el máximo detalle.', en: 'Rhythm, density and evolution are studied at maximum detail.', he: 'קצב, צפיפות והתפתחות נבחנים ברמת הפירוט המרבית.' },
  },
  report: {
    number: '21', emoji: '📜', metrics: ['plays', 'hours'],
    eyebrow: { es: 'Conclusión curatorial', en: 'Curatorial conclusion', he: 'סיכום אוצרותי' },
    title: { es: 'Archivo Final', en: 'The Final Archive', he: 'הארכיון הסופי' },
    description: { es: 'La exposición termina en un retrato completo, listo para conservar.', en: 'The exhibition closes with a complete portrait, ready to preserve.', he: 'התערוכה נחתמת בדיוקן שלם, מוכן לשימור.' },
  },
};

function formatNumber(value: number, lang: Lang) {
  return new Intl.NumberFormat(localeFor(lang), { maximumFractionDigits: 0 }).format(value);
}

function getMetric(kind: MetricKind, data: MusicDnaData, lang: Lang): ChapterMetric {
  const core = data.core_metrics;
  const eras = data.yearly_eras ?? [];
  const observedEras = eras.filter(era => era.plays > 0 && Number.isFinite(era.year));
  const years = observedEras.map(era => era.year);
  const minYear = years.length > 0 ? Math.min(...years) : null;
  const maxYear = years.length > 0 ? Math.max(...years) : null;
  const peakEra = [...observedEras].sort((a, b) => b.plays - a.plays)[0];
  const topArtist = data.top_artists?.[0];
  const sourceSummary = data.source_summary;
  const sourceCount = sourceSummary
    ? [sourceSummary.lastfm_plays, sourceSummary.spotify_plays, sourceSummary.youtube_plays, sourceSummary.apple_music_plays, sourceSummary.listenbrainz_plays]
      .filter(value => value > 0).length
    : 0;
  const platformCount = new Set((data.platform_breakdown ?? []).filter(item => item.plays > 0).map(item => item.platform)).size;

  const numeric = (value: number) => formatNumber(value, lang);
  const label = (values: Record<Lang, string>) => pickLanguage(lang, values);
  const unavailable = label({ es: 'No disponible', en: 'Unavailable', he: 'לא זמין' });

  switch (kind) {
    case 'plays': return { label: label({ es: 'reproducciones', en: 'total plays', he: 'סך ההשמעות' }), value: numeric(core.total_plays) };
    case 'artists': return { label: label({ es: 'artistas únicos', en: 'unique artists', he: 'אמנים ייחודיים' }), value: numeric(core.unique_artists) };
    case 'tracks': return { label: label({ es: 'canciones únicas', en: 'unique tracks', he: 'שירים ייחודיים' }), value: numeric(core.unique_tracks) };
    case 'albums': return { label: label({ es: 'álbumes únicos', en: 'unique albums', he: 'אלבומים ייחודיים' }), value: numeric(core.unique_albums) };
    case 'hours': return { label: label({ es: 'horas de escucha', en: 'listening hours', he: 'שעות האזנה' }), value: numeric(core.listening_hours) };
    case 'activeDays': return { label: label({ es: 'días activos', en: 'active days', he: 'ימי פעילות' }), value: numeric(core.active_days) };
    case 'years': return {
      label: label({ es: 'arco temporal', en: 'time span', he: 'טווח הזמן' }),
      value: minYear === null || maxYear === null
        ? unavailable
        : minYear === maxYear ? String(maxYear) : `${minYear}—${maxYear}`,
    };
    case 'peakYear': return {
      label: label({
        es: 'año observado con más reproducciones',
        en: 'highest-volume observed year',
        he: 'השנה הנצפית עם מספר ההשמעות הגבוה ביותר',
      }),
      value: peakEra ? String(peakEra.year) : unavailable,
    };
    case 'topArtist': return { label: label({ es: 'obra central', en: 'central artist', he: 'האמן המרכזי' }), value: topArtist?.name ?? '—' };
    case 'topArtistPlays': return { label: label({ es: 'plays del artista #1', en: '#1 artist plays', he: 'השמעות של האמן במקום הראשון' }), value: numeric(topArtist?.plays ?? 0) };
    case 'topGenre': {
      const genre = data.top_genres?.[0]?.name ?? topArtist?.genre ?? '—';
      return {
        label: label({ es: 'lenguaje dominante', en: 'dominant language', he: 'השפה הדומיננטית' }),
        value: localizeGenreName(genre, lang),
      };
    }
    case 'countries': {
      const originGeography = getArtistOriginGeography(data);
      return { label: label({ es: 'países con origen resuelto', en: 'resolved origin countries', he: 'מדינות שמקור האמנים בהן זוהה' }), value: numeric(originGeography.countries.length) };
    }
    case 'topCountry': {
      const originGeography = getArtistOriginGeography(data);
      const country = originGeography.countries[0]?.country;
      return {
        label: label({ es: 'origen principal', en: 'leading origin', he: 'המקור המוביל' }),
        value: country ? localizeCountryName(country, lang) : '—',
      };
    }
    case 'obsessions': return { label: label({ es: 'obsesiones detectadas', en: 'detected obsessions', he: 'אובססיות שזוהו' }), value: numeric(data.obsessions?.length ?? 0) };
    case 'streak': return { label: label({ es: 'días de racha máxima', en: 'longest streak days', he: 'ימים ברצף הארוך ביותר' }), value: numeric(data.records?.longest_streak_days ?? 0) };
    case 'maxDay': return { label: label({ es: 'plays en el día récord', en: 'plays on the record day', he: 'השמעות ביום השיא' }), value: numeric(data.records?.max_day_plays ?? 0) };
    case 'matchRate': return {
      label: label({ es: 'cobertura de coincidencias', en: 'match coverage', he: 'כיסוי ההתאמות' }),
      value: `${core.match_rate_pct.toLocaleString(localeFor(lang), { maximumFractionDigits: 1 })}%`,
    };
    case 'sessions': return { label: label({ es: 'sesiones analizadas', en: 'analyzed sessions', he: 'סשנים שנותחו' }), value: numeric(data.sessions?.length ?? 0) };
    case 'sources': return { label: label({ es: 'fuentes con actividad', en: 'active sources', he: 'מקורות פעילים' }), value: numeric(sourceCount) };
    case 'platforms': return { label: label({ es: 'plataformas detectadas', en: 'detected platforms', he: 'פלטפורמות שזוהו' }), value: numeric(platformCount) };
  }
}

function MotifGeometry({ motif }: { motif: MuseumChapterMotif }) {
  switch (motif) {
    case 'atlas': return (
      <>
        {[0, 1, 2].map(row => [0, 1, 2, 3].map(column => (
          <rect key={`${row}-${column}`} className="museum-chapter__shape" x={52 + column * 58} y={34 + row * 50} width="38" height="28" rx="8" />
        )))}
        <path className="museum-chapter__line museum-chapter__line--secondary" d="M72 148C138 104 190 154 256 64" />
        <circle className="museum-chapter__node" cx="256" cy="64" r="8" />
      </>
    );
    case 'neural': return (
      <>
        <path className="museum-chapter__line museum-chapter__dash" d="M48 122L104 58l58 80 52-92 70 66" />
        <path className="museum-chapter__line museum-chapter__line--secondary" d="M104 58l110-12m-52 92 122-26M48 122l114 16" />
        {[[48, 122], [104, 58], [162, 138], [214, 46], [284, 112]].map(([cx, cy], index) => (
          <circle key={cx} className={index === 2 ? 'museum-chapter__node museum-chapter__pulse' : 'museum-chapter__node'} cx={cx} cy={cy} r={index === 2 ? 13 : 8} />
        ))}
      </>
    );
    case 'timeline': return (
      <>
        <path className="museum-chapter__line museum-chapter__dash" d="M34 112H306" />
        {[54, 108, 166, 226, 286].map((cx, index) => (
          <g key={cx} className={index === 3 ? 'museum-chapter__pulse' : undefined}>
            <circle className="museum-chapter__node" cx={cx} cy="112" r={index === 3 ? 13 : 7} />
            <path className="museum-chapter__line museum-chapter__line--secondary" d={`M${cx} 88V${index % 2 ? 62 : 72}`} />
          </g>
        ))}
      </>
    );
    case 'crown': return (
      <>
        <path className="museum-chapter__shape museum-chapter__float" d="M54 142L38 62l62 40 66-68 64 68 66-40-18 80z" />
        <path className="museum-chapter__line museum-chapter__line--secondary" d="M54 142H278M84 166h164" />
        <circle className="museum-chapter__node museum-chapter__pulse" cx="166" cy="34" r="8" />
      </>
    );
    case 'hourglass': return (
      <>
        <path className="museum-chapter__line" d="M104 34h124M104 174h124M116 36c0 48 48 54 48 68s-48 24-48 68m100-136c0 48-48 54-48 68s48 24 48 68" />
        <path className="museum-chapter__shape museum-chapter__pulse" d="M140 76h52l-26 29z" />
        <path className="museum-chapter__line museum-chapter__line--secondary museum-chapter__dash" d="M166 106v35" />
      </>
    );
    case 'orbit': return (
      <>
        <g className="museum-chapter__spin">
          <ellipse className="museum-chapter__line" cx="166" cy="106" rx="122" ry="54" transform="rotate(-18 166 106)" />
          <circle className="museum-chapter__node" cx="282" cy="79" r="9" />
        </g>
        <ellipse className="museum-chapter__line museum-chapter__line--secondary" cx="166" cy="106" rx="52" ry="92" transform="rotate(28 166 106)" />
        <circle className="museum-chapter__node museum-chapter__pulse" cx="166" cy="106" r="18" />
      </>
    );
    case 'wave': return (
      <>
        {[0, 1, 2, 3].map(index => (
          <path key={index} className={`museum-chapter__line ${index % 2 ? 'museum-chapter__line--secondary' : ''} museum-chapter__dash`} d={`M34 ${72 + index * 24}C82 ${28 + index * 30} 126 ${162 - index * 8} 174 ${92 + index * 12}S258 ${54 + index * 28} 306 ${92 + index * 12}`} />
        ))}
      </>
    );
    case 'globe': return (
      <>
        <g className="museum-chapter__float">
          <circle className="museum-chapter__line" cx="166" cy="106" r="82" />
          <ellipse className="museum-chapter__line museum-chapter__line--secondary" cx="166" cy="106" rx="35" ry="82" />
          <path className="museum-chapter__line museum-chapter__line--secondary" d="M85 106h162M102 65c38 18 90 18 128 0m-128 82c38-18 90-18 128 0" />
        </g>
        <circle className="museum-chapter__node museum-chapter__pulse" cx="218" cy="70" r="8" />
      </>
    );
    case 'prism': return (
      <>
        <path className="museum-chapter__shape museum-chapter__float" d="M146 36l70 132H76z" />
        <path className="museum-chapter__line" d="M34 104h108m75 0h90" />
        {[0, 1, 2, 3].map(index => <path key={index} className="museum-chapter__line museum-chapter__line--secondary" d={`M216 104l92 ${-46 + index * 31}`} />)}
      </>
    );
    case 'star': return (
      <>
        <path className="museum-chapter__shape museum-chapter__pulse" d="M166 30l18 52 55 1-44 33 16 53-45-31-45 31 16-53-44-33 55-1z" />
        <g className="museum-chapter__spin"><ellipse className="museum-chapter__line museum-chapter__line--secondary" cx="166" cy="104" rx="126" ry="58" transform="rotate(12 166 104)" /><circle className="museum-chapter__node" cx="287" cy="119" r="7" /></g>
      </>
    );
    case 'spiral': return <path className="museum-chapter__line museum-chapter__dash" d="M288 102c0 68-80 96-142 68-68-30-76-112-20-148 48-32 120-4 122 50 2 44-52 70-86 42-26-22-12-64 20-68 24-4 44 20 32 40-8 14-30 12-34-2" />;
    case 'anomaly': return (
      <>
        <path className="museum-chapter__line museum-chapter__dash" d="M32 122h68l16-18 18 20 22-80 24 124 22-68 18 22h88" />
        <rect className="museum-chapter__line museum-chapter__line--secondary museum-chapter__float" x="142" y="28" width="72" height="156" rx="18" />
        <circle className="museum-chapter__node museum-chapter__pulse" cx="156" cy="44" r="7" />
      </>
    );
    case 'medal': return (
      <>
        <path className="museum-chapter__shape" d="M112 28h42l12 58-52 22zM220 28h-42l-12 58 52 22z" />
        <circle className="museum-chapter__line museum-chapter__pulse" cx="166" cy="126" r="58" />
        <path className="museum-chapter__line museum-chapter__line--secondary" d="M166 96l10 21 23 3-17 16 4 23-20-11-20 11 4-23-17-16 23-3z" />
      </>
    );
    case 'burst': return (
      <>
        <g className="museum-chapter__spin">{Array.from({ length: 12 }, (_, index) => <path key={index} className="museum-chapter__line" d="M166 30v34" transform={`rotate(${index * 30} 166 106)`} />)}</g>
        <circle className="museum-chapter__shape museum-chapter__pulse" cx="166" cy="106" r="38" />
        <circle className="museum-chapter__line museum-chapter__line--secondary" cx="166" cy="106" r="70" />
      </>
    );
    case 'signal': return (
      <>
        {[0, 1, 2].map(index => <path key={index} className={`museum-chapter__line ${index ? 'museum-chapter__line--secondary' : ''} museum-chapter__dash`} d={`M${110 - index * 26} ${142 + index * 20}a${76 + index * 26} ${76 + index * 26} 0 0 1 ${112 + index * 52} 0`} />)}
        <path className="museum-chapter__line" d="M166 104v74" />
        <circle className="museum-chapter__node museum-chapter__pulse" cx="166" cy="98" r="12" />
      </>
    );
    case 'bridge': return (
      <>
        <circle className="museum-chapter__line" cx="78" cy="108" r="42" />
        <circle className="museum-chapter__line museum-chapter__line--secondary" cx="254" cy="108" r="42" />
        <path className="museum-chapter__line museum-chapter__dash" d="M118 108c30-60 66-60 96 0m-96 0c30 60 66 60 96 0" />
        <circle className="museum-chapter__node museum-chapter__pulse" cx="166" cy="61" r="8" />
      </>
    );
    case 'constellation': return (
      <>
        <path className="museum-chapter__line museum-chapter__line--secondary museum-chapter__dash" d="M46 136L98 56l74 62 52-76 64 94-116-18-74 46z" />
        {[[46, 136], [98, 56], [172, 118], [224, 42], [288, 136], [98, 164]].map(([cx, cy], index) => <circle key={cx + cy} className={index === 2 ? 'museum-chapter__node museum-chapter__pulse' : 'museum-chapter__node'} cx={cx} cy={cy} r={index === 2 ? 11 : 7} />)}
      </>
    );
    case 'devices': return (
      <>
        <rect className="museum-chapter__line" x="50" y="48" width="170" height="108" rx="14" />
        <path className="museum-chapter__line museum-chapter__line--secondary" d="M110 180h50m-25-24v24" />
        <rect className="museum-chapter__shape museum-chapter__float" x="214" y="76" width="68" height="112" rx="16" />
        <circle className="museum-chapter__node museum-chapter__pulse" cx="248" cy="170" r="6" />
      </>
    );
    case 'shield': return (
      <>
        <path className="museum-chapter__shape museum-chapter__float" d="M166 26l94 34v56c0 46-38 72-94 92-56-20-94-46-94-92V60z" />
        <path className="museum-chapter__line museum-chapter__pulse" d="M116 112l32 31 69-72" />
      </>
    );
    case 'spectrum': return (
      <>
        {[0, 1, 2, 3, 4, 5, 6].map(index => <rect key={index} className={index % 2 ? 'museum-chapter__shape museum-chapter__shape--secondary' : 'museum-chapter__shape'} x={42 + index * 38} y={164 - (index % 4 + 1) * 27} width="22" height={(index % 4 + 1) * 27} rx="7" />)}
        <path className="museum-chapter__line museum-chapter__dash" d="M38 94l58-30 48 44 48-68 52 46 54-32" />
      </>
    );
    case 'archive': return (
      <>
        <path className="museum-chapter__shape" d="M70 48h176l28 28v106H70z" />
        <path className="museum-chapter__line" d="M246 48v30h28M104 96h128M104 124h96M104 152h114" />
        <path className="museum-chapter__line museum-chapter__line--secondary museum-chapter__dash" d="M50 68v134h204" />
        <circle className="museum-chapter__node museum-chapter__pulse" cx="274" cy="182" r="8" />
      </>
    );
  }
}

function ChapterArtwork({ motif }: { motif: MuseumChapterMotif }) {
  return (
    <div className="museum-chapter__art" aria-hidden="true">
      <span className="museum-chapter__halo museum-chapter__halo--one" />
      <span className="museum-chapter__halo museum-chapter__halo--two" />
      <svg viewBox="0 0 332 212" focusable="false">
        <MotifGeometry motif={motif} />
      </svg>
      <span className="museum-chapter__art-caption">NOVA / {motif.toUpperCase()}</span>
    </div>
  );
}

export default function MuseumChapterHeader({ activeTab, data, lang }: MuseumChapterHeaderProps) {
  const definition = CHAPTERS[activeTab as MuseumChapterTab];
  const visualIdentity = museumVisualFor(activeTab);
  const reactId = useId();

  if (!definition) return null;

  const copy = (key: 'eyebrow' | 'title' | 'description') => definition[key][lang];
  const primaryMetric = getMetric(definition.metrics[0], data, lang);
  const secondaryMetric = getMetric(definition.metrics[1], data, lang);
  const topShare = Math.min(0.3, Math.max(0.02, (data.top_artists?.[0]?.plays ?? 0) / Math.max(data.core_metrics.total_plays, 1)));
  const archiveDensity = Math.min(0.9, Math.max(0.18, data.core_metrics.unique_artists / Math.max(data.core_metrics.unique_tracks, 1)));
  const tempoSeconds = Math.max(9, 17 - topShare * 24);
  const headingId = `museum-chapter-${reactId.replace(/:/g, '')}`;
  const style = {
    '--chapter-primary': visualIdentity.palette[0],
    '--chapter-secondary': visualIdentity.palette[1],
    '--chapter-tertiary': visualIdentity.palette[2],
    '--chapter-grid-opacity': 0.2 + archiveDensity * 0.34,
    '--chapter-scan-opacity': 0.08 + topShare * 0.4,
    '--chapter-halo-opacity': 0.16 + topShare * 0.6,
    '--chapter-beam-tempo': `${tempoSeconds.toFixed(1)}s`,
    '--chapter-scan-tempo': `${(tempoSeconds * 1.3).toFixed(1)}s`,
    '--chapter-ring-tempo': `${(tempoSeconds * 1.4).toFixed(1)}s`,
    '--chapter-dash-tempo': `${(tempoSeconds * 0.75).toFixed(1)}s`,
    '--chapter-spin-tempo': `${(tempoSeconds * 1.8).toFixed(1)}s`,
    '--chapter-float-tempo': `${(tempoSeconds * 0.55).toFixed(1)}s`,
    '--chapter-pulse-tempo': `${(tempoSeconds * 0.32).toFixed(1)}s`,
  } as React.CSSProperties & Record<`--${string}`, string | number>;

  return (
    <section
      className="museum-chapter"
      style={style}
      aria-labelledby={headingId}
      data-testid="museum-chapter"
      data-chapter={activeTab}
      data-family={visualIdentity.family}
      data-motif={visualIdentity.chapterMotif}
      data-density="compact"
      dir={directionFor(lang)}
    >
      <div className="museum-chapter__ambient" aria-hidden="true">
        <span className="museum-chapter__beam" />
        <span className="museum-chapter__scan" />
      </div>

      <div className="museum-chapter__content">
        <div className="museum-chapter__copy">
          <p className="museum-chapter__eyebrow">
            <span className="museum-chapter__emoji" aria-hidden="true">{definition.emoji}</span>
            <span>{pickLanguage(lang, { es: 'Capítulo', en: 'Chapter', he: 'פרק' })} {definition.number}</span>
            <span className="museum-chapter__eyebrow-separator" aria-hidden="true">/</span>
            <span>{copy('eyebrow')}</span>
          </p>

          <h1 id={headingId}>{copy('title')}</h1>
          <p className="museum-chapter__description">{copy('description')}</p>
        </div>

        <dl
          className="museum-chapter__metrics"
          aria-label={pickLanguage(lang, { es: 'Señales del archivo', en: 'Archive signals', he: 'אותות מהארכיון' })}
        >
          {[primaryMetric, secondaryMetric].map(metric => (
            <div className="museum-chapter__metric" key={`${metric.label}-${metric.value}`}>
              <dt>{metric.label}</dt>
              <dd title={metric.value}>{metric.value}</dd>
            </div>
          ))}
        </dl>

        <ChapterArtwork motif={visualIdentity.chapterMotif} />
      </div>

      <div className="museum-chapter__footer" aria-hidden="true">
        <span>NOVA MUSIC LAB</span>
        <span className="museum-chapter__footer-line" />
        <span>{definition.number} / {MUSEUM_CHAPTER_TABS.length}</span>
      </div>
    </section>
  );
}
