import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Database,
  Disc,
  FileUp,
  Headphones,
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
import ArtistAvatar from './ArtistAvatar';
import CoverArt from './CoverArt';
import CreatorCvLink from './CreatorCvLink';
import NovaMark from './NovaMark';
import { paintMoodArt } from './MoodArtCanvas';
import { buildCoreEmotionalMapProfile } from '../engines/moodCore';
import { buildArchetypes } from '../utils/identityEngine';
import { deriveSourceSummary, getSourceTelemetry, type SourceTelemetryId } from '../utils/analytics';
import { localeFor, pickLanguage, type Lang } from '../utils/i18n';
import './HeroSection.css';

interface HeroSectionProps {
  data: MusicDnaData;
  onEnter: () => void;
  onUpload: () => void;
  /** Distinguishes an uploaded/restored archive from the bundled demo museum. */
  isPersonalArchive?: boolean;
  /** Opens the AI Assistant tab; the welcome card's "Launch Chat Console" CTA needs it. */
  onOpenAssistant?: () => void;
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
  peakYear: number;
  sourceSentence: string;
}

interface HeroLocalCopy {
  sourceOverlap: string;
  personalBadge: (years: number) => string;
  personalSubtitle: string;
  personalSupport: string;
  personalOwner: string;
  fallbackArchetype: string;
  mergedSource: (matchRate: number) => string;
  singleSource: (source: string) => string;
  profileTitle: (owner: string, genre: string) => string;
  profileReport: (input: HeroProfileReportInput) => string;
  archiveHighlights: string;
  assistantLink: string;
  playSignature: (artist: string) => string;
  scrollNote: string;
  archiveIntelligence: string;
  offlineReading: string;
  launchConsole: string;
  initializing: string;
  decryptingAtlas: (years: number) => string;
}

const bidiIsolate = (value: string | number) => `\u2068${value}\u2069`;

const HERO_LOCAL_COPY: Record<Lang, HeroLocalCopy> = {
  es: {
    sourceOverlap: 'solapamiento de canciones entre fuentes',
    personalBadge: years => `✨ ${years} ${years === 1 ? 'Año' : 'Años'} en Tu Archivo`,
    personalSubtitle: '✧ Tu Universo Musical ✧',
    personalSupport: 'Tu archivo está listo para explorar. Añade más datos cuando quieras; todo permanece privado y local en este navegador.',
    personalOwner: 'TU ARCHIVO',
    fallbackArchetype: 'Explorador Sónico',
    mergedSource: matchRate => `Fuente del archivo: exportaciones combinadas. El ${matchRate}% de las canciones normalizadas aparece en más de una fuente.`,
    singleSource: source => `Fuente del archivo: ${source}; este archivo no afirma un solapamiento entre fuentes.`,
    profileTitle: (owner, genre) => `EXPEDIENTE DE MÚSICA IA: ${owner} [CLASE ${genre.toUpperCase()}]`,
    profileReport: input => `La auditoría neural de tu biblioteca revela una firma sonora altamente estructurada. A lo largo de ${input.scrobbles} reproducciones y ${input.hours} horas, tu perfil resuena bajo el arquetipo "${input.archetype}". Tu espectro emocional está dominado por la resonancia "${input.mood}" (intensidad ${input.moodPercentage}%). En el núcleo de tu biblioteca destaca ${input.topArtist}, representando tu obsesión principal con ${input.topArtistPlays} scrobbles. La era pico se centra en ${input.peakYear}. ${input.sourceSentence}`,
    archiveHighlights: 'Destacados del archivo',
    assistantLink: 'Abrir tu expediente musical IA',
    playSignature: artist => `Reproducir la firma sonora de ${artist}`,
    scrollNote: 'El archivo continúa',
    archiveIntelligence: 'Inteligencia del archivo',
    offlineReading: 'Lectura IA offline',
    launchConsole: 'Iniciar Consola de Chat',
    initializing: 'INICIALIZANDO INTERFAZ NEURAL',
    decryptingAtlas: years => `DESCIFRANDO ATLAS DE ${years} ${years === 1 ? 'AÑO' : 'AÑOS'}…`,
  },
  en: {
    sourceOverlap: 'cross-source track overlap',
    personalBadge: years => `✨ ${years} ${years === 1 ? 'Year' : 'Years'} in Your Archive`,
    personalSubtitle: '✧ Your Musical Universe ✧',
    personalSupport: 'Your archive is ready to explore. Add more files whenever you want; everything stays private and local in this browser.',
    personalOwner: 'YOUR ARCHIVE',
    fallbackArchetype: 'Sonic Explorer',
    mergedSource: matchRate => `Archive source: merged exports. ${matchRate}% of normalized tracks overlap across those sources.`,
    singleSource: source => `Archive source: ${source}; no cross-source overlap is claimed for this archive.`,
    profileTitle: (owner, genre) => `AI MUSIC PROFILE: ${owner} [${genre.toUpperCase()} CLASS]`,
    profileReport: input => `Neural audit of your library reveals a highly structured sonic signature. Across ${input.scrobbles} plays and ${input.hours} hours, your profile resonates with the "${input.archetype}" archetype. Your emotional spectrum is dominated by "${input.mood}" resonance (intensity ${input.moodPercentage}%). At the core of your listening stands ${input.topArtist}, representing your primary obsession with ${input.topArtistPlays} scrobbles. The peak era centers on ${input.peakYear}. ${input.sourceSentence}`,
    archiveHighlights: 'Archive highlights',
    assistantLink: 'Open your AI music dossier',
    playSignature: artist => `Play the sonic signature of ${artist}`,
    scrollNote: 'The archive continues',
    archiveIntelligence: 'Archive intelligence',
    offlineReading: 'Offline AI reading',
    launchConsole: 'Launch Chat Console',
    initializing: 'INITIALIZING NEURAL INTERFACE',
    decryptingAtlas: years => `DECRYPTING ${years}-YEAR ATLAS…`,
  },
  he: {
    sourceOverlap: 'חפיפה בין שירים ממקורות שונים',
    personalBadge: years => years === 1 ? '✨ שנה אחת בארכיון שלך' : `✨ ${years} שנים בארכיון שלך`,
    personalSubtitle: '✧ היקום המוזיקלי שלך ✧',
    personalSupport: 'הארכיון שלך מוכן לחקירה. תוכל להוסיף קבצים נוספים מתי שתרצה; הכול נשאר פרטי ומקומי בדפדפן הזה.',
    personalOwner: 'הארכיון שלך',
    fallbackArchetype: 'החוקר הצלילי',
    mergedSource: matchRate => `מקור הארכיון: ייצואים משולבים. ${bidiIsolate(`${matchRate}%`)} מהשירים המנורמלים חופפים בין המקורות האלה.`,
    singleSource: source => `מקור הארכיון: ${bidiIsolate(source)}; הארכיון הזה אינו טוען לחפיפה בין מקורות.`,
    profileTitle: (owner, genre) => `פרופיל מוזיקלי מבוסס בינה מלאכותית: ${bidiIsolate(owner)} [סיווג ${bidiIsolate(genre)}]`,
    profileReport: input => `הניתוח העצבי של הספרייה שלך חושף חתימה צלילית מובנית ומובהקת. לאורך ${bidiIsolate(input.scrobbles)} השמעות ו־${bidiIsolate(input.hours)} שעות, הפרופיל שלך מהדהד עם הארכיטיפ „${bidiIsolate(input.archetype)}”. בספקטרום הרגשי שלך שולטת התהודה „${bidiIsolate(input.mood)}” בעוצמה של ${bidiIsolate(`${input.moodPercentage}%`)}. בלב ההאזנה שלך ניצב ${bidiIsolate(input.topArtist)}, האובססיה המרכזית שלך עם ${bidiIsolate(input.topArtistPlays)} השמעות. תקופת השיא מתמקדת בשנת ${bidiIsolate(input.peakYear)}. ${input.sourceSentence}`,
    archiveHighlights: 'נקודות השיא של הארכיון',
    assistantLink: 'פתח את תיק המוזיקה שלך מבוסס הבינה המלאכותית',
    playSignature: artist => `נגן את החתימה הצלילית של ${bidiIsolate(artist)}`,
    scrollNote: 'הארכיון ממשיך',
    archiveIntelligence: 'המודיעין של הארכיון',
    offlineReading: 'ניתוח בינה מלאכותית מקומי',
    launchConsole: 'פתח את מסוף הצ׳אט',
    initializing: 'אתחול הממשק העצבי',
    decryptingAtlas: years => years === 1 ? 'מפענח אטלס של שנה אחת…' : `מפענח אטלס של ${years} שנים…`,
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
  onOpenAssistant,
}: HeroSectionProps) {
  const metrics = data?.core_metrics || EMPTY_METRICS;
  const topArtist = data?.top_artists?.[0];
  const topTrack = data?.top_tracks?.[0];
  const { t, lang } = useApp();
  const shouldReduceMotion = Boolean(useReducedMotion());
  const locale = localeFor(lang);
  const copy = pickLanguage(lang, HERO_LOCAL_COPY);
  const fmtNum = useCallback((num: number) => num.toLocaleString(locale), [locale]);
  const visualEntranceX = pickLanguage(lang, { es: 24, en: 24, he: -24 });

  // Peak year calculation helper
  const peakYear = useMemo(() => {
    if (!data?.yearly_eras || data.yearly_eras.length === 0) return null;
    return [...data.yearly_eras].sort((a, b) => b.plays - a.plays)[0];
  }, [data?.yearly_eras]);

  const archiveYearSpan = useMemo(() => {
    const years = (data?.yearly_eras ?? [])
      .filter((era) => era.plays > 0)
      .map((era) => era.year);
    if (years.length < 2) return 1;
    return Math.max(1, Math.max(...years) - Math.min(...years));
  }, [data?.yearly_eras]);

  // Derive source summary details
  const sourceSummary = useMemo(() => deriveSourceSummary(data), [data]);
  const sourceTelemetry = useMemo(() => getSourceTelemetry(sourceSummary), [sourceSummary]);

  const sourceLabel = t.heroSection.sourceLabels[sourceSummary.source_type];

  const introCopy = isPersonalArchive
    ? {
        badge: copy.personalBadge(archiveYearSpan),
        subtitle: copy.personalSubtitle,
        support: copy.personalSupport,
      }
    : {
        badge: t.heroSection.badge,
        subtitle: t.heroSection.subtitle,
        support: t.heroSection.ctaSupport,
      };

  const dossierOwner = isPersonalArchive
    ? copy.personalOwner
    : 'KEVIN CUSNIR';

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
  // anchor portrait on the critical render path. Paint a smaller static image
  // after the first frame instead of synchronously encoding a 1440x900 canvas
  // during React render.
  const [heroArtUrl, setHeroArtUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setHeroArtUrl(null);

    const frame = window.requestAnimationFrame(() => {
      const width = 960;
      const height = 600;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      paintMoodArt(ctx, width, height, dominantMood.key, `hero::${topArtist?.name ?? 'nova'}`);
      const artUrl = canvas.toDataURL('image/png');
      if (!cancelled) setHeroArtUrl(artUrl);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [dominantMood.key, topArtist?.name]);

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
    const topGenre = topArtist.genre || data?.top_genres?.[0]?.name || 'Alternative';
    const moodLabel = dominantMood.name;
    const archetype = heroArchetype;
    const sourceProvenanceSentence = sourceSummary.source_type === 'merged'
      ? copy.mergedSource(metrics.match_rate_pct)
      : copy.singleSource(sourceLabel);
    const genreClass = topGenre.split(' / ')[0];
    const reportInput: HeroProfileReportInput = {
      scrobbles: fmtNum(scrobbles),
      hours: fmtNum(hours),
      archetype,
      mood: moodLabel,
      moodPercentage: Math.round(dominantMood.percentage),
      topArtist: topArtist.name,
      topArtistPlays: fmtNum(topArtist.plays),
      peakYear: peakYear?.year || 2026,
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

  const playCorePulseAudio = () => {
    if (isCorePulsing) return;
    setIsCorePulsing(true);
    setTimeout(() => setIsCorePulsing(false), 1600);

    try {
      const AudioContextCtor = window.AudioContext
        ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      const ctx = new AudioContextCtor();
      
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      // Ambient slow attack swell
      masterGain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 0.28);
      // Smooth organic exponential release decay
      masterGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
      masterGain.connect(ctx.destination);
      
      // Cosmic space chord: C3 (130.81), G3 (196.00), D4 (293.66), G4 (392.00)
      const freqs = [130.81, 196.00, 293.66, 392.00];
      
      // Sweeping resonant lowpass filter for an analog synth pad feel
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.Q.setValueAtTime(1.8, ctx.currentTime);
      lowpass.frequency.setValueAtTime(120, ctx.currentTime);
      lowpass.frequency.exponentialRampToValueAtTime(950, ctx.currentTime + 0.45);
      lowpass.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 1.4);
      lowpass.connect(masterGain);

      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, ctx.currentTime);

        // Detuning for a rich unison/chorus depth effect
        osc.detune.setValueAtTime(idx === 0 ? -6 : idx === 2 ? 7 : 0, ctx.currentTime);

        osc.connect(lowpass);
        osc.start();
        osc.stop(ctx.currentTime + 1.5);
      });

      // Each click creates a fresh context; release it once the chord decays
      // or repeated clicks pile up live AudioContexts for the whole session.
      setTimeout(() => { ctx.close().catch(() => {}); }, 1700);
    } catch (e) {
      console.warn("Audio Context blocked or Web Audio not supported in environment:", e);
    }
  };

  const handleEnter = () => {
    setIsWarping(true);
    playCorePulseAudio();
    setTimeout(onEnter, shouldReduceMotion ? 0 : 1200);
  };

  // Same warp-out ritual, but landing on the AI Assistant tab the welcome
  // card promises - not the generic dashboard.
  const handleLaunchAssistant = () => {
    if (!onOpenAssistant) return handleEnter();
    setIsWarping(true);
    playCorePulseAudio();
    setTimeout(onOpenAssistant, shouldReduceMotion ? 0 : 1200);
  };

  return (
    <section className="nova-hero relative min-h-screen overflow-hidden text-[var(--fg)]" aria-labelledby="nova-hero-title">
      {heroArtUrl && (
        <div
          className="nova-hero__mood-art absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{ backgroundImage: 'url(' + heroArtUrl + ')' }}
        />
      )}
      <div className="nova-hero__aurora nova-hero__aurora--cyan" aria-hidden="true" />
      <div className="nova-hero__aurora nova-hero__aurora--pink" aria-hidden="true" />
      <div className="nova-hero__grid absolute inset-0 pointer-events-none" aria-hidden="true" />
      {!shouldReduceMotion && <AnimatedParticles count={24} intensity="subtle" />}

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
              <span>NOVA</span>
              <span className="nova-hero__title-accent">MUSIC LAB</span>
            </h1>

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

            <button
              type="button"
              onClick={playCorePulseAudio}
              className={'nova-hero__artist-focus' + (isCorePulsing ? ' is-pulsing' : '')}
              aria-label={copy.playSignature(topArtist?.name ?? 'Nova Music Lab')}
            >
              <span className="nova-hero__portrait">
                {topArtist ? (
                  <ArtistAvatar name={topArtist.name} size={320} tooltip={false} priority />
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
          </motion.div>
        </div>

        <div className="nova-hero__scroll-note" aria-hidden="true">
          <span>{copy.scrollNote}</span>
          <i />
        </div>
      </div>

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
