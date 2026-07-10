import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
import { paintMoodArt } from './MoodArtCanvas';
import { buildEmotionalMapEngineProfile } from '../engines/emotionalEngine';
interface HeroSectionProps {
  data: MusicDnaData;
  onEnter: () => void;
  onUpload: () => void;
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

/** Count-up using native requestAnimationFrame — reliable across React versions */
function CountUp({ target, duration = 1.8, delay = 0 }: { target: number; duration?: number; delay?: number }) {
  return <CountUpCmp target={target} duration={duration} delay={delay} />;
}

export default function HeroSection({ data, onEnter, onUpload, onOpenAssistant }: HeroSectionProps) {
  const metrics = data?.core_metrics || EMPTY_METRICS;
  const topArtist = data?.top_artists?.[0];
  const topTrack = data?.top_tracks?.[0];
  const { t, lang } = useApp();
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  const fmtNum = (num: number) => num.toLocaleString(locale);

  // Peak year calculation helper
  const peakYear = useMemo(() => {
    if (!data?.yearly_eras || data.yearly_eras.length === 0) return null;
    return [...data.yearly_eras].sort((a, b) => b.plays - a.plays)[0];
  }, [data?.yearly_eras]);

  // Derive source summary details
  const sourceSummary = useMemo(() => {
    return data.source_summary || {
      source_type: 'unknown',
      lastfm_plays: 0,
      spotify_plays: 0,
      youtube_plays: 0,
      apple_music_plays: 0,
      listenbrainz_plays: 0,
      merged_plays: 0,
      spotify_skips: 0,
      spotify_skip_rate_pct: 0,
      spotify_short_plays: 0,
      spotify_short_play_rate_pct: 0,
      overlap_unique_tracks: 0,
      source_note: '',
    };
  }, [data?.source_summary]);

  const sourceLabel = (t.heroSection.sourceLabels as any)[sourceSummary.source_type] ?? t.heroSection.sourceLabels.unknown;

  const dominantMood = useMemo(() => {
    const list = data?.top_artists || [];
    const profile = buildEmotionalMapEngineProfile(list, 24);
    const mood = profile.dominantMood;
    const name = lang === 'en' ? mood.title.en : mood.title.es;
    const percentage = profile.distribution[0]?.pct || 100;
    return {
      key: mood.key,
      name,
      percentage,
    };
  }, [data?.top_artists, lang]);

  // Painted once to a static data URL: a live full-viewport canvas layer is
  // needlessly expensive to composite; a background-image costs nothing.
  const heroArtUrl = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1440;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    paintMoodArt(ctx, 1440, 900, dominantMood.key as any, `hero::${topArtist?.name ?? 'nova'}`);
    return canvas.toDataURL('image/png');
  }, [dominantMood.key, topArtist?.name]);

  // Custom offline AI dossier compiler
  const aiMusicProfile = useMemo(() => {
    if (!topArtist) return null;
    const scrobbles = metrics.total_plays;
    const hours = metrics.listening_hours;
    const topGenre = topArtist.genre || data?.top_genres?.[0]?.name || 'Alternative';
    const moodLabel = dominantMood.name;
    const archetype = data?.archetypes?.[0]?.name || (lang === 'en' ? 'Sonic Explorer' : 'Explorador Sónico');
    
    if (lang === 'en') {
      return {
        title: `AI MUSIC PROFILE: KEVIN CUSNIR [${topGenre.toUpperCase().split(' / ')[0]} CLASS]`,
        report: `Neural audit of your library reveals a highly structured sonic signature. Across ${scrobbles.toLocaleString()} plays and ${hours.toLocaleString()} hours, your profile resonates with the "${archetype}" archetype. Your emotional spectrum is dominated by "${moodLabel}" resonance (intensity ${Math.round(dominantMood.percentage)}%). At the core of your listening stands ${topArtist.name}, representing your primary obsession with ${topArtist.plays} scrobbles. Current peak era centered around ${peakYear?.year || 2026} with a ${metrics.match_rate_pct}% data sync integrity.`
      };
    } else {
      return {
        title: `EXPEDIENTE DE MÚSICA IA: KEVIN CUSNIR [CLASE ${topGenre.toUpperCase().split(' / ')[0]}]`,
        report: `La auditoría neural de tu biblioteca revela una firma sonora altamente estructurada. A lo largo de ${scrobbles.toLocaleString()} reproducciones y ${hours.toLocaleString()} horas, tu perfil resuena bajo el arquetipo "${archetype}". Tu espectro emocional está dominado por la resonancia "${moodLabel}" (intensidad ${Math.round(dominantMood.percentage)}%). En el núcleo de tu biblioteca destaca ${topArtist.name}, representando tu obsesión principal con ${topArtist.plays} scrobbles. La era pico se centra en el año ${peakYear?.year || 2026} con un ${metrics.match_rate_pct}% de integridad de datos.`
      };
    }
  }, [data, metrics, topArtist, dominantMood, lang, peakYear]);

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
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
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
    setTimeout(onEnter, 1200);
  };

  // Same warp-out ritual, but landing on the AI Assistant tab the welcome
  // card promises - not the generic dashboard.
  const handleLaunchAssistant = () => {
    if (!onOpenAssistant) return handleEnter();
    setIsWarping(true);
    playCorePulseAudio();
    setTimeout(onOpenAssistant, 1200);
  };

  const productPaths = [
    {
      icon: LibraryBig,
      title: t.heroSection.paths.kevinTitle,
      body: t.heroSection.paths.kevinBody,
      button: t.hero.enter,
      color: 'var(--c1)',
      action: handleEnter,
      primary: true,
    },
    {
      icon: FileUp,
      title: t.heroSection.paths.uploadTitle,
      body: t.heroSection.paths.uploadBody,
      button: t.heroSection.paths.uploadButton,
      color: 'var(--c2)',
      action: onUpload,
      primary: false,
    },
  ];

  return (
    <section className="relative min-h-screen flex flex-col justify-start items-center px-4 sm:px-6 py-8 md:py-10 text-center select-none overflow-hidden">
      {/* Generative backdrop */}
      {heroArtUrl && (
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${heroArtUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            mixBlendMode: 'screen',
          }}
        />
      )}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-cyberCyan/10 blur-[120px] animate-cloud-1 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-cyberPink/10 blur-[120px] animate-cloud-2 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-cyberPurple/5 blur-[80px] pointer-events-none" />

      {/* Ambient Flowing Circuit Pathways */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-[0.22]">
        <svg className="w-full h-full text-cyberCyan/20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="circuit-grad-left" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="var(--c1)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <linearGradient id="circuit-grad-right" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="var(--c2)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          
          {/* Left Circuit Path */}
          <path 
            d="M 20,80 L 150,80 L 220,150 L 220,550 L 150,620 L -20,620" 
            fill="none" 
            stroke="url(#circuit-grad-left)" 
            strokeWidth="1.5" 
            strokeDasharray="20 180"
          >
            <animate attributeName="stroke-dashoffset" values="400;0" dur="8s" repeatCount="indefinite" />
          </path>
          <path 
            d="M 20,80 L 150,80 L 220,150 L 220,550 L 150,620 L -20,620" 
            fill="none" 
            stroke="var(--c1)" 
            strokeWidth="0.75" 
            opacity="0.35"
          />

          {/* Right Circuit Path */}
          <path 
            d="M 1200,80 L 1050,80 L 980,150 L 980,550 L 1050,620 L 1220,620" 
            fill="none" 
            stroke="url(#circuit-grad-right)" 
            strokeWidth="1.5" 
            strokeDasharray="20 180"
          >
            <animate attributeName="stroke-dashoffset" values="400;0" dur="7s" repeatCount="indefinite" />
          </path>
          <path 
            d="M 1200,80 L 1050,80 L 980,150 L 980,550 L 1050,620 L 1220,620" 
            fill="none" 
            stroke="var(--c2)" 
            strokeWidth="0.75" 
            opacity="0.35"
          />
        </svg>
      </div>

      {/* Floating Left Telemetry Column (Desktop only) */}
      <div className="hidden xl:block absolute left-8 top-1/4 space-y-5 font-mono text-[8px] text-gray-500 text-left pointer-events-none select-none z-10">
        <div className="space-y-1.5 border-l-2 border-cyberCyan/35 pl-2.5">
          <p className="text-cyberCyan font-black tracking-widest">DECRYPT_STREAM // OK</p>
          <p>BUFFER_INDEX: 0x8F3C</p>
          <p>LATENCY: 14ms</p>
          <p>BITRATE: 1411kbps</p>
        </div>
        <div className="space-y-1.5 border-l border-gray-800 pl-2.5">
          <p className="text-gray-400">AUDIO_CODEC: FLAC</p>
          <p>SAMPLING: 44.1kHz</p>
          <p>CHANNELS: 2.0 L/R</p>
        </div>
      </div>

      {/* Floating Right Telemetry Column (Desktop only) */}
      <div className="hidden xl:block absolute right-8 top-1/4 space-y-5 font-mono text-[8px] text-gray-500 text-right pointer-events-none select-none z-10">
        <div className="space-y-1.5 border-r-2 border-cyberPink/35 pr-2.5">
          <p className="text-cyberPink font-black tracking-widest">ANALYZER_CORE // ENGAGED</p>
          <p>DEDUPLICATION: SIGMA_9</p>
          <p>MERGE_RATE: {metrics.match_rate_pct}%</p>
          <p>INTEGRITY: SECURE</p>
        </div>
        <div className="space-y-1.5 border-r border-gray-800 pr-2.5">
          <p className="text-gray-400">DECADE_SPAN: 11_YEARS</p>
          <p>SCROBBLES: {metrics.total_plays.toLocaleString()}</p>
          <p>ANCHOR: {topArtist?.name?.toUpperCase()}</p>
        </div>
      </div>

      {/* 60 animated particles with shapes and glow */}
      <AnimatedParticles count={60} intensity="medium" />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="z-10 w-full max-w-6xl space-y-5 md:space-y-6"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full border border-cyberCyan/30 bg-cyberCyan/5 text-xs font-mono font-bold text-[var(--fg)] tracking-wider uppercase animate-pulse-slow"
        >
          <span>{t.heroSection.badge}</span>
          <span className="w-1.5 h-1.5 bg-cyberCyan rounded-full" />
          <span>{sourceLabel}</span>
        </motion.div>

        {/* Title & Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-center gap-3 text-[8.5px] font-mono text-gray-500 uppercase tracking-[0.25em] mb-1">
            <span className="w-8 h-[1px] bg-cyberCyan/20" />
            <span>SYS_LINK: ACTIVE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyberCyan animate-ping" />
            {/* Deliberately no city here: this page may end up on a public
                Pages deploy - country-level flavor only. */}
            <span>LOC: ISRAEL // UTC+3</span>
            <span className="w-8 h-[1px] bg-cyberPink/20" />
          </div>
          <h1 className="text-5xl md:text-8xl font-extrabold tracking-tight leading-none">
            <span className="bg-gradient-to-r from-[var(--fg)] via-[var(--c1)] to-[var(--c2)] bg-clip-text text-transparent animate-flow-gradient">
              NOVA MUSIC LAB
            </span>
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold font-mono text-cyberBlue/90 tracking-wide text-neon-glow">
            {t.heroSection.subtitle}
          </h2>
        </motion.div>

        {/* Holographic Spectrum Analyzer Deck */}
        {topArtist && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex justify-center py-4 relative pointer-events-auto"
          >
            <motion.div 
              whileHover={{ scale: 1.03, filter: 'brightness(1.1)' }}
              onClick={playCorePulseAudio}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative w-full max-w-md glass-panel p-5 rounded-3xl border border-cyberCyan/35 shadow-[0_0_30px_rgba(0,242,254,0.06)] flex items-center gap-5 cursor-pointer group"
              style={{
                borderColor: 'rgba(0, 242, 254, 0.22)',
                background: 'linear-gradient(135deg, rgba(10, 25, 47, 0.5) 0%, rgba(10, 25, 47, 0.8) 100%)',
              }}
            >
              {/* Corner HUD brackets for the deck */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyberCyan/35 group-hover:border-cyberCyan/90 group-hover:scale-105 transition-all duration-300 pointer-events-none" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyberCyan/35 group-hover:border-cyberCyan/90 group-hover:scale-105 transition-all duration-300 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyberCyan/35 group-hover:border-cyberCyan/90 group-hover:scale-105 transition-all duration-300 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyberCyan/35 group-hover:border-cyberCyan/90 group-hover:scale-105 transition-all duration-300 pointer-events-none" />

              {/* Left Column: Artist Avatar & Tech Status */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="relative w-18 h-18 rounded-2xl overflow-hidden p-0.5 border border-white/20 bg-slate-950/80 shadow-[0_0_15px_rgba(0,242,254,0.25)]">
                  <ArtistAvatar name={topArtist.name} size={68} tooltip={false} />
                  {/* Laser scan overlay */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                    <div className="absolute left-0 right-0 h-[1.5px] bg-cyberCyan opacity-50 shadow-[0_0_6px_#00f2fe] animate-laser-sweep" />
                  </div>
                </div>
                <span className="font-mono text-[7px] text-cyberCyan/70 uppercase tracking-widest font-bold">
                  {lang === 'en' ? 'Core Artist' : 'Artista Núcleo'}
                </span>
              </div>

              {/* Right Column: Title & Animated Equalizer Bars */}
              <div className="flex-1 min-w-0 flex flex-col justify-between h-20">
                {/* Text Metadata */}
                <div>
                  <h4 className="text-[9px] font-mono font-black text-cyberPink uppercase tracking-widest">
                    {lang === 'en' ? 'Spectrum Analyzer' : 'Analizador de Espectro'}
                  </h4>
                  <h3 className="text-base font-black text-white truncate mt-0.5 tracking-wide">
                    {topArtist.name}
                  </h3>
                  <p className="text-[8px] font-mono text-gray-400 mt-0.5">
                    {metrics.total_plays.toLocaleString()} plays • {lang === 'en' ? 'Anchor Node' : 'Nodo Ancla'}
                  </p>
                </div>

                {/* Pulsing Visualizer Bars (14 bands) */}
                <div className="flex items-end gap-1.5 h-8 mt-1.5 overflow-hidden">
                  {[...Array(14)].map((_, i) => {
                    const baseH = 8 + (i % 4) * 6 + Math.sin(i) * 5;
                    const h = isCorePulsing ? 32 : baseH;
                    return (
                      <motion.div
                        key={i}
                        animate={{ 
                          height: isCorePulsing ? [h, 4, h] : [h, h * 0.25, h] 
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: isCorePulsing ? 0.3 : 0.6 + (i % 3) * 0.15, 
                          ease: 'easeInOut',
                          delay: i * 0.02
                        }}
                        className="w-1.5 rounded-t-sm"
                        style={{
                          height: `${h}px`,
                          backgroundColor: isCorePulsing ? 'var(--c2)' : 'var(--c1)',
                          boxShadow: isCorePulsing ? '0 0 10px var(--c2)' : '0 0 7px var(--c1)',
                          transition: 'background-color 0.2s, box-shadow 0.2s, height 0.15s ease-out',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* AI Music Dossier Report Card */}
        {aiMusicProfile && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="w-full max-w-3xl mx-auto glass-panel p-6 rounded-3xl border text-left relative overflow-hidden"
            style={{
              borderColor: 'rgba(0, 242, 254, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 242, 254, 0.05)',
              borderLeft: '4px solid var(--c1)',
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyberCyan/5 blur-3xl rounded-full pointer-events-none" />
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4.5 h-4.5 text-cyberCyan animate-pulse" />
              <h3 className="text-xs font-mono font-black uppercase tracking-[0.25em] text-cyberCyan">
                {aiMusicProfile.title}
              </h3>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed font-sans font-light">
              {aiMusicProfile.report}
            </p>
          </motion.div>
        )}

        {/* Platform Ingestion Telemetry Bar */}
        {sourceSummary.merged_plays > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48, duration: 0.6 }}
            className="w-full max-w-3xl mx-auto glass-panel p-5 rounded-3xl border border-white/5 text-left relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%)',
              borderColor: 'rgba(0, 242, 254, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 242, 254, 0.05)',
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyberCyan/5 blur-3xl rounded-full pointer-events-none" />
            
            {/* Header */}
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyberCyan animate-pulse" />
                <h3 className="text-xs font-mono font-black uppercase tracking-[0.2em] text-white">
                  {lang === 'en' ? 'Ingested Sources Telemetry' : 'Telemetría de Fuentes Ingeridas'}
                </h3>
              </div>
              <span className="text-[9px] font-mono font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase">
                {lang === 'en' ? 'Unified Database' : 'Base de Datos Unificada'}
              </span>
            </div>

            {/* Stacked Progress Bar */}
            <div className="h-3.5 rounded-full bg-white/5 overflow-hidden flex border border-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
              {/* Spotify */}
              {sourceSummary.spotify_plays > 0 && (
                <div 
                  style={{ width: `${(sourceSummary.spotify_plays / sourceSummary.merged_plays) * 100}%` }}
                  className="h-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] relative group transition-all duration-500 shadow-[0_0_8px_#1DB954]"
                />
              )}
              {/* Last.fm */}
              {sourceSummary.lastfm_plays > 0 && (
                <div 
                  style={{ width: `${(sourceSummary.lastfm_plays / sourceSummary.merged_plays) * 100}%` }}
                  className="h-full bg-gradient-to-r from-[#d51007] to-[#e8334a] relative group transition-all duration-500 shadow-[0_0_8px_#d51007]"
                />
              )}
              {/* YouTube */}
              {sourceSummary.youtube_plays > 0 && (
                <div 
                  style={{ width: `${(sourceSummary.youtube_plays / sourceSummary.merged_plays) * 100}%` }}
                  className="h-full bg-gradient-to-r from-[#ff0000] to-[#ff4f4f] relative group transition-all duration-500 shadow-[0_0_8px_#ff0000]"
                />
              )}
            </div>

            {/* Badges and Counts */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-[10px] font-mono">
              {/* Spotify */}
              {sourceSummary.spotify_plays > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1DB954] shadow-[0_0_6px_#1DB954]" />
                  <span className="font-bold text-gray-300">Spotify:</span>
                  <span className="text-white font-black">{sourceSummary.spotify_plays.toLocaleString()}</span>
                  <span className="text-gray-400">({Math.round((sourceSummary.spotify_plays / sourceSummary.merged_plays) * 100)}%)</span>
                </div>
              )}
              
              {/* Last.fm */}
              {sourceSummary.lastfm_plays > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#e8334a] shadow-[0_0_6px_#e8334a]" />
                  <span className="font-bold text-gray-300">Last.fm:</span>
                  <span className="text-white font-black">{sourceSummary.lastfm_plays.toLocaleString()}</span>
                  <span className="text-gray-400">({Math.round((sourceSummary.lastfm_plays / sourceSummary.merged_plays) * 100)}%)</span>
                </div>
              )}

              {/* YouTube */}
              {sourceSummary.youtube_plays > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ff0000] shadow-[0_0_6px_#ff0000]" />
                  <span className="font-bold text-gray-300">YouTube Music:</span>
                  <span className="text-white font-black">{sourceSummary.youtube_plays.toLocaleString()}</span>
                  <span className="text-gray-400">({(sourceSummary.youtube_plays / sourceSummary.merged_plays * 100).toFixed(2)}%)</span>
                </div>
              )}
            </div>

            {/* Deduplication, Skips & Integrity */}
            <div className="mt-3.5 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-gray-400 leading-none">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/80 animate-pulse" />
                <span>
                  {lang === 'en' 
                    ? `Skipped play exclusions: ` 
                    : `Exclusiones por saltos de reproducción: `}
                </span>
                <strong className="text-yellow-500">{sourceSummary.spotify_skips.toLocaleString()} plays</strong>
              </span>
              <span>
                {lang === 'en' ? 'Deduplicated & Merged:' : 'Deduplicado y Combinado:'}{' '}
                <strong className="text-cyberCyan">{metrics.match_rate_pct}% integrity</strong>
              </span>
            </div>
          </motion.div>
        )}

        {/* CTA Actions */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex flex-col items-center justify-center gap-3 pt-1"
        >
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-3">
            {productPaths.map(({ icon: Icon, title, body, button, color, action, primary }) => (
              <button
                key={title}
                onClick={action}
                className="group glass-panel min-h-[156px] rounded-3xl border p-5 text-left transition-all hover:-translate-y-1 hover:shadow-cyber active:scale-[0.99]"
                style={{
                  borderColor: `${color}45`,
                  background: primary
                    ? `linear-gradient(135deg, ${color}1f, rgba(255,255,255,0.035))`
                    : `linear-gradient(135deg, rgba(255,255,255,0.045), ${color}18)`,
                }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
                    style={{ color, borderColor: `${color}55`, backgroundColor: `${color}16` }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-mono font-black uppercase tracking-widest text-white">
                      {title}
                    </span>
                    <span className="mt-2 block text-xs text-gray-400 leading-relaxed">
                      {body}
                    </span>
                  </span>
                </div>
                <span
                  className="mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-mono font-black uppercase tracking-widest transition-all group-hover:bg-white/10"
                  style={{ color, borderColor: `${color}55`, backgroundColor: `${color}12` }}
                >
                  {button}
                  {primary ? <Play className="w-3.5 h-3.5 fill-current" /> : <FileUp className="w-3.5 h-3.5" />}
                </span>
              </button>
            ))}
          </div>

          {/* AI Analyst Welcome Trigger */}
          <div
            className="w-full max-w-4xl glass-panel p-4 rounded-2xl border border-cyberPink/30 text-left relative overflow-hidden card-lift pointer-events-auto self-center mt-2"
            style={{ boxShadow: '0 0 15px rgba(247, 37, 133, 0.12)' }}
          >
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyberPink/40 bg-cyberPink/5 text-cyberPink">
                <Sparkles className="w-4.5 h-4.5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-mono font-bold text-cyberPink uppercase tracking-wider">
                  {lang === 'en' ? 'AI Assistant Ready' : 'Asistente de IA Listo'}
                </p>
                <p className="text-xs text-gray-300 leading-relaxed mt-1">
                  {lang === 'en' 
                    ? `I've compiled your dossier, Kevin! Click to ask me: "What was my ${topArtist?.name || 'favorite'} phase?" or "Show my listening by hour."`
                    : `¡He compilado tu expediente, Kevin! Haz click para preguntarme: "¿Cómo fue mi fase de ${topArtist?.name || 'favorito'}?" o "Muestra mi actividad por hora."`}
                </p>
                <button
                  onClick={handleLaunchAssistant}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-mono font-black uppercase text-cyberPink hover:text-white transition-colors"
                >
                  {lang === 'en' ? 'Launch Chat Console' : 'Iniciar Consola de Chat'} &rarr;
                </button>
              </div>
            </div>
          </div>

          <p className="max-w-2xl text-xs md:text-sm text-gray-400 leading-relaxed mt-4">
            {t.heroSection.ctaSupport}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {t.heroSection.supportedSources.map(source => (
              <span key={source} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-mono font-black uppercase tracking-widest text-gray-300 hover:border-cyberCyan/40 hover:bg-cyberCyan/5 hover:text-white hover:shadow-[0_0_10px_rgba(0,242,254,0.15)] transition-all duration-300 cursor-default">
                {source}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Core Stats Snapshot Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="space-y-4 text-left"
        >
          <div className="max-w-3xl mx-auto text-center space-y-2">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono font-black uppercase tracking-[0.22em] text-cyberCyan">
              <Database className="w-4 h-4" />
              <span>{t.heroSection.archiveTitle}</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              {t.heroSection.archiveSubtitle}
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {archiveCards.map(({ icon: Icon, accent, label, value, detail, art }) => (
                <div key={label} className="glass-panel card-lift relative overflow-hidden rounded-2xl p-4 min-w-0 border"
                  style={{
                    borderColor: `${accent}30`,
                    boxShadow: `0 0 16px ${accent}10`,
                    borderLeft: `4px solid ${accent}`,
                  }}>
                  <div className="absolute -right-3 -bottom-4 pointer-events-none opacity-[0.07]" aria-hidden="true">
                    <Icon className="h-20 w-20" style={{ color: accent }} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-4 h-4 shrink-0" style={{ color: accent }} />
                      <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-gray-400">
                        {label}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 min-w-0">
                      {art && <span className="shrink-0">{art}</span>}
                      <p className="text-base md:text-lg font-black text-white leading-tight break-words min-w-0">
                        {value}
                      </p>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed mt-2 truncate">
                      {detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {coreStatCards.map(({ icon: Icon, color, label, val, d }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: d, duration: 0.4 }}
                  className={`glass-panel p-4 rounded-2xl flex flex-col justify-center items-center text-center min-h-[116px] ${index === coreStatCards.length - 1 ? 'col-span-2' : ''}`}
                >
                  <Icon className={`w-5 h-5 ${color} mb-1`} />
                  <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">{label}</span>
                  <span className="text-xl md:text-2xl font-black text-white mt-1">
                    <CountUp target={val} duration={1.6} delay={d - 0.7} />
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Perspective scanning grid at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-44 cyber-grid-perspective overflow-hidden pointer-events-none opacity-30 z-0">
        <div className="w-full h-full cyber-grid-surface relative">
          {/* scanning laser sweep line */}
          <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyberCyan to-transparent shadow-[0_0_10px_#00f2fe] animate-laser-sweep" />
        </div>
      </div>

      {/* Immersive Cyber-Portal Warp Transition Overlay */}
      {isWarping && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center pointer-events-none"
        >
          {/* Radial Grid Warp (Simulating zooming through a tunnel) */}
          <motion.div 
            initial={{ scale: 0.2, opacity: 0, rotate: 0 }}
            animate={{ scale: 4, opacity: [0, 1, 1, 0], rotate: 45 }}
            transition={{ duration: 1.2, ease: 'easeIn' }}
            className="absolute w-[800px] h-[800px] rounded-full border-4 border-double border-cyberCyan/35 flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle, transparent 40%, rgba(0, 242, 254, 0.08) 70%, transparent 100%)',
              boxShadow: '0 0 50px rgba(0, 242, 254, 0.2)',
            }}
          >
            {/* Nested Inner Shockwaves */}
            <div className="w-[500px] h-[500px] rounded-full border-2 border-dashed border-cyberPink/30" />
            <div className="absolute w-[300px] h-[300px] rounded-full border border-cyberBlue/40 animate-pulse" />
          </motion.div>

          {/* Zooming Data Stream Lines (Radial spokes) */}
          <svg className="absolute w-full h-full text-cyberCyan/20" viewBox="0 0 100 100" preserveAspectRatio="none">
            {[...Array(24)].map((_, i) => {
              const angle = (i * 360) / 24;
              const rad = (angle * Math.PI) / 180;
              const x2 = 50 + Math.cos(rad) * 80;
              const y2 = 50 + Math.sin(rad) * 80;
              return (
                <motion.line
                  key={i}
                  x1="50"
                  y1="50"
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeWidth="0.25"
                  initial={{ strokeDasharray: '0 100', opacity: 0 }}
                  animate={{ strokeDasharray: '80 100', opacity: [0, 0.8, 0] }}
                  transition={{ duration: 1.0, ease: 'easeOut', delay: i * 0.01 }}
                />
              );
            })}
          </svg>

          {/* Scanline Sweep Laser bar */}
          <motion.div
            initial={{ top: '-10%', opacity: 0 }}
            animate={{ top: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.0, ease: 'easeInOut' }}
            className="absolute left-0 right-0 h-[6px] bg-gradient-to-r from-transparent via-cyberCyan to-transparent shadow-[0_0_25px_#00f2fe,0_0_12px_#00f2fe]"
          />
          <motion.div
            initial={{ bottom: '-10%', opacity: 0 }}
            animate={{ bottom: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.0, ease: 'easeInOut' }}
            className="absolute left-0 right-0 h-[6px] bg-gradient-to-r from-transparent via-cyberPink to-transparent shadow-[0_0_25px_#f72585,0_0_12px_#f72585]"
          />

          {/* Glitch Tech Logs */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.2, times: [0, 0.1, 0.9, 1] }}
            className="z-10 font-mono text-[10px] text-cyberCyan tracking-[0.4em] uppercase text-center space-y-2 bg-black/45 px-6 py-4 rounded-2xl border border-cyberCyan/30 backdrop-blur-md"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyberPink animate-ping" />
              <span>{lang === 'en' ? 'INITIALIZING NEURAL INTERFACE' : 'INICIALIZANDO INTERFAZ NEURAL'}</span>
            </div>
            <div className="text-gray-400 text-[8px] tracking-widest mt-1.5">
              <span>{lang === 'en' ? 'DECRYPTING 11-YEAR ATLAS...' : 'DESCIFRANDO ATLAS DE 11 AÑOS...'}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </section>
  );
}
