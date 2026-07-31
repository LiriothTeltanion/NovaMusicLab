import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Database,
  Disc,
  FileUp,
  Headphones,
  History,
  LibraryBig,
  Play,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { MusicDnaData } from '../types';
import CountUpCmp from './CountUp';
import { useApp } from '../context/AppContext';
import AnimatedParticles from './AnimatedParticles';
import ArtistAvatar, { getOpenKnowledgeArtistImageUrl } from './ArtistAvatar';
import CoverArt from './CoverArt';
import CreatorCvLink from './CreatorCvLink';
import NovaMark from './NovaMark';
import { paintMoodArt } from './MoodArtCanvas';
import { buildCoreEmotionalMapProfile } from '../engines/moodCore';
import { buildArchetypes } from '../utils/identityEngine';
import { playMuseumSound, type MuseumSoundCue } from '../audio/sonicFeedback';
import { deriveSourceSummary, getSourceTelemetry, type SourceTelemetryId } from '../utils/analytics';
import { localeFor, pickLanguage, type Lang } from '../utils/i18n';
import {
  getLocalDayKey,
  selectDailyArtistSatellites,
  type HeroConstellationArtist,
} from '../utils/heroArtistConstellation';
import type { MotionMode } from './museumVisualIdentity';
import NovaReleaseStory, { NOVA_RELEASE_STORY_ID } from './hero/NovaReleaseStory';
import {
  CURRENT_NOVA_RELEASE,
  type NovaReleaseStatus,
} from '../releases/releaseHistory';
import './HeroSection.css';

interface HeroSectionProps {
  data: MusicDnaData;
  onEnter: () => void;
  onUpload: () => void;
  /** Distinguishes an uploaded/restored archive from the bundled demo museum. */
  isPersonalArchive?: boolean;
  /** True only after IndexedDB confirms that this exact active archive was saved. */
  isArchivePersisted?: boolean;
  /** Opens the AI Assistant tab; the welcome card's "Launch Chat Console" CTA needs it. */
  onOpenAssistant?: () => void;
  /** Opens the selected artist in the host app's artist-detail experience. */
  onOpenArtist?: (artistName: string) => void;
  /** User-selected ambient quality. System reduced-motion still wins. */
  motionMode?: MotionMode;
}

// Stable fallback: an inline object literal here would be a fresh reference on
// every render, silently defeating every useMemo that lists `metrics` as a dep.
const EMPTY_METRICS = {
  total_plays: 0,
  listening_hours: 0,
  unique_artists: 0,
  unique_tracks: 0,
  listening_days: 0,
  match_rate_pct: 0,
} as const;

const SOURCE_PLATFORM_VISUALS: Record<SourceTelemetryId, { label: string; from: string; to: string }> = {
  spotify: { label: 'Spotify', from: '#1DB954', to: '#1ed760' },
  lastfm: { label: 'Last.fm', from: '#d51007', to: '#e8334a' },
  youtube: { label: 'YouTube Music', from: '#ff0000', to: '#ff4f4f' },
  apple_music: { label: 'Apple Music', from: '#fa57c1', to: '#ff7ebd' },
  listenbrainz: { label: 'ListenBrainz', from: '#f59e0b', to: '#fbbf24' },
};

interface HeroProfileReportInput {
  scrobbles: string;
  hours: string;
  archetype: string;
  mood: string;
  moodPercentage: number;
  topArtist: string;
  topArtistPlays: string;
  peakSentence: string;
  sourceSentence: string;
}

interface HeroLocalCopy {
  sourceOverlap: string;
  personalBadge: (years: number) => string;
  personalTimelineUnavailable: string;
  personalSubtitle: string;
  personalSupport: string;
  personalOwner: string;
  fallbackArchetype: string;
  mergedSource: (matchRate: number) => string;
  singleSource: (source: string) => string;
  profileTitle: (owner: string, genre: string) => string;
  profileReport: (input: HeroProfileReportInput) => string;
  genreUnavailable: string;
  peakYearSentence: (year: number) => string;
  peakYearUnavailableSentence: string;
  archiveHighlights: string;
  assistantLink: string;
  playSignature: (artist: string) => string;
  scrollNote: string;
  archiveIntelligence: string;
  offlineReading: string;
  launchConsole: string;
  curiosityQuestion: string;
  constellationLabel: string;
  constellationSource: string;
  openArtist: (artist: string) => string;
  initializing: string;
  decryptingAtlas: (years: number | null) => string;
  personalArchiveState: string;
  personalArchiveDetail: string;
  personalArchiveTabOnlyDetail: string;
  flagshipArchiveState: string;
  flagshipArchiveDetail: string;
}

const bidiIsolate = (value: string | number) => `\u2068${value}\u2069`;

const HERO_LOCAL_COPY: Record<Lang, HeroLocalCopy> = {
  es: {
    sourceOverlap: 'de las canciones aparecen en más de una fuente',
    personalBadge: years => `✨ ${years} ${years === 1 ? 'Año' : 'Años'} en Tu Archivo`,
    personalTimelineUnavailable: '✨ Cronología del archivo no disponible',
    personalSubtitle: '✧ Tu Universo Musical ✧',
    personalSupport: 'Tu archivo está listo para explorar. Añade más datos cuando quieras; todo permanece privado y local en este navegador.',
    personalOwner: 'TU ARCHIVO',
    fallbackArchetype: 'Explorador Sónico',
    mergedSource: matchRate => `Hecho con varias exportaciones a la vez. El ${matchRate}% de las canciones aparece en más de una, y así se emparejaron entre sí.`,
    singleSource: source => `Hecho con una sola fuente: ${source}. Al no haber con qué contrastar, aquí no se afirma ningún cruce.`,
    profileTitle: (owner, genre) => `EXPEDIENTE DE MÚSICA IA: ${owner} [CLASE ${genre.toUpperCase()}]`,
    profileReport: input => `La auditoría neural de tu biblioteca revela una firma sonora altamente estructurada. A lo largo de ${input.scrobbles} reproducciones y ${input.hours} horas, tu perfil resuena bajo el arquetipo "${input.archetype}". Tu espectro emocional está dominado por la resonancia "${input.mood}" (intensidad ${input.moodPercentage}%). En el núcleo de tu biblioteca destaca ${input.topArtist}, representando tu obsesión principal con ${input.topArtistPlays} reproducciones. ${input.peakSentence} ${input.sourceSentence}`,
    genreUnavailable: 'Género no disponible',
    peakYearSentence: year => `La era pico se centra en ${year}.`,
    peakYearUnavailableSentence: 'No hay datos anuales suficientes para identificar una era pico.',
    archiveHighlights: 'Destacados del archivo',
    assistantLink: 'Pregúntale a la IA sobre tu música',
    playSignature: artist => `Reproducir la firma sonora de ${artist}`,
    scrollNote: 'El archivo continúa',
    archiveIntelligence: 'Inteligencia del archivo',
    offlineReading: 'Lectura IA offline',
    launchConsole: 'Iniciar Consola de Chat',
    curiosityQuestion: '¿Qué artista dio forma al mundo que escuchas hoy?',
    constellationLabel: 'Constelación de artistas de hoy',
    constellationSource: 'Retratos revisados de Wikimedia Commons · abre uno para ver su fuente y atribución en el Atlas',
    openArtist: artist => `Abrir el perfil de ${artist}`,
    initializing: 'INICIALIZANDO INTERFAZ NEURAL',
    decryptingAtlas: years => years === null
      ? 'CRONOLOGÍA NO DISPONIBLE · ABRIENDO SEÑALES VERIFICADAS…'
      : `DESCIFRANDO ATLAS DE ${years} ${years === 1 ? 'AÑO' : 'AÑOS'}…`,
    personalArchiveState: 'Archivo personal',
    personalArchiveDetail: 'Privado · guardado localmente',
    personalArchiveTabOnlyDetail: 'Privado · activo solo en esta pestaña',
    flagshipArchiveState: 'Museo de ejemplo',
    flagshipArchiveDetail: 'Un archivo real de 11 años, para que puedas mirar',
  },
  en: {
    sourceOverlap: 'of songs show up in more than one source',
    personalBadge: years => `✨ ${years} ${years === 1 ? 'Year' : 'Years'} in Your Archive`,
    personalTimelineUnavailable: '✨ Archive timeline unavailable',
    personalSubtitle: '✧ Your Musical Universe ✧',
    personalSupport: 'Your archive is ready to explore. Add more files whenever you want; everything stays private and local in this browser.',
    personalOwner: 'YOUR ARCHIVE',
    fallbackArchetype: 'Sonic Explorer',
    mergedSource: matchRate => `Built from several exports at once. ${matchRate}% of songs show up in more than one of them, which is how they were matched together.`,
    singleSource: source => `Built from one source: ${source}. With nothing to cross-check against, no overlap is claimed here.`,
    profileTitle: (owner, genre) => `AI MUSIC PROFILE: ${owner} [${genre.toUpperCase()} CLASS]`,
    profileReport: input => `Neural audit of your library reveals a highly structured sonic signature. Across ${input.scrobbles} plays and ${input.hours} hours, your profile resonates with the "${input.archetype}" archetype. Your emotional spectrum is dominated by "${input.mood}" resonance (intensity ${input.moodPercentage}%). At the core of your listening stands ${input.topArtist}, representing your primary obsession with ${input.topArtistPlays} plays. ${input.peakSentence} ${input.sourceSentence}`,
    genreUnavailable: 'Genre unavailable',
    peakYearSentence: year => `The peak era centers on ${year}.`,
    peakYearUnavailableSentence: 'Annual evidence is unavailable, so no peak era is claimed.',
    archiveHighlights: 'Archive highlights',
    assistantLink: 'Ask AI about your music',
    playSignature: artist => `Play the sonic signature of ${artist}`,
    scrollNote: 'The archive continues',
    archiveIntelligence: 'Archive intelligence',
    offlineReading: 'Offline AI reading',
    launchConsole: 'Launch Chat Console',
    curiosityQuestion: 'Which artist shaped the world you hear today?',
    constellationLabel: 'Today’s artist constellation',
    constellationSource: 'Reviewed Wikimedia Commons portraits · open one for its source and attribution in the Atlas',
    openArtist: artist => `Open ${artist} artist profile`,
    initializing: 'INITIALIZING NEURAL INTERFACE',
    decryptingAtlas: years => years === null
      ? 'TIMELINE UNAVAILABLE · OPENING VERIFIED SIGNALS…'
      : `DECRYPTING ${years}-YEAR ATLAS…`,
    personalArchiveState: 'Personal archive',
    personalArchiveDetail: 'Private · saved locally',
    personalArchiveTabOnlyDetail: 'Private · active in this tab only',
    flagshipArchiveState: 'Example museum',
    flagshipArchiveDetail: 'One real 11-year archive, shown so you can look around',
  },
  he: {
    sourceOverlap: 'מהשירים מופיעים ביותר ממקור אחד',
    personalBadge: years => years === 1 ? '✨ שנה אחת בארכיון שלך' : `✨ ${years} שנים בארכיון שלך`,
    personalTimelineUnavailable: '✨ ציר הזמן של הארכיון אינו זמין',
    personalSubtitle: '✧ היקום המוזיקלי שלך ✧',
    personalSupport: 'הארכיון שלך מוכן לחקירה. תוכל להוסיף קבצים נוספים מתי שתרצה; הכול נשאר פרטי ומקומי בדפדפן הזה.',
    personalOwner: 'הארכיון שלך',
    fallbackArchetype: 'החוקר הצלילי',
    mergedSource: matchRate => `בנוי מכמה ייצואים יחד. ${bidiIsolate(`${matchRate}%`)} מהשירים מופיעים ביותר מאחד מהם, וכך הם הותאמו זה לזה.`,
    singleSource: source => `בנוי ממקור אחד: ${bidiIsolate(source)}. אין מול מה להצליב, ולכן לא נטענת כאן שום חפיפה.`,
    profileTitle: (owner, genre) => `פרופיל מוזיקלי מבוסס בינה מלאכותית: ${bidiIsolate(owner)} [סיווג ${bidiIsolate(genre)}]`,
    profileReport: input => `הניתוח העצבי של הספרייה שלך חושף חתימה צלילית מובנית ומובהקת. לאורך ${bidiIsolate(input.scrobbles)} השמעות ו־${bidiIsolate(input.hours)} שעות, הפרופיל שלך מהדהד עם הארכיטיפ „${bidiIsolate(input.archetype)}”. בספקטרום הרגשי שלך שולטת התהודה „${bidiIsolate(input.mood)}” בעוצמה של ${bidiIsolate(`${input.moodPercentage}%`)}. בלב ההאזנה שלך ניצב ${bidiIsolate(input.topArtist)}, האובססיה המרכזית שלך עם ${bidiIsolate(input.topArtistPlays)} השמעות. ${input.peakSentence} ${input.sourceSentence}`,
    genreUnavailable: 'הז׳אנר אינו זמין',
    peakYearSentence: year => `תקופת השיא מתמקדת בשנת ${bidiIsolate(year)}.`,
    peakYearUnavailableSentence: 'אין נתונים שנתיים מספיקים, ולכן לא נטענת תקופת שיא.',
    archiveHighlights: 'נקודות השיא של הארכיון',
    assistantLink: 'שאלו את הבינה המלאכותית על המוזיקה שלכם',
    playSignature: artist => `נגן את החתימה הצלילית של ${bidiIsolate(artist)}`,
    scrollNote: 'הארכיון ממשיך',
    archiveIntelligence: 'המודיעין של הארכיון',
    offlineReading: 'ניתוח בינה מלאכותית מקומי',
    launchConsole: 'פתח את מסוף הצ׳אט',
    curiosityQuestion: 'איזה אמן עיצב את העולם שאתה שומע היום?',
    constellationLabel: 'קבוצת האמנים של היום',
    constellationSource: `דיוקנאות שנבדקו מתוך ${bidiIsolate('Wikimedia Commons')} · פתח דיוקן כדי לראות מקור וייחוס באטלס`,
    openArtist: artist => `פתח את פרופיל האמן של ${bidiIsolate(artist)}`,
    initializing: 'אתחול הממשק העצבי',
    decryptingAtlas: years => years === null
      ? 'ציר הזמן אינו זמין · פותח אותות מאומתים…'
      : years === 1 ? 'מפענח אטלס של שנה אחת…' : `מפענח אטלס של ${years} שנים…`,
    personalArchiveState: 'ארכיון אישי',
    personalArchiveDetail: 'פרטי · שמור מקומית',
    personalArchiveTabOnlyDetail: 'פרטי · פעיל רק בכרטיסייה הזאת',
    flagshipArchiveState: 'מוזיאון לדוגמה',
    flagshipArchiveDetail: 'ארכיון אמיתי של 11 שנים, פתוח כדי שתוכלו להסתובב בו',
  },
};

/** Count-up using native requestAnimationFrame — reliable across React versions */
function CountUp({ target, duration = 1.8, delay = 0 }: { target: number; duration?: number; delay?: number }) {
  return <CountUpCmp target={target} duration={duration} delay={delay} />;
}

export default function HeroSection({
  data,
  onEnter,
  onUpload,
  isPersonalArchive = false,
  isArchivePersisted = false,
  onOpenAssistant,
  onOpenArtist,
  motionMode = 'calm',
}: HeroSectionProps) {
  const metrics = data?.core_metrics || EMPTY_METRICS;
  const topArtist = data?.top_artists?.[0];
  const topTrack = data?.top_tracks?.[0];
  const { t, lang } = useApp();
  const shouldReduceMotion = Boolean(useReducedMotion()) || motionMode === 'static';
  const locale = localeFor(lang);
  const copy = pickLanguage(lang, HERO_LOCAL_COPY);
  const fmtNum = useCallback((num: number) => num.toLocaleString(locale), [locale]);
  const visualEntranceX = pickLanguage(lang, { es: 24, en: 24, he: -24 });
  const releaseStatusLabel = pickLanguage(lang, {
    en: {
      'private-candidate': 'private candidate',
      'private-checkpoint': 'private checkpoint',
      deployed: 'deployed',
      published: 'published',
      superseded: 'superseded',
    } satisfies Record<NovaReleaseStatus, string>,
    es: {
      'private-candidate': 'candidata privada',
      'private-checkpoint': 'checkpoint privado',
      deployed: 'desplegada',
      published: 'publicada',
      superseded: 'reemplazada',
    } satisfies Record<NovaReleaseStatus, string>,
    he: {
      'private-candidate': 'גרסה מועמדת פרטית',
      'private-checkpoint': 'נקודת ביקורת פרטית',
      deployed: 'נפרסה',
      published: 'פורסמה',
      superseded: 'הוחלפה',
    } satisfies Record<NovaReleaseStatus, string>,
  })[CURRENT_NOVA_RELEASE.status];
  const releaseJumpCopy = pickLanguage(lang, {
    en: {
      label: `v${CURRENT_NOVA_RELEASE.version} · ${releaseStatusLabel}`,
      action: 'Read what changed in this Nova version',
    },
    es: {
      label: `v${CURRENT_NOVA_RELEASE.version} · ${releaseStatusLabel}`,
      action: 'Leer qué cambió en esta versión de Nova',
    },
    he: {
      label: `v${CURRENT_NOVA_RELEASE.version} · ${releaseStatusLabel}`,
      action: 'מה השתנה בגרסה הזאת של Nova',
    },
  });

  // Peak year calculation helper
  const peakYear = useMemo(() => {
    if (!data?.yearly_eras || data.yearly_eras.length === 0) return null;
    return data.yearly_eras
      .filter(era => era.plays > 0 && Number.isFinite(era.year))
      .sort((a, b) => b.plays - a.plays)[0] ?? null;
  }, [data?.yearly_eras]);

  const archiveYearSpan = useMemo(() => {
    const years = (data?.yearly_eras ?? [])
      .filter((era) => era.plays > 0)
      .map((era) => era.year);
    if (years.length === 0) return null;
    if (years.length === 1) return 1;
    return Math.max(1, Math.max(...years) - Math.min(...years));
  }, [data?.yearly_eras]);

  // Derive source summary details
  const sourceSummary = useMemo(() => deriveSourceSummary(data), [data]);
  const sourceTelemetry = useMemo(() => getSourceTelemetry(sourceSummary), [sourceSummary]);

  const sourceLabel = t.heroSection.sourceLabels[sourceSummary.source_type];

  const introCopy = isPersonalArchive
    ? {
        badge: archiveYearSpan === null
          ? copy.personalTimelineUnavailable
          : copy.personalBadge(archiveYearSpan),
        subtitle: copy.personalSubtitle,
        support: copy.personalSupport,
      }
    : {
        badge: t.heroSection.badge,
        subtitle: t.heroSection.subtitle,
        support: t.heroSection.ctaSupport,
      };

  const constellationDayKey = useMemo(() => getLocalDayKey(), []);
  const topArtistPortraitUrl = useMemo(
    () => topArtist ? getOpenKnowledgeArtistImageUrl(topArtist.name, 320) : null,
    [topArtist],
  );
  const constellationArtists = useMemo(() => {
    const reviewedArtists = (data?.top_artists ?? [])
      .slice(0, 24)
      .flatMap<HeroConstellationArtist>((artist) => {
        const imageUrl = getOpenKnowledgeArtistImageUrl(artist.name, 96);
        return imageUrl ? [{ ...artist, imageUrl }] : [];
      });

    return selectDailyArtistSatellites(
      reviewedArtists,
      topArtist?.name,
      constellationDayKey,
    );
  }, [constellationDayKey, data?.top_artists, topArtist?.name]);

  const dossierOwner = isPersonalArchive
    ? copy.personalOwner
    : 'KEVIN CUSNIR';
  const archiveState = isPersonalArchive
    ? {
        label: copy.personalArchiveState,
        detail: isArchivePersisted ? copy.personalArchiveDetail : copy.personalArchiveTabOnlyDetail,
      }
    : { label: copy.flagshipArchiveState, detail: copy.flagshipArchiveDetail };

  const dominantMood = useMemo(() => {
    const list = data?.top_artists || [];
    const profile = buildCoreEmotionalMapProfile(list, 24);
    const mood = profile.dominantMood;
    const name = pickLanguage(lang, mood.title);
    const percentage = profile.distribution[0]?.pct || 100;
    return {
      key: mood.key,
      name,
      percentage,
    };
  }, [data?.top_artists, lang]);

  // The mood texture is decorative, so it must not compete with the title or
  // anchor portrait on the critical render path. Its CSS texture is the stable
  // fallback; richer bitmap art is generated only while the browser is idle.
  const [heroArtUrl, setHeroArtUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let idleTask: number | null = null;
    let delayedTask: number | null = null;
    let objectUrl: string | null = null;
    setHeroArtUrl(null);

    // Static mode and OS reduced-motion both keep the lightweight visual
    // fallback and skip all decorative canvas/encoding work.
    if (shouldReduceMotion) return undefined;

    // DOM typings model idle callbacks as universally available, while some
    // supported browsers still omit them at runtime. Reflective lookup keeps
    // the fallback reachable without narrowing `window` to `never`.
    const requestIdle = Reflect.get(window, 'requestIdleCallback') as Window['requestIdleCallback'] | undefined;
    const cancelIdle = Reflect.get(window, 'cancelIdleCallback') as Window['cancelIdleCallback'] | undefined;

    const generateArtwork = () => {
      idleTask = null;
      delayedTask = null;
      const width = 960;
      const height = 600;
      const canvas = document.createElement('canvas');
      if (
        typeof canvas.toBlob !== 'function'
        || typeof URL.createObjectURL !== 'function'
      ) return;

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      paintMoodArt(ctx, width, height, dominantMood.key, `hero::${topArtist?.name ?? 'nova'}`);

      // Blob encoding is asynchronous, unlike toDataURL's main-thread PNG
      // serialization. The object URL is owned by this effect and revoked on
      // every dependency change or unmount.
      canvas.toBlob((blob) => {
        if (cancelled || !blob) return;
        const artUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(artUrl);
          return;
        }
        objectUrl = artUrl;
        setHeroArtUrl(artUrl);
      }, 'image/png');
    };

    if (typeof requestIdle === 'function') {
      idleTask = requestIdle.call(window, generateArtwork, { timeout: 1_400 });
    } else {
      delayedTask = window.setTimeout(generateArtwork, 120);
    }

    return () => {
      cancelled = true;
      if (idleTask !== null && typeof cancelIdle === 'function') {
        cancelIdle.call(window, idleTask);
      }
      if (delayedTask !== null) window.clearTimeout(delayedTask);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [dominantMood.key, shouldReduceMotion, topArtist?.name]);

  // Derived live from the real top_artists, per current language - matches
  // whichever archive (bundled demo or a visitor's own upload) is on screen.
  const heroArchetype = useMemo(() => {
    const list = data?.top_artists || [];
    return buildArchetypes(list, lang)[0]?.name || copy.fallbackArchetype;
  }, [copy.fallbackArchetype, data?.top_artists, lang]);

  // Custom offline AI dossier compiler
  const aiMusicProfile = useMemo(() => {
    if (!topArtist) return null;
    const scrobbles = metrics.total_plays;
    const hours = metrics.listening_hours;
    const artistGenre = topArtist.genre?.trim();
    const rankedGenre = data?.top_genres
      ?.find(entry => entry.plays > 0 && entry.name.trim().length > 0)
      ?.name.trim();
    const topGenre = artistGenre || rankedGenre;
    const moodLabel = dominantMood.name;
    const archetype = heroArchetype;
    const sourceProvenanceSentence = sourceSummary.source_type === 'merged'
      ? copy.mergedSource(metrics.match_rate_pct)
      : copy.singleSource(sourceLabel);
    const genreClass = topGenre?.split(' / ')[0] ?? copy.genreUnavailable;
    const reportInput: HeroProfileReportInput = {
      scrobbles: fmtNum(scrobbles),
      hours: fmtNum(hours),
      archetype,
      mood: moodLabel,
      moodPercentage: Math.round(dominantMood.percentage),
      topArtist: topArtist.name,
      topArtistPlays: fmtNum(topArtist.plays),
      peakSentence: peakYear
        ? copy.peakYearSentence(peakYear.year)
        : copy.peakYearUnavailableSentence,
      sourceSentence: sourceProvenanceSentence,
    };

    return {
      title: copy.profileTitle(dossierOwner, genreClass),
      report: copy.profileReport(reportInput),
    };
  }, [copy, data, metrics, topArtist, dominantMood, peakYear, dossierOwner, heroArchetype, sourceLabel, sourceSummary.source_type, fmtNum]);

  const archiveCards = [
    {
      icon: Headphones,
      accent: '#00f2fe',
      label: t.heroSection.archiveSnapshot.topArtist,
      value: topArtist?.name ?? t.heroSection.archiveSnapshot.unknown,
      detail: topArtist
        ? t.heroSection.archiveSnapshot.topArtistDetail(fmtNum(topArtist.plays))
        : t.heroSection.archiveSnapshot.pending,
      art: topArtist ? <ArtistAvatar name={topArtist.name} size={36} /> : null,
    },
    {
      icon: Disc,
      accent: '#f72585',
      label: t.heroSection.archiveSnapshot.topTrack,
      value: topTrack?.title ?? t.heroSection.archiveSnapshot.unknown,
      detail: topTrack
        ? t.heroSection.archiveSnapshot.topTrackDetail(topTrack.artist)
        : t.heroSection.archiveSnapshot.pending,
      art: topTrack ? <CoverArt artist={topTrack.artist} title={topTrack.title} kind="track" size={36} /> : null,
    },
    {
      icon: Trophy,
      accent: '#a78bfa',
      label: t.heroSection.archiveSnapshot.peakEra,
      value: peakYear ? String(peakYear.year) : t.heroSection.archiveSnapshot.unknown,
      detail: peakYear
        ? t.heroSection.archiveSnapshot.peakEraDetail(fmtNum(peakYear.plays))
        : t.heroSection.archiveSnapshot.pending,
      art: null,
    },
    {
      icon: ShieldCheck,
      accent: '#4cc9f0',
      label: t.heroSection.archiveSnapshot.dataTrust,
      value: sourceLabel,
      detail: t.heroSection.archiveSnapshot.dataTrustDetail(sourceLabel),
      art: null,
    },
  ];

  const coreStatCards = [
    { icon: Headphones, color: 'text-cyberCyan',   label: t.hero.scrobbles, val: metrics.total_plays,     d: 0.8 },
    { icon: Clock,      color: 'text-cyberPink',   label: t.hero.hours,     val: metrics.listening_hours, d: 0.9 },
    { icon: Disc,       color: 'text-cyberPurple', label: t.hero.artists,   val: metrics.unique_artists,  d: 1.0 },
    { icon: Play,       color: 'text-cyberBlue',   label: t.hero.tracks,    val: metrics.unique_tracks,   d: 1.1 },
    { icon: Calendar,   color: 'text-green-400',   label: t.hero.days,      val: metrics.listening_days,  d: 1.2 },
  ];

  const [isWarping, setIsWarping] = useState(false);
  const [isCorePulsing, setIsCorePulsing] = useState(false);

  const triggerCorePulse = (cue: MuseumSoundCue) => {
    if (isCorePulsing) return;
    setIsCorePulsing(true);
    setTimeout(() => setIsCorePulsing(false), 760);
    playMuseumSound(cue);
  };

  const handleEnter = () => {
    setIsWarping(true);
    triggerCorePulse('enter');
    setTimeout(onEnter, shouldReduceMotion ? 0 : 1200);
  };

  // Same warp-out ritual, but landing on the AI Assistant tab the welcome
  // card promises - not the generic dashboard.
  const handleLaunchAssistant = () => {
    if (!onOpenAssistant) return handleEnter();
    setIsWarping(true);
    triggerCorePulse('open');
    setTimeout(onOpenAssistant, shouldReduceMotion ? 0 : 1200);
  };

  const handleOpenArtist = (artistName: string) => {
    triggerCorePulse('open');
    onOpenArtist?.(artistName);
  };

  const handleOpenReleaseStory = () => {
    document.getElementById(NOVA_RELEASE_STORY_ID)?.scrollIntoView({
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <section
      className="nova-hero relative min-h-screen overflow-hidden text-[var(--fg)]"
      data-motion={motionMode}
      aria-labelledby="nova-hero-title"
    >
      <div
        className="nova-hero__mood-art absolute inset-0 pointer-events-none"
        aria-hidden="true"
        data-art-source={heroArtUrl ? 'generated' : 'fallback'}
        style={heroArtUrl ? { backgroundImage: `url(${heroArtUrl})` } : undefined}
      />
      <div className="nova-hero__aurora nova-hero__aurora--cyan" aria-hidden="true" />
      <div className="nova-hero__aurora nova-hero__aurora--pink" aria-hidden="true" />
      <div className="nova-hero__grid absolute inset-0 pointer-events-none" aria-hidden="true" />
      {!shouldReduceMotion ? (
        <AnimatedParticles count={motionMode === 'expressive' ? 20 : 8} intensity="subtle" />
      ) : null}

      <div className="nova-hero__viewport relative z-10" data-testid="hero-first-viewport">
        <motion.header
          initial={shouldReduceMotion ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
          className="nova-hero__masthead"
        >
          <div className="nova-hero__brand-lockup" aria-label="Nova Music Lab">
            <span className="nova-hero__brand-mark" aria-hidden="true">
              <NovaMark size={32} />
            </span>
            <span>
              <strong>NOVA</strong>
              <small>MUSIC LAB</small>
            </span>
          </div>

          <div className="nova-hero__masthead-meta">
            <button
              type="button"
              className="nova-hero__release-jump"
              aria-controls={NOVA_RELEASE_STORY_ID}
              aria-label={releaseJumpCopy.action}
              onClick={handleOpenReleaseStory}
            >
              <History className="h-4 w-4" aria-hidden="true" />
              <span className="nova-hero__release-jump-label--full">
                {releaseJumpCopy.label}
              </span>
              <span
                className="nova-hero__release-jump-label--compact"
                aria-hidden="true"
              >
                v{CURRENT_NOVA_RELEASE.version}
              </span>
            </button>
            <div
              className="nova-hero__archive-state"
              aria-label={`${archiveState.label}: ${archiveState.detail}`}
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>
                <strong>{archiveState.label}</strong>
                <small>{archiveState.detail}</small>
              </span>
            </div>
            <div className="nova-hero__source">
              <span className="nova-hero__live-dot" aria-hidden="true" />
              <span>{sourceLabel}</span>
              {sourceSummary.source_type === 'merged' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span><bdi dir="ltr" className="nova-number-ltr">{metrics.match_rate_pct}%</bdi> {copy.sourceOverlap}</span>
                </>
              )}
            </div>
          </div>
        </motion.header>

        <div className="nova-hero__stage">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.7, delay: shouldReduceMotion ? 0 : 0.12 }}
            className="nova-hero__story"
          >
            <p className="nova-hero__eyebrow">
              <span aria-hidden="true">✦</span>
              {introCopy.badge}
            </p>

            <h1 id="nova-hero-title" className="nova-hero__title">
              <span className="nova-hero__title-nova" data-word="NOVA">NOVA</span>
              <span className="nova-hero__title-accent">MUSIC LAB</span>
            </h1>

            <p
              className="nova-hero__question"
              dir={lang === 'he' ? 'rtl' : 'ltr'}
              lang={lang}
            >
              {copy.curiosityQuestion}
            </p>
            <p className="nova-hero__subtitle">{introCopy.subtitle}</p>
            <p className="nova-hero__lede">{introCopy.support}</p>

            <dl className="nova-hero__stats" aria-label={copy.archiveHighlights}>
              <div>
                <dt>{t.hero.scrobbles}</dt>
                <dd><CountUp target={metrics.total_plays} duration={shouldReduceMotion ? 0 : 1.4} /></dd>
              </div>
              <div>
                <dt>{t.hero.hours}</dt>
                <dd>
                  <CountUp
                    target={metrics.listening_hours}
                    duration={shouldReduceMotion ? 0 : 1.4}
                    delay={shouldReduceMotion ? 0 : 0.08}
                  />
                </dd>
              </div>
              <div>
                <dt>{t.heroSection.archiveSnapshot.peakEra}</dt>
                <dd>{peakYear?.year ?? '—'}</dd>
              </div>
            </dl>

            <div className="nova-hero__actions">
              <button type="button" onClick={handleEnter} className="nova-hero__cta nova-hero__cta--primary">
                <LibraryBig className="h-5 w-5" aria-hidden="true" />
                <span>{t.hero.enter}</span>
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              </button>
              <button type="button" onClick={onUpload} className="nova-hero__cta nova-hero__cta--secondary">
                <FileUp className="h-5 w-5" aria-hidden="true" />
                <span>{t.heroSection.paths.uploadButton}</span>
              </button>
            </div>

            <div className="nova-hero__utility-links">
              <button type="button" onClick={handleLaunchAssistant} className="nova-hero__assistant-link">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>{copy.assistantLink}</span>
                <span aria-hidden="true">↗</span>
              </button>
              <CreatorCvLink lang={lang} variant="hero" />
            </div>
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.94, x: visualEntranceX }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.8, delay: shouldReduceMotion ? 0 : 0.2 }}
            className="nova-hero__visual"
          >
            <div className="nova-hero__orbit nova-hero__orbit--outer" aria-hidden="true" />
            <div className="nova-hero__orbit nova-hero__orbit--inner" aria-hidden="true" />
            <span className="nova-hero__visual-index" aria-hidden="true">NML / 01</span>

            <div
              className="nova-hero__constellation"
              role="group"
              aria-label={copy.constellationLabel}
              data-testid="hero-artist-constellation"
            >
              {constellationArtists.map((artist, index) => (
                <button
                  key={artist.name}
                  type="button"
                  className={`nova-hero__satellite nova-hero__satellite--${index + 1}`}
                  onClick={() => handleOpenArtist(artist.name)}
                  aria-label={onOpenArtist
                    ? copy.openArtist(artist.name)
                    : copy.playSignature(artist.name)}
                >
                  {/* Eager on purpose. The satellites sit above the fold but
                      drift on an 11s float animation, and a lazy image the
                      browser defers never fires load - useImageLoadTimeout then
                      retires it to a generated avatar after 7s. On a cold cache
                      that silently stripped faces off the first screen a
                      visitor ever sees. */}
                  <ArtistAvatar
                    name={artist.name}
                    size={96}
                    tooltip={false}
                    overrideSrc={artist.imageUrl}
                    priority
                    fallbackToGallery={false}
                  />
                  <span className="nova-hero__satellite-name">
                    <bdi dir="auto">{artist.name}</bdi>
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => topArtist ? handleOpenArtist(topArtist.name) : triggerCorePulse('open')}
              className={'nova-hero__artist-focus' + (isCorePulsing ? ' is-pulsing' : '')}
              aria-label={topArtist
                ? onOpenArtist
                  ? `${copy.openArtist(topArtist.name)} · ${copy.playSignature(topArtist.name)}`
                  : copy.playSignature(topArtist.name)
                : copy.playSignature('Nova Music Lab')}
            >
              <span className="nova-hero__portrait">
                {topArtist && topArtistPortraitUrl ? (
                  <ArtistAvatar
                    name={topArtist.name}
                    size={320}
                    tooltip={false}
                    overrideSrc={topArtistPortraitUrl}
                    priority
                    fallbackToGallery={false}
                  />
                ) : (
                  <NovaMark size={160} />
                )}
              </span>
              <span className="nova-hero__scan" aria-hidden="true" />
              <span className="nova-hero__pulse-control" aria-hidden="true">
                <Play className="h-5 w-5 fill-current" />
              </span>
            </button>

            <div className="nova-hero__artist-caption">
              <span>{t.heroSection.archiveSnapshot.topArtist}</span>
              <strong><bdi dir="auto">{topArtist?.name ?? t.heroSection.archiveSnapshot.unknown}</bdi></strong>
              <small>
                {topArtist
                  ? t.heroSection.archiveSnapshot.topArtistDetail(fmtNum(topArtist.plays))
                  : t.heroSection.archiveSnapshot.pending}
              </small>
            </div>

            {topTrack && (
              <div className="nova-hero__track-note">
                <CoverArt artist={topTrack.artist} title={topTrack.title} kind="track" size={42} />
                <span>
                  <small>{t.heroSection.archiveSnapshot.topTrack}</small>
                  <strong><bdi dir="auto">{topTrack.title}</bdi></strong>
                </span>
              </div>
            )}

            {constellationArtists.length > 0 && (
              <p className="nova-hero__constellation-source" dir="auto">
                {copy.constellationSource}
              </p>
            )}
          </motion.div>
        </div>

        <div className="nova-hero__scroll-note" aria-hidden="true">
          <span>{copy.scrollNote}</span>
          <i />
        </div>
      </div>

      <NovaReleaseStory lang={lang} />

      <div className="nova-hero__deep relative z-10" data-testid="hero-deep-archive">
        <div className="nova-hero__section-heading">
          <span>{copy.archiveIntelligence}</span>
          <h2>{t.heroSection.archiveTitle}</h2>
          <p>{t.heroSection.archiveSubtitle}</p>
        </div>

        <div className="nova-hero__deep-grid">
          {aiMusicProfile && (
            <article className="nova-hero__panel nova-hero__dossier">
              <div className="nova-hero__panel-kicker">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>{copy.offlineReading}</span>
              </div>
              <h3 dir="auto">{aiMusicProfile.title}</h3>
              <p dir="auto">{aiMusicProfile.report}</p>
              <button type="button" onClick={handleLaunchAssistant} className="nova-hero__panel-action">
                {copy.launchConsole}
                <span className="nova-mirror-rtl" aria-hidden="true">→</span>
              </button>
            </article>
          )}

          {sourceTelemetry.rawEvents > 0 && (
            <article className="nova-hero__panel nova-hero__telemetry">
              <div className="nova-hero__panel-header">
                <div className="nova-hero__panel-kicker">
                  <Database className="h-4 w-4" aria-hidden="true" />
                  <span>{t.heroSection.telemetry.title}</span>
                </div>
                <span className="nova-hero__panel-badge">{t.heroSection.telemetry.badge}</span>
              </div>

              <div
                className="nova-data-ltr nova-hero__source-bar"
                dir="ltr"
                role="img"
                aria-label={t.heroSection.telemetry.barAria + ': ' + sourceTelemetry.segments
                  .map((segment) => SOURCE_PLATFORM_VISUALS[segment.id].label + ' ' + segment.sharePct.toFixed(1) + '%')
                  .join(', ')}
              >
                {sourceTelemetry.segments.map((segment) => {
                  const visual = SOURCE_PLATFORM_VISUALS[segment.id];
                  return (
                    <span
                      key={segment.id}
                      data-testid={'source-segment-' + segment.id}
                      aria-hidden="true"
                      style={{
                        width: segment.sharePct + '%',
                        background: 'linear-gradient(to right, ' + visual.from + ', ' + visual.to + ')',
                        boxShadow: '0 0 8px ' + visual.from,
                      }}
                    />
                  );
                })}
              </div>

              <div className="nova-data-ltr nova-hero__source-legend" dir="ltr">
                {sourceTelemetry.segments.map((segment) => {
                  const visual = SOURCE_PLATFORM_VISUALS[segment.id];
                  return (
                    <div key={segment.id}>
                      <i style={{ backgroundColor: visual.from, boxShadow: '0 0 6px ' + visual.from }} />
                      <span><bdi dir="ltr">{visual.label}</bdi></span>
                      <strong className="nova-number-ltr">{fmtNum(segment.plays)}</strong>
                      <small>{segment.sharePct.toFixed(1)}%</small>
                    </div>
                  );
                })}
              </div>

              <dl className="nova-hero__telemetry-totals">
                <div>
                  <dt>{t.heroSection.telemetry.rawInputLabel}</dt>
                  <dd>{fmtNum(sourceTelemetry.rawEvents)} {t.heroSection.telemetry.eventsUnit}</dd>
                </div>
                <div>
                  <dt>{t.heroSection.telemetry.skipsLabel}</dt>
                  <dd>{fmtNum(sourceSummary.spotify_skips)} {t.heroSection.telemetry.eventsUnit}</dd>
                </div>
                <div>
                  <dt>{t.heroSection.telemetry.countedLabel}</dt>
                  <dd>{fmtNum(sourceSummary.merged_plays)} {t.heroSection.telemetry.listensUnit}</dd>
                </div>
              </dl>
            </article>
          )}
        </div>

        <div className="nova-hero__archive-grid">
          {archiveCards.map(({ icon: Icon, accent, label, value, detail, art }) => (
            <article key={label} className="nova-hero__archive-card" style={{ '--archive-accent': accent } as React.CSSProperties}>
              <div className="nova-hero__archive-label">
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </div>
              <div className="nova-hero__archive-value">
                {art && <span>{art}</span>}
                <strong><bdi dir="auto">{value}</bdi></strong>
              </div>
              <p dir="auto">{detail}</p>
            </article>
          ))}
        </div>

        <div className="nova-hero__metric-grid">
          {coreStatCards.map(({ icon: Icon, color, label, val, d }) => (
            <div key={label} className="nova-hero__metric">
              <Icon className={'h-5 w-5 ' + color} aria-hidden="true" />
              <span>{label}</span>
              <strong>
                <CountUp
                  target={val}
                  duration={shouldReduceMotion ? 0 : 1.3}
                  delay={shouldReduceMotion ? 0 : d - 0.7}
                />
              </strong>
            </div>
          ))}
        </div>

        <footer className="nova-hero__sources">
          <p>{t.heroSection.ctaSupport}</p>
          <div>
            {t.heroSection.supportedSources.map(source => <span key={source}>{source}</span>)}
          </div>
        </footer>
      </div>

      {isWarping && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
          className="nova-hero__warp fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
          aria-live="polite"
        >
          <motion.div
            initial={shouldReduceMotion ? false : { scale: 0.25, opacity: 0 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { scale: 3.5, opacity: [0, 1, 0] }}
            transition={{ duration: shouldReduceMotion ? 0 : 1.15, ease: 'easeIn' }}
            className="nova-hero__warp-ring"
            aria-hidden="true"
          />
          <div className="nova-hero__warp-copy">
            <span className="nova-hero__live-dot" aria-hidden="true" />
            <strong>{copy.initializing}</strong>
            <small>{copy.decryptingAtlas(archiveYearSpan)}</small>
          </div>
        </motion.div>
      )}
    </section>
  );
}
