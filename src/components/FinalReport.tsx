import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Headphones, Heart, Printer, Music, Star, Zap } from 'lucide-react';
import { MusicDnaData } from '../types';
import CountUp from './CountUp';
import { useApp } from '../context/AppContext';
import { deriveSourceSummary, getNightRatio, getPeakYear, getRecords, getTwoYearPeak } from '../utils/analytics';
import MuseumPoster from './MuseumPoster';
import SectionNarrative from './SectionNarrative';

interface FinalReportProps { data: MusicDnaData; }

const sectionVariants = { animate: { transition: { staggerChildren: 0.15 } } };
const paraVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

function SectionHeading({ roman, title, color }: { roman: string; title: string; color: string }) {
  return (
    <div className="flex items-center gap-4 pb-3 border-b border-white/5">
      <span className="font-mono text-3xl font-black opacity-20" style={{ color }}>{roman}</span>
      <h4 className="text-lg md:text-xl font-bold text-white font-mono uppercase tracking-wider"
          style={{ textShadow: `0 0 20px ${color}40` }}>{title}</h4>
    </div>
  );
}

function PullQuote({ text, color = '#00f2fe' }: { text: string; color?: string }) {
  return (
    <div className="my-2 pl-5 border-l-4 py-2 rounded-r-xl"
         style={{ borderLeftColor: color, backgroundColor: `${color}08` }}>
      <p className="text-base md:text-lg font-sans italic font-light leading-relaxed"
         style={{ color: `${color}dd` }}>{text}</p>
    </div>
  );
}

function InlineStat({ label, value, color = '#00f2fe' }: { label: string; value: string | number; color?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full font-mono text-sm font-bold mx-0.5"
          style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
      <span>{value}</span>
      <span className="text-gray-400 font-normal text-xs">{label}</span>
    </span>
  );
}

export default function FinalReport({ data }: FinalReportProps) {
  const { t, lang } = useApp();
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  const tr = t.finalReport;
  const m = data.core_metrics;
  const topArtist = data.top_artists[0]?.name ?? 'Bring Me the Horizon';
  const topTrack  = data.top_tracks[0]?.title  ?? 'In Blur';
  const nr = getNightRatio(data);
  const records = getRecords(data);
  const peakPair = getTwoYearPeak(data.yearly_eras);
  const peakYear = getPeakYear(data);
  const source = deriveSourceSummary(data);
  const recentYears = [...data.yearly_eras]
    .sort((a, b) => b.year - a.year)
    .slice(0, 2)
    .map(era => era.year);
  const currentTopTen = data.top_artists.slice(0, 10).map(artist => artist.name.toLowerCase());
  const closedCapsules = data.yearly_eras.filter(era => !recentYears.includes(era.year));
  const fadedCapsules = closedCapsules.filter(era => !currentTopTen.includes(era.top_artist.toLowerCase())).length;
  const reportConfidence = source.source_type === 'merged'
    ? 90
    : source.source_type === 'spotify'
      ? 78
      : source.source_type === 'lastfm'
        ? 74
        : 62;

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="w-6 h-6 text-cyberCyan" />
          <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">{tr.pageTitle}</h2>
        </div>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-cyberCyan/10 border border-cyberCyan/30 hover:border-cyberCyan text-cyberCyan font-mono text-xs font-bold rounded-xl transition-all print:hidden">
          <Printer className="w-3.5 h-3.5" />{tr.printButton}
        </button>
      </div>

      <SectionNarrative content={t.deepNarratives.report} accent="c1" />

      {/* Magazine cover */}
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
        className="glass-panel rounded-3xl overflow-hidden">
        <div className="relative h-52 bg-gradient-to-br from-[#050b14] via-[#0a192f] to-[#7209b7]/40 flex flex-col items-center justify-center text-center p-8 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-56 h-56 rounded-full bg-cyberCyan/8 blur-[70px]" />
            <div className="absolute bottom-0 right-1/4 w-56 h-56 rounded-full bg-cyberPink/8 blur-[70px]" />
          </div>
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-cyberCyan/60 tracking-widest uppercase">
              <Headphones className="w-3 h-3" /><span>{tr.coverBadge}</span><Headphones className="w-3 h-3" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              {tr.coverHeadlinePre}<span className="bg-gradient-to-r from-cyberCyan to-cyberPink bg-clip-text text-transparent">{tr.coverHeadlineHighlight}</span>{' '}<br/>{tr.coverHeadlinePost}
            </h1>
            <p className="text-sm text-gray-300 font-light">{tr.coverSubtitlePre}<span className="text-cyberCyan font-semibold">{tr.coverSubtitleName}</span></p>
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-white/5 bg-white/2">
          {[
            { icon: Music,      label: tr.statScrobbles, val: m.total_plays },
            { icon: Headphones, label: tr.statHours,     val: m.listening_hours },
            { icon: Star,       label: tr.statArtists,   val: m.unique_artists },
            { icon: Zap,        label: tr.statTracks,    val: m.unique_tracks },
          ].map(({ icon: Icon, label, val }, i) => (
            <div key={label} className="p-4 flex flex-col items-center text-center">
              <Icon className="w-4 h-4 text-cyberCyan mb-1 opacity-50" />
              <p className="text-base font-black text-white font-mono">
                <CountUp target={val} duration={1.8} delay={0.4 + i * 0.12} />
              </p>
              <p className="text-[10px] text-gray-500 font-mono uppercase">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Essay */}
      <motion.div variants={sectionVariants} initial="initial" animate="animate"
        className="glass-panel p-8 md:p-12 rounded-3xl space-y-10 font-sans font-light text-gray-200 leading-relaxed">

        <motion.section variants={paraVariants} className="space-y-4">
          <SectionHeading roman={tr.s1Roman} title={tr.s1Title} color="#00f2fe" />
          <p className="text-sm md:text-base">
            {tr.s1Pre}
            <InlineStat label={tr.s1ScrobblesLabel} value={m.total_plays.toLocaleString(locale)} color="#00f2fe" />
            {tr.s1Mid}{' '}
            <InlineStat label={tr.s1HoursLabel} value={Math.round(m.listening_hours).toLocaleString(locale)} color="#f72585" />
            {tr.s1Post}
          </p>
          <PullQuote text={tr.s1Quote} color="#00f2fe" />
        </motion.section>

        <div className="h-px bg-gradient-to-r from-transparent via-cyberCyan/20 to-transparent" />

        <motion.section variants={paraVariants} className="space-y-4">
          <SectionHeading roman={tr.s2Roman} title={tr.s2Title} color="#f72585" />
          <p className="text-sm md:text-base">
            {tr.s2Pre} <strong className="text-white">{tr.s2ArtistName}</strong> {tr.s2ArtistIntro}{' '}
            <InlineStat label={tr.s2StreakLabel} value={records.longest_streak_days || 'N/D'} color="#fb923c" /> {tr.s2Mid(peakPair.label)}
            <InlineStat label={tr.s2CombinedLabel} value={peakPair.plays.toLocaleString(locale)} color="#f72585" />.
          </p>
          <PullQuote text={tr.s2Quote} color="#f72585" />
        </motion.section>

        <div className="h-px bg-gradient-to-r from-transparent via-cyberPink/20 to-transparent" />

        <motion.section variants={paraVariants} className="space-y-4">
          <SectionHeading roman={tr.s3Roman} title={tr.s3Title} color="#7209b7" />
          <p className="text-sm md:text-base">
            {tr.s3Pre} <InlineStat label={tr.s3ArtistsLabel} value={m.unique_artists.toLocaleString(locale)} color="#7209b7" />
            {tr.s3Mid} <InlineStat label={tr.s3TracksLabel} value={m.unique_tracks.toLocaleString(locale)} color="#a78bfa" />
            {tr.s3ArchetypeIntro} <strong className="text-white">{tr.s3Archetype}</strong>. {tr.s3NightIntro} <strong className="text-white">{tr.s3NightLabel(nr)}</strong>{' '}
            {tr.s3Post}
          </p>
          <PullQuote text={tr.s3Quote} color="#7209b7" />
        </motion.section>

        <div className="h-px bg-gradient-to-r from-transparent via-cyberPurple/20 to-transparent" />

        <motion.section variants={paraVariants} className="space-y-4">
          <SectionHeading roman={tr.s4Roman} title={tr.s4Title} color="#10b981" />
          <p className="text-sm md:text-base">
            {tr.s4Pre} <strong className="text-white">{tr.s4AliasLabel}</strong> {tr.s4Post}
          </p>
          <PullQuote text={tr.s4Quote} color="#10b981" />
        </motion.section>

        <div className="h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />

        <motion.section variants={paraVariants} className="space-y-4">
          <SectionHeading roman={tr.s5Roman} title={tr.s5Title} color="#facc15" />
          <p className="text-sm md:text-base">
            {tr.s5Pre}{' '}
            <InlineStat label={tr.s5DaysLabel} value={m.active_days.toLocaleString(locale)} color="#facc15" />{' '}
            {tr.s5Post(topArtist, topTrack)}
          </p>
        </motion.section>

        <div className="h-px bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent" />

        <motion.section variants={paraVariants} className="space-y-4">
          <SectionHeading roman={tr.s6Roman} title={tr.s6Title} color="#4cc9f0" />
          <p className="text-sm md:text-base">
            {tr.s6Pre}{' '}
            <InlineStat label={tr.s6CapsulesLabel} value={closedCapsules.length.toLocaleString(locale)} color="#4cc9f0" />
            <InlineStat label={tr.s6WrappedLabel} value={peakYear?.year ?? 'N/D'} color="#f72585" />
            <InlineStat label={tr.s6ConfidenceLabel} value={`${reportConfidence}%`} color="#10b981" />{' '}
            {tr.s6Mid(fadedCapsules)} {tr.s6Post}
          </p>
          <PullQuote text={tr.s6Quote} color="#4cc9f0" />
        </motion.section>

        <div className="h-px bg-gradient-to-r from-transparent via-cyberCyan/20 to-transparent" />

        <motion.div variants={paraVariants}>
          <MuseumPoster data={data} />
        </motion.div>

        <motion.div variants={paraVariants} className="pt-8 border-t border-white/5 flex flex-col items-center space-y-3 text-center">
          <Heart className="w-6 h-6 text-cyberPink fill-cyberPink animate-pulse-slow" />
          <p className="font-mono text-sm font-bold text-white tracking-widest">{tr.footerName}</p>
          <p className="text-xs text-gray-500 font-mono">{tr.footerSubtitle}</p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {[topArtist, 'Deafheaven', 'Bilmuri', 'The Midnight', 'nothingnowhere.'].map(a => (
              <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-cyberCyan/5 border border-cyberCyan/15 text-gray-400 font-mono">{a}</span>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
