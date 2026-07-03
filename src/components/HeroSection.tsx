import React from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Clock,
  Database,
  Disc,
  FileUp,
  Headphones,
  LibraryBig,
  Play,
  Radio,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { MusicDnaData } from '../types';
import CountUpCmp from './CountUp';
import { useApp } from '../context/AppContext';
import AnimatedParticles from './AnimatedParticles';
import SectionNarrative from './SectionNarrative';
import { deriveSourceSummary, formatNumber, getPeakYear } from '../utils/analytics';

interface HeroSectionProps {
  data: MusicDnaData;
  onEnter: () => void;
  onUpload: () => void;
}

/** Count-up using native requestAnimationFrame — reliable across React versions */
function CountUp({ target, duration = 1.8, delay = 0 }: { target: number; duration?: number; delay?: number }) {
  return <CountUpCmp target={target} duration={duration} delay={delay} />;
}

export default function HeroSection({ data, onEnter, onUpload }: HeroSectionProps) {
  const metrics = data.core_metrics;
  const topArtist = data.top_artists[0];
  const topTrack = data.top_tracks[0];
  const peakYear = getPeakYear(data);
  const sourceSummary = deriveSourceSummary(data);
  const { t, lang } = useApp();
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  const fmtNum = (num: number) => formatNumber(num, locale);
  const sourceLabel = t.heroSection.sourceLabels[sourceSummary.source_type] ?? t.heroSection.sourceLabels.unknown;

  const archiveCards = [
    {
      icon: Headphones,
      color: 'text-cyberCyan',
      label: t.heroSection.archiveSnapshot.topArtist,
      value: topArtist?.name ?? t.heroSection.archiveSnapshot.unknown,
      detail: topArtist
        ? t.heroSection.archiveSnapshot.topArtistDetail(fmtNum(topArtist.plays))
        : t.heroSection.archiveSnapshot.pending,
    },
    {
      icon: Disc,
      color: 'text-cyberPink',
      label: t.heroSection.archiveSnapshot.topTrack,
      value: topTrack?.title ?? t.heroSection.archiveSnapshot.unknown,
      detail: topTrack
        ? t.heroSection.archiveSnapshot.topTrackDetail(topTrack.artist)
        : t.heroSection.archiveSnapshot.pending,
    },
    {
      icon: Trophy,
      color: 'text-cyberPurple',
      label: t.heroSection.archiveSnapshot.peakEra,
      value: peakYear ? String(peakYear.year) : t.heroSection.archiveSnapshot.unknown,
      detail: peakYear
        ? t.heroSection.archiveSnapshot.peakEraDetail(fmtNum(peakYear.plays))
        : t.heroSection.archiveSnapshot.pending,
    },
    {
      icon: ShieldCheck,
      color: 'text-cyberBlue',
      label: t.heroSection.archiveSnapshot.dataTrust,
      value: sourceLabel,
      detail: t.heroSection.archiveSnapshot.dataTrustDetail(sourceLabel),
    },
  ];

  const coreStatCards = [
    { icon: Headphones, color: 'text-cyberCyan',   label: t.hero.scrobbles, val: metrics.total_plays,     d: 0.8 },
    { icon: Clock,      color: 'text-cyberPink',   label: t.hero.hours,     val: metrics.listening_hours, d: 0.9 },
    { icon: Disc,       color: 'text-cyberPurple', label: t.hero.artists,   val: metrics.unique_artists,  d: 1.0 },
    { icon: Play,       color: 'text-cyberBlue',   label: t.hero.tracks,    val: metrics.unique_tracks,   d: 1.1 },
    { icon: Calendar,   color: 'text-green-400',   label: t.hero.days,      val: metrics.listening_days,  d: 1.2 },
  ];

  const handleEnter = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.7 },
      colors: ['#00f2fe', '#f72585', '#7209b7', '#4cc9f0', '#ffffff'],
      startVelocity: 35,
      gravity: 0.9,
      ticks: 200,
    });
    setTimeout(onEnter, 400);
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
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-cyberCyan/10 blur-[120px] animate-cloud-1 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-cyberPink/10 blur-[120px] animate-cloud-2 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-cyberPurple/5 blur-[80px] pointer-events-none" />

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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="space-y-3"
        >
          <h1 className="text-5xl md:text-8xl font-extrabold tracking-tight leading-none">
            <span className="bg-gradient-to-r from-[var(--fg)] via-[var(--c1)] to-[var(--c2)] bg-clip-text text-transparent">
              NOVA MUSIC LAB
            </span>
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold font-mono text-cyberBlue/90 tracking-wide text-neon-glow">
            {t.heroSection.subtitle}
          </h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-base md:text-xl text-gray-300 max-w-3xl mx-auto font-sans font-light leading-relaxed"
        >
          {t.heroSection.description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="flex flex-col items-center justify-center gap-3 pt-1"
        >
          <div className="flex items-end justify-center gap-1 h-7" aria-hidden="true">
            {[0.3, 0.7, 1.0, 0.6, 0.9, 0.4, 0.8, 1.0, 0.5, 0.7, 0.3].map((h, i) => (
              <div
                key={i}
                className="waveform-bar"
                style={{
                  height: `${h * 100}%`,
                  backgroundColor: i % 3 === 0 ? 'var(--c1)' : i % 3 === 1 ? 'var(--c2)' : 'var(--c3)',
                  animationDelay: `${i * 0.08}s`,
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
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
          <p className="max-w-2xl text-xs md:text-sm text-gray-400 leading-relaxed">
            {t.heroSection.ctaSupport}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {t.heroSection.supportedSources.map(source => (
              <span key={source} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-mono font-black uppercase tracking-widest text-gray-300">
                {source}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {archiveCards.map(({ icon: Icon, color, label, value, detail }) => (
              <div key={label} className="glass-panel rounded-2xl p-4 min-w-0 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                  <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-gray-400">
                    {label}
                  </p>
                </div>
                <p className="text-base md:text-lg font-black text-white leading-tight break-words">
                  {value}
                </p>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.5 }}
          className="space-y-4 text-left"
        >
          <div className="max-w-3xl mx-auto text-center space-y-2">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono font-black uppercase tracking-[0.22em] text-cyberPink">
              <LibraryBig className="w-4 h-4" />
              <span>{t.heroSection.museumMapTitle}</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              {t.heroSection.museumMapSubtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {t.heroSection.museumMapItems.map((item, index) => {
              const colors = ['text-cyberCyan', 'text-cyberPink', 'text-cyberPurple', 'text-cyberBlue'];
              return (
                <div key={item.title} className="glass-panel rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className={`w-4 h-4 shrink-0 ${colors[index % colors.length]}`} />
                    <p className="text-xs font-mono font-black uppercase tracking-wider text-white">
                      {item.title}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] gap-5 items-start text-left"
        >
          <SectionNarrative
            content={t.deepNarratives.hero}
            accent="c1"
            compact
            className="max-w-none"
          />

          <div className="space-y-5">
            <div className="glass-panel p-5 md:p-6 rounded-3xl border-l-4 border-l-cyberCyan/80 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Radio className="w-24 h-24 text-cyberCyan" />
              </div>
              <p className="text-sm md:text-base text-[var(--fg)] font-sans italic leading-relaxed">
                {(() => {
                  const { before, midA, midB, after } = t.heroSection.quote;
                  return (
                    <>
                      {before}
                      <span className="text-cyberCyan font-semibold not-italic">{topArtist?.name}</span>
                      {midA}
                      <span className="text-cyberPink font-semibold not-italic">'{topTrack?.title}'</span>
                      {midB}
                      <span className="text-cyberPink font-semibold not-italic">{topTrack?.artist}</span>
                      {after}
                    </>
                  );
                })()}
              </p>
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
    </section>
  );
}
