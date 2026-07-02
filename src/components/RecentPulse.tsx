import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Crown, Sparkles, Repeat, History, Zap, Music } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import ArtistAvatar from './ArtistAvatar';
import pulseData from '../data/recent_pulse.json';

interface RecentPulseProps {
  data: MusicDnaData;
}

interface PulseArtist {
  name: string;
  image: string;
}

interface PulseTrack {
  title: string;
  artist: string;
  image: string;
}

interface PulseSnapshot {
  synced_at: string;
  source: string;
  top_artists: PulseArtist[];
  top_tracks: PulseTrack[];
  recent_tracks: PulseTrack[];
}

const pulse = pulseData as PulseSnapshot;

/* ── framer-motion variants ── */
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
};

/* Artist photo from the pulse snapshot, with ArtistAvatar fallback on load error */
function PulsePhoto({ name, image, size }: { name: string; image: string; size: number }) {
  const { tc } = useApp();
  const [failed, setFailed] = useState(false);

  if (failed || !image) {
    return <ArtistAvatar name={name} size={size} />;
  }

  return (
    <img
      src={image}
      alt={name}
      loading="lazy"
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size, border: `1px solid ${tc.c1}30` }}
    />
  );
}

/* Album art with a neutral music-note tile fallback on load error */
function AlbumArt({ title, image, size, rounded = 'rounded-xl' }: { title: string; image: string; size: number; rounded?: string }) {
  const { tc } = useApp();
  const [failed, setFailed] = useState(false);

  if (failed || !image) {
    return (
      <div
        role="img"
        aria-label={title}
        className={`${rounded} flex items-center justify-center shrink-0`}
        style={{ width: size, height: size, backgroundColor: `${tc.c2}15`, border: `1px solid ${tc.c2}30` }}
      >
        <Music className="w-1/2 h-1/2" style={{ color: tc.c2 }} />
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={title}
      loading="lazy"
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`${rounded} object-cover shrink-0`}
      style={{ width: size, height: size, border: `1px solid ${tc.c1}20` }}
    />
  );
}

export default function RecentPulse({ data }: RecentPulseProps) {
  const { tc, t, lang } = useApp();
  const fmtNum = (n: number) => Math.round(n).toLocaleString(lang === 'en' ? 'en-US' : 'es-ES');

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(`${dateStr}T00:00:00`);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  /* Archive lookup: anywhere in the historic top-100 counts as "already archived" */
  const findInArchive = (name: string) =>
    data.top_artists.find(a => a.name.toLowerCase() === name.toLowerCase());

  const verdicts = pulse.top_artists.map(artist => {
    const archived = findInArchive(artist.name);
    return { ...artist, archived };
  });
  const newBloodCount = verdicts.filter(v => !v.archived).length;

  return (
    <div className="space-y-10 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Radio className="w-6 h-6" style={{ color: tc.c1 }} />
            <span
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-ping"
              style={{ backgroundColor: tc.c2 }}
            />
          </div>
          <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
            {t.pulse.title}
          </h2>
        </div>
        <span
          className="px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider border"
          style={{ color: tc.c1, borderColor: `${tc.c1}40`, backgroundColor: `${tc.c1}10` }}
        >
          {t.pulse.syncedAt(formatDate(pulse.synced_at))}
        </span>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed font-sans -mt-6 max-w-2xl">
        {t.pulse.subtitle}
      </p>

      {/* ── Section 1: Top artists now ── */}
      <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}>
        <div className="flex items-center space-x-3 mb-5">
          <Crown className="w-5 h-5" style={{ color: tc.c1 }} />
          <h3 className="text-base font-bold font-mono uppercase tracking-wider text-white">
            {t.pulse.topArtistsNow}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {verdicts.map((artist, idx) => {
            const accent = artist.archived ? tc.c1 : tc.c2;
            return (
              <motion.div
                key={`${artist.name}-${idx}`}
                variants={itemVariants}
                className="glass-panel p-5 rounded-3xl flex flex-col items-center text-center space-y-3 hover:scale-[1.03] transition-transform"
              >
                <PulsePhoto name={artist.name} image={artist.image} size={72} />
                <p className="text-sm font-bold text-white truncate w-full">{artist.name}</p>
                <span
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] font-black uppercase tracking-wider border"
                  style={{ color: accent, borderColor: `${accent}40`, backgroundColor: `${accent}12` }}
                >
                  {artist.archived
                    ? <Crown className="w-3 h-3" />
                    : <Sparkles className="w-3 h-3" />}
                  {artist.archived ? t.pulse.stillReigning : t.pulse.newBlood}
                </span>
                {artist.archived && (
                  <p className="text-[10px] font-mono text-gray-400">
                    {t.pulse.historicPlays(fmtNum(artist.archived.plays))}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Section 2: Tracks on repeat now ── */}
      <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}>
        <div className="flex items-center space-x-3 mb-5">
          <Repeat className="w-5 h-5" style={{ color: tc.c2 }} />
          <h3 className="text-base font-bold font-mono uppercase tracking-wider text-white">
            {t.pulse.tracksOnRepeat}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pulse.top_tracks.map((track, idx) => (
            <motion.div
              key={`${track.title}-${idx}`}
              variants={itemVariants}
              className="glass-panel p-4 rounded-3xl flex items-center space-x-4 hover:scale-[1.02] transition-transform"
            >
              <AlbumArt title={track.title} image={track.image} size={56} rounded="rounded-2xl" />
              <div className="truncate">
                <p className="text-sm font-bold text-white truncate">{track.title}</p>
                <p className="text-xs text-gray-400 truncate">{track.artist}</p>
              </div>
              <div className="ml-auto shrink-0">
                <Repeat className="w-4 h-4 opacity-60" style={{ color: tc.c2 }} />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Section 3: Recently played ── */}
      <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}>
        <div className="flex items-center space-x-3 mb-5">
          <History className="w-5 h-5" style={{ color: tc.c3 }} />
          <h3 className="text-base font-bold font-mono uppercase tracking-wider text-white">
            {t.pulse.recentlyPlayed}
          </h3>
        </div>

        <div className="glass-panel p-4 rounded-3xl divide-y divide-white/5">
          {pulse.recent_tracks.map((track, idx) => (
            <motion.div
              key={`${track.title}-${idx}`}
              variants={itemVariants}
              className="flex items-center space-x-3 py-3 first:pt-1 last:pb-1"
            >
              <AlbumArt title={track.title} image={track.image} size={36} rounded="rounded-lg" />
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{track.title}</p>
                <p className="text-[10px] text-gray-400 truncate">{track.artist}</p>
              </div>
              <span
                className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: `${tc.c3}90` }}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Closing insight panel ── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass-panel p-6 rounded-3xl border-l-4"
        style={{ borderLeftColor: tc.c2 }}
      >
        <div className="flex items-center space-x-3 mb-3">
          <Zap className="w-5 h-5" style={{ color: tc.c2 }} />
          <h3 className="text-base font-bold font-mono uppercase tracking-wider text-white">
            {t.pulse.insightTitle}
          </h3>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed font-sans">
          {t.pulse.insightBody(newBloodCount)}
        </p>
      </motion.div>

      {/* ── Footer disclaimer ── */}
      <p className="text-[10px] font-mono text-gray-500 leading-relaxed max-w-3xl">
        {t.pulse.disclaimer}
      </p>
    </div>
  );
}
