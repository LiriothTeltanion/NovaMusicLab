import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Gauge,
  Radio,
  Sparkles,
  SunMedium,
  Waves,
} from 'lucide-react';
import type { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import ArtistAvatar from './ArtistAvatar';
import CoverArt from './CoverArt';
import SectionNarrative from './SectionNarrative';
import { SWAP_TRANSITION } from './chartKit';
import { localizeDaypart, localizeEraLabel } from '../utils/localeText';
import { localizeEraDescription } from '../utils/localizedDatasetText';
import { directionFor, localeFor, pickLanguage, type Lang } from '../utils/i18n';
import {
  deriveEraVisualIdentity,
  type EraMotif,
  type EraVisualIdentity,
} from '../utils/eraVisualIdentity';

interface EraExplorerProps {
  data: MusicDnaData;
  isPersonalArchive?: boolean;
}

const ERA_INTERPRETATIONS: Record<Lang, Record<number, string>> = {
  es: {
    2015: 'Los cimientos: synthwave oscuro y metal técnico como primer lenguaje musical propio. Carpenter Brut abrió un portal hacia una estética cyberpunk que nunca abandonarías.',
    2016: 'Un año de melodías pegajosas y glam. H.E.A.T y Tokio Hotel representan la búsqueda de conexión emocional a través de canciones brillantes y melancólicas.',
    2017: 'El misterio domina. Ghost y The Midnight construyen un año de rock cinematográfico donde la atmósfera cuenta más que el riff.',
    2018: 'Integración cultural y hard rock. El rock israelí local convive con la energía glam de Santa Cruz. Tu racha más larga: 68 días consecutivos empieza aquí.',
    2019: 'Post-hardcore vulnerable. The Word Alive y Emarosa traen voces que sangran. Un año de catarsis emocional profunda.',
    2020: 'Pandemia + caos musical. Bring Me the Horizon y Bilmuri mezclan metal con pop en bucles intensos. La diversidad baja: escuchas lo que te ancla.',
    2021: 'El año cumbre. Post-hardcore y Blackgaze se cruzan en guitarras que brillan como heridas sanadas. Un capítulo de máxima intensidad.',
    2022: 'La era Deafheaven se consolida. Las mañanas se vuelven el momento de mayor intensidad musical y la melancolía funciona como impulso.',
    2023: 'Reinvención: pop-punk digital, energía renovada y sonidos más modernos. La exploración regresa y abre una nueva arquitectura emocional.',
    2024: 'Intimidad y groove. Bilmuri guía un año de madurez reconstructiva: menos volumen, más profundidad y una fijación más concentrada.',
    2025: 'Emo rap e introspección. Una búsqueda lírica intensa marca la recuperación y la reconstrucción artística del capítulo.',
    2026: 'Energía fresca. The Kid LAROI y la nueva generación de rap-pop alternativo marcan el presente y el futuro de tu universo sonoro.',
  },
  en: {
    2015: 'The foundations: dark synthwave and technical metal as the first personal musical language. Carpenter Brut opened a portal toward a cyberpunk aesthetic you would never leave.',
    2016: 'A year of catchy melodies and glam. H.E.A.T and Tokio Hotel represent the search for emotional connection through bright and melancholic songs.',
    2017: 'Mystery dominates. Ghost and The Midnight build a year of cinematic rock where atmosphere matters more than the riff.',
    2018: 'Cultural integration and hard rock. Local Israeli rock coexists with the glam energy of Santa Cruz. Your longest streak begins here.',
    2019: 'Vulnerable post-hardcore. The Word Alive and Emarosa bring bleeding voices. A year of deep emotional catharsis.',
    2020: 'Pandemic plus musical chaos. Bring Me the Horizon and Bilmuri blend metal with pop in intense loops. Diversity drops: you listen to what anchors you.',
    2021: 'The peak chapter. Post-hardcore and Blackgaze meet in guitars that shine like healed wounds. A year of maximum archive intensity.',
    2022: 'The Deafheaven era solidifies. Mornings become the moment of greatest musical intensity and melancholy becomes momentum.',
    2023: 'Reinvention: digital pop-punk, renewed energy and more modern sounds. Exploration returns and opens a new emotional architecture.',
    2024: 'Intimacy and groove. Bilmuri guides a year of reconstructive maturity: less volume, more depth and tighter fixation.',
    2025: 'Emo rap and introspection. An intense lyrical search shapes a chapter of recovery and artistic reconstruction.',
    2026: 'Fresh energy. The Kid LAROI and a new generation of modern alt-pop mark the present and future of your sonic universe.',
  },
  he: {
    2015: 'היסודות: סינת׳ווייב אפל ומטאל טכני כשפה המוזיקלית האישית הראשונה שלך. Carpenter Brut פתח שער לאסתטיקת סייברפאנק שלא עזבת מאז.',
    2016: 'שנה של מלודיות קליטות וגלאם. H.E.A.T ו־Tokio Hotel מייצגים את החיפוש אחר חיבור רגשי דרך שירים זוהרים ומלנכוליים.',
    2017: 'המסתורין שולט. Ghost ו־The Midnight בונים שנה של רוק קולנועי, שבה האווירה חשובה יותר מהריף.',
    2018: 'שילוב תרבויות והארד רוק. רוק ישראלי מקומי חי לצד אנרגיית הגלאם של Santa Cruz. כאן מתחיל הרצף הארוך ביותר שלך: 68 ימים ברציפות.',
    2019: 'פוסט־הארדקור חשוף ופגיע. The Word Alive ו־Emarosa מביאים קולות מדממים. שנה של קתרזיס רגשי עמוק.',
    2020: 'מגפה וכאוס מוזיקלי. Bring Me the Horizon ו־Bilmuri מערבבים מטאל ופופ בלופים אינטנסיביים. המגוון מצטמצם: אתה חוזר למה שמייצב אותך.',
    2021: 'שנת השיא. פוסט־הארדקור ובלאקגייז נפגשים בגיטרות שזוהרות כמו פצעים שהחלימו. פרק בעוצמה מרבית.',
    2022: 'עידן Deafheaven מתבסס. הבקרים הופכים לזמן ההאזנה העוצמתי ביותר, והמלנכוליה נהפכת לכוח מניע.',
    2023: 'המצאה מחדש: פופ־פאנק דיגיטלי, אנרגיה מחודשת וצלילים עכשוויים יותר. הסקרנות חוזרת ופותחת מבנה רגשי חדש.',
    2024: 'אינטימיות וגרוב. Bilmuri מוביל שנה של בגרות משקמת: פחות עוצמה, יותר עומק ומיקוד הדוק יותר.',
    2025: 'אימו־ראפ והתבוננות פנימית. חיפוש לירי אינטנסיבי מעצב פרק של התאוששות ובנייה אמנותית מחדש.',
    2026: 'אנרגיה רעננה. The Kid LAROI ודור חדש של ראפ־פופ אלטרנטיבי מסמנים את ההווה ואת העתיד של היקום הצלילי שלך.',
  },
};

const VISUAL_COPY = {
  es: {
    poster: 'Póster de era personal',
    archive: 'Archivo musical personal',
    atmosphere: 'Atmósfera',
    pulse: 'Pulso del archivo',
    intensity: 'Intensidad anual',
    exploration: 'Exploración',
    fixation: 'Fijación',
    signal: 'Señal emocional de la era',
    signalNote: 'Derivado del volumen relativo, la diversidad y tu franja de escucha dominante. No representa BPM ni audio acústico.',
    artist: 'Artista del capítulo',
    track: 'Canción emblema',
    journey: 'Índice de capítulos',
    empty: 'Todavía no hay años suficientes para construir una identidad visual por eras.',
    selectEra: (year: number) => `Seleccionar era ${year}`,
    timeline: 'Selecciona un capítulo de la línea temporal',
    navigation: 'Navegación anual',
    previous: 'Anterior',
    next: 'Siguiente',
    previousAria: 'Era anterior',
    nextAria: 'Era siguiente',
    swipe: 'Desliza para viajar entre eras',
  },
  en: {
    poster: 'Personal era poster',
    archive: 'Personal music archive',
    atmosphere: 'Atmosphere',
    pulse: 'Archive pulse',
    intensity: 'Year intensity',
    exploration: 'Exploration',
    fixation: 'Fixation',
    signal: 'Era emotional signal',
    signalNote: 'Derived from relative volume, diversity and your dominant listening window. It does not represent BPM or acoustic audio.',
    artist: 'Chapter artist',
    track: 'Emblem track',
    journey: 'Chapter index',
    empty: 'There are not enough yearly chapters yet to build a visual era identity.',
    selectEra: (year: number) => `Select ${year} era`,
    timeline: 'Select a chapter from the timeline',
    navigation: 'Year navigation',
    previous: 'Previous',
    next: 'Next',
    previousAria: 'Previous era',
    nextAria: 'Next era',
    swipe: 'Swipe to travel across eras',
  },
  he: {
    poster: 'פוסטר התקופה האישי',
    archive: 'הארכיון המוזיקלי האישי',
    atmosphere: 'אווירה',
    pulse: 'דופק הארכיון',
    intensity: 'עוצמת השנה',
    exploration: 'חקר וגילוי',
    fixation: 'מיקוד חוזר',
    signal: 'האות הרגשי של התקופה',
    signalNote: 'נגזר מנפח ההאזנה היחסי, מהמגוון ומשעות ההאזנה הדומיננטיות שלך. אינו מייצג BPM או מאפיינים אקוסטיים.',
    artist: 'אמן הפרק',
    track: 'שיר הדגל',
    journey: 'מפת הפרקים',
    empty: 'עדיין אין מספיק שנים כדי לבנות זהות חזותית לכל תקופה.',
    selectEra: (year: number) => `בחירת התקופה של ${year}`,
    timeline: 'בחירת פרק מציר הזמן',
    navigation: 'ניווט בין שנים',
    previous: 'הקודמת',
    next: 'הבאה',
    previousAria: 'התקופה הקודמת',
    nextAria: 'התקופה הבאה',
    swipe: 'החלק כדי לעבור בין תקופות',
  },
};

function daypartEmoji(daypart: string) {
  const normalized = daypart.toLocaleLowerCase();
  if (normalized.includes('לפנות בוקר') || normalized.includes('madrugada') || normalized.includes('late night')) return '🌌';
  if (normalized.includes('mañana') || normalized.includes('morning') || normalized.includes('בוקר')) return '🌅';
  if (normalized.includes('tarde') || normalized.includes('afternoon') || normalized.includes('אחר הצהריים')) return '🌞';
  return '🌙';
}

function SignalBar({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-2.5 backdrop-blur-sm sm:rounded-2xl sm:p-3.5">
      <div className="mb-2 flex min-h-10 flex-col items-start justify-between gap-1 sm:min-h-0 sm:flex-row sm:items-center sm:gap-3">
        <span className="flex min-w-0 items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.1em] text-gray-300 sm:gap-2 sm:text-[10px] sm:tracking-[0.14em]">
          {icon}
          <span className="line-clamp-2 sm:truncate">{label}</span>
        </span>
        <span className="font-mono text-base font-black leading-none text-white sm:text-sm">{value}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="h-1.5 overflow-hidden rounded-full bg-white/10"
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 16px ${color}` }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.75, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function EraMotifArt({ identity, reducedMotion }: { identity: EraVisualIdentity; reducedMotion: boolean }) {
  const commonTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 28, repeat: Infinity, ease: 'linear' as const };

  const motifContent: Record<EraMotif, React.ReactNode> = {
    orbit: (
      <>
        <motion.g
          animate={reducedMotion ? undefined : { rotate: 360 }}
          transition={commonTransition}
          style={{ transformOrigin: '595px 180px' }}
        >
          {[68, 112, 164].map((radius, index) => (
            <circle
              key={radius}
              cx="595"
              cy="180"
              r={radius}
              fill="none"
              stroke={index % 2 ? identity.palette.secondary : identity.palette.primary}
              strokeOpacity={0.2 - index * 0.035}
              strokeWidth={index === 0 ? 2 : 1}
              strokeDasharray={index % 2 ? '8 13' : '3 9'}
            />
          ))}
          <circle cx="595" cy="68" r="7" fill={identity.palette.accent} fillOpacity="0.75" />
        </motion.g>
        <path d="M80 510 C245 410 355 560 520 450 S720 390 820 470" fill="none" stroke={identity.palette.secondary} strokeOpacity="0.16" strokeWidth="2" />
      </>
    ),
    waveform: (
      <>
        {Array.from({ length: 18 }, (_, index) => {
          const height = 38 + ((index * 37 + identity.energy) % 150);
          return (
            <motion.rect
              key={index}
              x={70 + index * 41}
              y={350 - height / 2}
              width="8"
              height={height}
              rx="4"
              fill={index % 3 === 0 ? identity.palette.secondary : identity.palette.primary}
              fillOpacity={0.08 + (index % 4) * 0.025}
              animate={reducedMotion ? undefined : { scaleY: [0.72, 1, 0.78] }}
              transition={{ duration: 2.4 + (index % 4) * 0.35, repeat: Infinity, ease: 'easeInOut', delay: index * 0.06 }}
              style={{ transformOrigin: `${74 + index * 41}px 350px` }}
            />
          );
        })}
        <path d="M0 455 C170 375 250 520 410 438 S660 350 820 430" fill="none" stroke={identity.palette.accent} strokeOpacity="0.18" strokeWidth="2" />
      </>
    ),
    prism: (
      <>
        <motion.g
          animate={reducedMotion ? undefined : { x: [0, 12, 0], y: [0, -8, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <polygon points="560,55 790,235 516,348" fill={identity.palette.primary} fillOpacity="0.055" stroke={identity.palette.primary} strokeOpacity="0.18" />
          <polygon points="560,55 516,348 405,192" fill={identity.palette.secondary} fillOpacity="0.055" stroke={identity.palette.secondary} strokeOpacity="0.16" />
          <polygon points="118,410 348,284 300,562" fill={identity.palette.accent} fillOpacity="0.035" stroke={identity.palette.accent} strokeOpacity="0.12" />
        </motion.g>
        <line x1="42" y1="105" x2="765" y2="565" stroke={identity.palette.primary} strokeOpacity="0.1" />
      </>
    ),
    grid: (
      <>
        <motion.g
          animate={reducedMotion ? undefined : { y: [0, 36] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
          opacity="0.16"
        >
          {Array.from({ length: 12 }, (_, index) => (
            <line key={`h-${index}`} x1="0" y1={55 + index * 50} x2="820" y2={55 + index * 50} stroke={identity.palette.primary} />
          ))}
          {Array.from({ length: 15 }, (_, index) => (
            <line key={`v-${index}`} x1={45 + index * 58} y1="0" x2={45 + index * 58} y2="640" stroke={identity.palette.secondary} strokeOpacity="0.55" />
          ))}
        </motion.g>
        <circle cx="620" cy="170" r="98" fill="none" stroke={identity.palette.accent} strokeOpacity="0.14" strokeDasharray="4 12" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 820 640"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {motifContent[identity.motif]}
    </svg>
  );
}

export default function EraExplorer({ data, isPersonalArchive = false }: EraExplorerProps) {
  const eras = data.yearly_eras;
  const [selectedYear, setSelectedYear] = useState<number | null>(() => eras.at(-1)?.year ?? null);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const timelineTabsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const touchOriginRef = useRef<{ x: number; y: number } | null>(null);
  const { lang, t } = useApp();
  const reducedMotion = Boolean(useReducedMotion());
  const copy = pickLanguage(lang, VISUAL_COPY);
  const locale = localeFor(lang);
  const isRtl = directionFor(lang) === 'rtl';
  const maxPlays = useMemo(() => Math.max(0, ...eras.map(era => era.plays)), [eras]);
  const visualIdentities = useMemo(
    () => eras.map(era => deriveEraVisualIdentity(era, maxPlays)),
    [eras, maxPlays],
  );
  const requestedIdx = eras.findIndex(era => era.year === selectedYear);
  const selectedIdx = requestedIdx >= 0 ? requestedIdx : Math.max(0, eras.length - 1);
  const currentEra = eras[selectedIdx];
  const identity = visualIdentities[selectedIdx];

  useEffect(() => {
    if (eras.length && requestedIdx < 0) setSelectedYear(eras.at(-1)!.year);
    if (!eras.length && selectedYear !== null) setSelectedYear(null);
  }, [eras, requestedIdx, selectedYear]);

  useEffect(() => {
    const activeTab = timelineTabsRef.current[selectedIdx];
    const timeline = timelineScrollRef.current;
    if (!activeTab || !timeline) return;

    // Keep the active year centered without scrollIntoView: that API can also
    // move the document vertically and undo App's deliberate room scroll reset.
    const timelineRect = timeline.getBoundingClientRect();
    const activeRect = activeTab.getBoundingClientRect();
    const left = timeline.scrollLeft
      + activeRect.left
      - timelineRect.left
      - (timeline.clientWidth - activeRect.width) / 2;
    const targetLeft = isRtl ? Math.min(0, left) : Math.max(0, left);
    if (typeof timeline.scrollTo === 'function') {
      timeline.scrollTo({ left: targetLeft, behavior: reducedMotion ? 'auto' : 'smooth' });
    } else {
      timeline.scrollLeft = targetLeft;
    }
  }, [isRtl, reducedMotion, selectedIdx]);

  if (!currentEra || !identity) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="glass-panel rounded-3xl border border-white/10 p-8 text-center text-sm text-gray-400">
          {copy.empty}
        </div>
      </div>
    );
  }

  const fmtNum = (value: number) => Math.round(value).toLocaleString(locale);
  const currentEraLabel = localizeEraLabel(currentEra.era_label, lang);
  const currentDaypartLabel = localizeDaypart(currentEra.dominant_daypart, lang);
  const currentEraDescription = localizeEraDescription(currentEra, lang, locale);
  const interpretation = isPersonalArchive
    ? currentEraDescription
    : ERA_INTERPRETATIONS[lang][currentEra.year]
      ?? t.eraExplorer.fallbackInterpretation(
        currentEra.year,
        currentEra.top_artist,
        fmtNum(currentEra.plays),
        currentEra.unique_artists,
        currentDaypartLabel.toLowerCase(),
      );
  const localizedMood = identity.mood[lang];
  const localizedEnergyBand = identity.energyBand[lang];
  // Rides the app-wide shared swap timing (chartKit) so era changes feel like
  // every other chart/panel swap in the museum.
  const posterTransition = reducedMotion ? { duration: 0 } : SWAP_TRANSITION;

  const selectRelativeEra = (delta: number) => {
    const nextIdx = Math.min(eras.length - 1, Math.max(0, selectedIdx + delta));
    setSelectedYear(eras[nextIdx].year);
  };

  const handleTimelineKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const previousKey = isRtl ? 'ArrowRight' : 'ArrowLeft';
    const nextKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const targetIdx = event.key === previousKey
      ? Math.max(0, idx - 1)
      : event.key === nextKey
        ? Math.min(eras.length - 1, idx + 1)
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? eras.length - 1
            : null;

    if (targetIdx === null) return;
    event.preventDefault();
    setSelectedYear(eras[targetIdx].year);
    timelineTabsRef.current[targetIdx]?.focus();
  };

  const handlePosterTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1) {
      touchOriginRef.current = null;
      return;
    }
    touchOriginRef.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  };

  const handlePosterTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const origin = touchOriginRef.current;
    touchOriginRef.current = null;
    const destination = event.changedTouches[0];
    if (!origin || !destination) return;

    const deltaX = destination.clientX - origin.x;
    const deltaY = destination.clientY - origin.y;
    if (Math.abs(deltaX) < 52 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;
    const relativeDirection = deltaX < 0 ? 1 : -1;
    selectRelativeEra(isRtl ? -relativeDirection : relativeDirection);
  };

  const previousEra = eras[selectedIdx - 1];
  const nextEra = eras[selectedIdx + 1];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="type-label type-muted">🗓️ {copy.journey}</p>
        <nav
          aria-label={copy.navigation}
          className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2 sm:w-auto sm:min-w-[340px]"
        >
          <button
            type="button"
            onClick={() => selectRelativeEra(-1)}
            disabled={selectedIdx === 0}
            aria-label={copy.previousAria}
            data-testid="era-previous"
            className="flex min-h-11 min-w-0 touch-manipulation items-center justify-start gap-1.5 rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-2.5 py-2 text-start text-cyberCyan transition-colors hover:border-cyberCyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-30 sm:px-3"
          >
            {isRtl
              ? <ChevronRight className="h-4 w-4 shrink-0" />
              : <ChevronLeft className="h-4 w-4 shrink-0" />}
            <span className="min-w-0 leading-none">
              <span className="block font-mono text-[7px] font-bold uppercase tracking-wider text-gray-500">{copy.previous}</span>
              <span className="mt-1 block truncate font-mono text-[11px] font-black">{previousEra?.year ?? '—'}</span>
            </span>
          </button>
          <div className="flex min-w-[66px] flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] px-2 py-1">
            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-gray-500">
              {selectedIdx + 1} / {eras.length}
            </span>
            <span className="font-mono text-sm font-black text-white">{currentEra.year}</span>
          </div>
          <button
            type="button"
            onClick={() => selectRelativeEra(1)}
            disabled={selectedIdx === eras.length - 1}
            aria-label={copy.nextAria}
            data-testid="era-next"
            className="flex min-h-11 min-w-0 touch-manipulation items-center justify-end gap-1.5 rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-2.5 py-2 text-end text-cyberCyan transition-colors hover:border-cyberCyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-30 sm:px-3"
          >
            <span className="min-w-0 leading-none">
              <span className="block font-mono text-[7px] font-bold uppercase tracking-wider text-gray-500">{copy.next}</span>
              <span className="mt-1 block truncate font-mono text-[11px] font-black">{nextEra?.year ?? '—'}</span>
            </span>
            {isRtl
              ? <ChevronLeft className="h-4 w-4 shrink-0" />
              : <ChevronRight className="h-4 w-4 shrink-0" />}
          </button>
        </nav>
      </div>

      <SectionNarrative content={t.deepNarratives.eras} accent="c1" />

      <div className="glass-panel relative overflow-hidden rounded-2xl border border-white/5 py-3 sm:py-4">
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-bgBase/80 to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-gradient-to-l from-bgBase/80 to-transparent" />
        <div ref={timelineScrollRef} className="touch-pan-x snap-x snap-mandatory overflow-x-auto overscroll-x-contain px-[calc(50%_-_2rem)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-4">
          <div role="tablist" aria-label={copy.timeline} className="flex min-w-max items-end gap-1.5 pb-1 sm:gap-2">
            {eras.map((era, idx) => {
              const eraIdentity = visualIdentities[idx];
              const active = idx === selectedIdx;
              return (
                <button
                  role="tab"
                  type="button"
                  id={`era-tab-${era.year}`}
                  key={era.year}
                  ref={node => { timelineTabsRef.current[idx] = node; }}
                  onClick={() => setSelectedYear(era.year)}
                  onKeyDown={event => handleTimelineKeyDown(event, idx)}
                  aria-label={copy.selectEra(era.year)}
                  aria-selected={active}
                  aria-controls={`era-poster-${era.year}`}
                  tabIndex={active ? 0 : -1}
                  className="group relative flex min-w-[62px] snap-center touch-manipulation flex-col items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:min-w-[68px]"
                  style={active ? { backgroundColor: eraIdentity.palette.primarySoft } : undefined}
                >
                  <div className="relative flex h-14 w-full items-end justify-center overflow-hidden rounded-lg bg-white/[0.035]">
                    <span className="absolute inset-x-0 bottom-0 h-px opacity-70" style={{ backgroundColor: eraIdentity.palette.primary }} />
                    <motion.span
                      className="block w-3 rounded-t-full"
                      style={{ background: `linear-gradient(to top, ${eraIdentity.palette.primary}, ${eraIdentity.palette.secondary})` }}
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(8, eraIdentity.intensity)}%` }}
                      transition={reducedMotion ? { duration: 0 } : { duration: 0.65, delay: idx * 0.025, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="font-mono text-[10px] font-black" style={{ color: active ? eraIdentity.palette.primary : '#6b7280' }}>
                    {era.year}
                  </span>
                  {active && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full" style={{ backgroundColor: eraIdentity.palette.primary }} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={currentEra.year}
          id={`era-poster-${currentEra.year}`}
          role="tabpanel"
          data-testid="era-poster"
          data-era={currentEra.year}
          aria-live="polite"
          aria-labelledby={`era-tab-${currentEra.year}`}
          onTouchStart={handlePosterTouchStart}
          onTouchEnd={handlePosterTouchEnd}
          onTouchCancel={() => { touchOriginRef.current = null; }}
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.988 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -12, scale: 0.99 }}
          transition={posterTransition}
          className="nova-on-dark relative isolate touch-pan-y overflow-hidden rounded-[1.5rem] border border-white/10 shadow-2xl sm:rounded-[2rem]"
          style={{
            backgroundColor: identity.palette.deep,
            backgroundImage: [
              `radial-gradient(circle at 12% 14%, ${identity.palette.primarySoft}, transparent 34%)`,
              `radial-gradient(circle at 88% 76%, ${identity.palette.secondarySoft}, transparent 40%)`,
              `linear-gradient(145deg, ${identity.palette.deep}, rgba(3, 7, 18, 0.97) 58%, #02040a)`,
            ].join(', '),
            boxShadow: `0 32px 90px -42px ${identity.palette.primary}, inset 0 1px 0 rgba(255,255,255,0.1)`,
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-80"
            style={{
              backgroundImage: identity.texture,
              backgroundSize: identity.motif === 'grid' ? '46px 46px' : 'auto',
              maskImage: 'linear-gradient(to bottom, black, transparent 94%)',
            }}
          />
          <EraMotifArt identity={identity} reducedMotion={reducedMotion} />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-2 -top-10 select-none font-mono text-[9rem] font-black leading-none text-white/[0.025] sm:text-[13rem] lg:text-[17rem]"
          >
            {currentEra.year}
          </div>

          <div className="relative z-10 grid min-h-0 grid-cols-1 gap-6 p-4 sm:min-h-[580px] sm:gap-8 sm:p-8 lg:grid-cols-[minmax(0,1.18fr)_minmax(300px,0.82fr)] lg:gap-10 lg:p-10 xl:p-12">
            <div className="contents min-w-0 lg:flex lg:flex-col lg:justify-between lg:gap-8">
              <div className="order-1 space-y-4 sm:space-y-5 lg:order-none">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full border px-3 py-1 font-mono text-[9px] font-black uppercase tracking-[0.2em]"
                    style={{ color: identity.palette.primary, borderColor: identity.palette.primarySoft, backgroundColor: 'rgba(0,0,0,0.28)' }}
                  >
                    {copy.poster}
                  </span>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-gray-500">
                    NML / {identity.serial} / {identity.motif}
                  </span>
                </div>

                <div>
                  <p className="font-mono text-[clamp(4.5rem,24vw,6.5rem)] font-black leading-[0.78] tracking-[-0.075em] text-white sm:text-[clamp(4rem,13vw,8.5rem)]">
                    {currentEra.year}
                  </p>
                  <h3 id={`era-title-${currentEra.year}`} className="mt-4 max-w-3xl break-words text-[2rem] font-black leading-[0.95] tracking-tight text-white sm:mt-5 sm:text-5xl lg:text-6xl" dir="auto">
                    {currentEraLabel}
                  </h3>
                </div>

                <p className="max-w-2xl text-sm leading-relaxed text-gray-300 sm:text-base" dir="auto">{currentEraDescription}</p>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-bold text-gray-200 backdrop-blur-sm">
                    {daypartEmoji(currentEra.dominant_daypart)} {currentDaypartLabel}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-bold text-gray-200 backdrop-blur-sm">
                    ✦ {localizedMood}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-bold backdrop-blur-sm" style={{ color: identity.palette.secondary }}>
                    ⚡ {localizedEnergyBand}
                  </span>
                </div>
              </div>

              <div className="order-3 grid grid-cols-3 gap-2 sm:gap-3 lg:order-none">
                <SignalBar label={copy.pulse} value={identity.energy} color={identity.palette.primary} icon={<Gauge className="h-3.5 w-3.5 shrink-0" />} />
                <SignalBar label={copy.exploration} value={identity.exploration} color={identity.palette.secondary} icon={<Compass className="h-3.5 w-3.5 shrink-0" />} />
                <SignalBar label={copy.intensity} value={identity.intensity} color={identity.palette.accent} icon={<Waves className="h-3.5 w-3.5 shrink-0" />} />
              </div>
            </div>

            <div className="order-2 flex min-w-0 items-center justify-center lg:order-none lg:justify-end">
              <div className="relative w-full max-w-[390px]">
                <div className="relative mx-auto aspect-square w-full max-w-[360px]">
                  <motion.div
                    aria-hidden="true"
                    className="absolute inset-[4%] rounded-full border border-dashed"
                    style={{ borderColor: identity.palette.primarySoft, boxShadow: `0 0 64px ${identity.palette.primarySoft}` }}
                    animate={reducedMotion ? undefined : { rotate: 360 }}
                    transition={{ duration: 36, repeat: Infinity, ease: 'linear' }}
                  />
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={reducedMotion ? undefined : { y: [0, -7, 0], rotate: [-1.2, 1.2, -1.2] }}
                    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div
                      className="relative rounded-[1.2rem] border border-white/15 bg-black/30 p-2.5 shadow-2xl backdrop-blur-sm sm:rounded-[1.4rem] sm:p-3"
                      style={{ boxShadow: `0 30px 80px -24px ${identity.palette.primary}` }}
                    >
                      <CoverArt artist={currentEra.top_artist} title={currentEra.top_track} kind="track" size={214} className="rounded-2xl" />
                      <span className="absolute -right-2 -top-2 rounded-full border border-white/15 bg-black/80 px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-widest text-white">
                        {copy.archive}
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    className="absolute bottom-[4%] left-[2%] z-10 rounded-full border border-white/15 bg-black/45 p-1.5 shadow-2xl backdrop-blur-md"
                    initial={reducedMotion ? undefined : { opacity: 0, scale: 0.85, x: -12 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={reducedMotion ? { duration: 0 } : { delay: 0.18, duration: 0.4 }}
                  >
                    <ArtistAvatar name={currentEra.top_artist} size={88} tooltip={false} />
                  </motion.div>

                  <div className="absolute bottom-[3%] left-[25%] right-0 z-10 min-w-0 rounded-xl border border-white/10 bg-black/65 p-2.5 backdrop-blur-xl sm:left-[27%] sm:rounded-2xl sm:p-3">
                    <p className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-gray-500">{copy.track}</p>
                    <p className="mt-1 truncate text-sm font-black text-white" dir="auto">{currentEra.top_track}</p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold" dir="auto" style={{ color: identity.palette.primary }}>{currentEra.top_artist}</p>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3 sm:gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-3 backdrop-blur-sm">
                    <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-gray-500">{copy.artist}</p>
                    <p className="mt-1 truncate text-sm font-black text-white" dir="auto">{currentEra.top_artist}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-3 backdrop-blur-sm">
                    <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-gray-500">{t.eraExplorer.statPlays}</p>
                    <p className="mt-1 font-mono text-sm font-black" style={{ color: identity.palette.secondary }}>{fmtNum(currentEra.plays)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-start gap-2 border-t border-white/10 bg-black/20 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-8 lg:px-12">
            <span className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-gray-400">
              <Radio className="h-3.5 w-3.5" style={{ color: identity.palette.primary }} />
              {copy.signal}
            </span>
            <span className="max-w-2xl text-[9px] leading-relaxed text-gray-500">{copy.signalNote}</span>
            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-gray-500 sm:hidden" aria-hidden="true">
              ↔ {copy.swipe}
            </span>
          </div>
        </motion.section>
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <div className="glass-panel rounded-3xl border-s-4 p-6 sm:p-8" style={{ borderInlineStartColor: identity.palette.primary }}>
          <h4 className="mb-3 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider" style={{ color: identity.palette.primary }}>
            <Sparkles className="h-4 w-4" />
            {t.eraExplorer.interpretiveReading}
          </h4>
          <p className="text-sm italic leading-relaxed text-gray-300 sm:text-base" dir="auto">“{interpretation}”</p>
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/5 pt-4">
            <span className="font-mono text-[9px] uppercase tracking-widest text-gray-500">{t.eraExplorer.chapterOf(selectedIdx + 1, eras.length, currentEra.year)}</span>
            <SunMedium className="h-4 w-4" style={{ color: identity.palette.secondary }} />
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <h4 className="mb-4 font-mono text-xs font-bold uppercase tracking-widest text-gray-400">{t.eraExplorer.statsFor(currentEra.year)}</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t.eraExplorer.statPlays, val: fmtNum(currentEra.plays), color: identity.palette.primary },
              { label: t.eraExplorer.statArtists, val: fmtNum(currentEra.unique_artists), color: identity.palette.secondary },
              { label: t.eraExplorer.statTracks, val: fmtNum(currentEra.unique_tracks), color: identity.palette.accent },
              { label: t.eraExplorer.statDiversity, val: `${currentEra.diversity_index}%`, color: '#34d399' },
            ].map(({ label, val, color }) => (
              <div key={label} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <p className="font-mono text-[9px] uppercase text-gray-500">{label}</p>
                <p className="mt-1 text-lg font-black" style={{ color }}>{val}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.025] p-3">
            <div className="mb-2 flex justify-between font-mono text-[9px] uppercase text-gray-500">
              <span>{copy.fixation}</span>
              <span>{identity.fixation}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full" style={{ width: `${identity.fixation}%`, backgroundColor: identity.palette.primary }} />
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-gray-400" />
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-gray-400">{t.eraExplorer.allEras}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {eras.map((era, idx) => {
            const eraIdentity = visualIdentities[idx];
            const active = idx === selectedIdx;
            return (
              <button
                type="button"
                key={era.year}
                onClick={() => setSelectedYear(era.year)}
                aria-label={copy.selectEra(era.year)}
                aria-pressed={active}
                className="group relative min-h-28 overflow-hidden rounded-2xl border p-3 text-start transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:transform-none"
                style={{
                  borderColor: active ? eraIdentity.palette.primary : 'rgba(255,255,255,0.07)',
                  backgroundColor: eraIdentity.palette.deep,
                  backgroundImage: eraIdentity.texture,
                  backgroundSize: eraIdentity.motif === 'grid' ? '24px 24px' : 'auto',
                  boxShadow: active ? `0 15px 40px -26px ${eraIdentity.palette.primary}` : undefined,
                }}
              >
                <span className="absolute right-2 top-1 font-mono text-4xl font-black text-white/[0.035]">{String(era.year).slice(-2)}</span>
                <p className="relative font-mono text-sm font-black" style={{ color: eraIdentity.palette.primary }}>{era.year}</p>
                <p className="relative mt-1 line-clamp-2 text-[10px] font-bold leading-tight text-gray-200">{localizeEraLabel(era.era_label, lang)}</p>
                <div className="relative mt-3 flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[8px] text-gray-500" dir="auto">{era.top_artist}</span>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: eraIdentity.palette.secondary, boxShadow: `0 0 8px ${eraIdentity.palette.secondary}` }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
