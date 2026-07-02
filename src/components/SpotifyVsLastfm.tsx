import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from 'recharts';
import { GitCompare, CheckCircle2, AlertTriangle, Eye, Music, Users, Disc } from 'lucide-react';
import { MusicDnaData } from '../types';
import { deriveSourceSummary, getNightRatio, getTwoYearPeak } from '../utils/analytics';
import { useApp } from '../context/AppContext';
import ArtistAvatar from './ArtistAvatar';
import SectionNarrative from './SectionNarrative';

interface SpotifyVsLastfmProps {
  data: MusicDnaData;
}

interface Insight {
  icon: string;
  title: string;
  body: string;
  color: string;
  avatarNames?: string[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  const { lang } = useApp();
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#070e1c] border border-cyberCyan/30 rounded-xl px-4 py-3 text-xs font-mono shadow-cyber">
      <p className="text-white font-bold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="text-white">{Number(p.value).toLocaleString(lang === 'en' ? 'en-US' : 'es-ES')}</span>
        </p>
      ))}
    </div>
  );
};

export default function SpotifyVsLastfm({ data }: SpotifyVsLastfmProps) {
  const [activeInsight, setActiveInsight] = useState(0);
  const { t, lang } = useApp();
  const fmtNum = (n: number) => Math.round(n).toLocaleString(lang === 'en' ? 'en-US' : 'es-ES');
  const source = deriveSourceSummary(data);
  const lastfmTotal = source.lastfm_plays;
  const spotifyDirectTotal = source.spotify_plays;
  const matchRate = data.core_metrics.match_rate_pct;
  const spotifyEstimatedTotal = spotifyDirectTotal || (lastfmTotal && matchRate > 0 && matchRate < 100
    ? Math.round(lastfmTotal / (matchRate / 100))
    : 0);
  const spotifyOnlyApprox = source.spotify_short_plays || Math.max(0, spotifyEstimatedTotal - lastfmTotal);
  const topArtist = data.top_artists[0];
  const topConsciousArtist = data.top_artists.find(artist => artist.name !== topArtist?.name) ?? data.top_artists[1];
  const twoYearPeak = getTwoYearPeak(data.yearly_eras);
  const night = getNightRatio(data);
  const spotifyScale = lastfmTotal > 0 && spotifyEstimatedTotal > 0 ? spotifyEstimatedTotal / lastfmTotal : (spotifyDirectTotal ? 1 : 0);
  const comparisonLabel = spotifyDirectTotal ? 'Spotify' : 'Spotify (est.)';

  /* ── Overlap bar data using yearly eras ── */
  const yearlyComparison = data.yearly_eras.map(e => ({
    year: String(e.year),
    lastfm: source.source_type === 'spotify' ? 0 : e.plays,
    spotify: spotifyScale ? Math.round(e.plays * spotifyScale) : 0,
  }));

  /* ── Radar comparison ── */
  const radarData = [
    { metric: t.spotifyVsLastfm.radarHistory,  lastfm: 95, spotify: 88 },
    { metric: t.spotifyVsLastfm.radarAccuracy, lastfm: 92, spotify: 78 },
    { metric: t.spotifyVsLastfm.radarCoverage, lastfm: 88, spotify: 96 },
    { metric: t.spotifyVsLastfm.radarMetadata, lastfm: 72, spotify: 90 },
    { metric: t.spotifyVsLastfm.radarSkips,    lastfm: 40, spotify: 82 },
    { metric: t.spotifyVsLastfm.radarContext,  lastfm: 60, spotify: 85 },
  ];

  const insights: Insight[] = [
    {
      icon: '🕵️',
      title: t.spotifyVsLastfm.insightDominantArtistsTitle,
      body: t.spotifyVsLastfm.insightDominantArtistsBody(
        topArtist?.name ?? t.spotifyVsLastfm.yourTopArtistFallback,
        fmtNum(topArtist?.plays ?? 0),
        topConsciousArtist?.name ?? t.spotifyVsLastfm.yourSecondWaveFallback,
      ),
      color: '#00f2fe',
      avatarNames: [topArtist?.name, topConsciousArtist?.name].filter(Boolean) as string[],
    },
    {
      icon: '🔇',
      title: t.spotifyVsLastfm.insightSkipsTitle,
      body: t.spotifyVsLastfm.insightSkipsBody(fmtNum(spotifyOnlyApprox)),
      color: '#f72585',
    },
    {
      icon: '📅',
      title: t.spotifyVsLastfm.insightTwoYearArcTitle(twoYearPeak.label),
      body: t.spotifyVsLastfm.insightTwoYearArcBody(fmtNum(twoYearPeak.plays)),
      color: '#7209b7',
    },
    {
      icon: '🌙',
      title: t.spotifyVsLastfm.insightNightModeTitle,
      body: t.spotifyVsLastfm.insightNightModeBody(night),
      color: '#10b981',
    },
    {
      icon: '🎵',
      title: t.spotifyVsLastfm.insightOverlapTitle,
      body: t.spotifyVsLastfm.insightOverlapBody(source.overlap_unique_tracks),
      color: '#fb923c',
    },
  ];

  const statCards = [
    {
      label: 'Last.fm Scrobbles',
      value: fmtNum(lastfmTotal),
      sub: t.spotifyVsLastfm.primaryScrobbleSource,
      color: '#e8334a',
      icon: '◉',
    },
    {
      label: spotifyDirectTotal ? 'Spotify Plays' : 'Spotify Plays (est.)',
      value: fmtNum(spotifyEstimatedTotal),
      sub: spotifyDirectTotal ? t.spotifyVsLastfm.measuredFromExport : t.spotifyVsLastfm.estimatedFromMatchRate,
      color: '#1DB954',
      icon: '▶',
    },
    {
      label: t.spotifyVsLastfm.matchRateLabel,
      value: `${matchRate}%`,
      sub: t.spotifyVsLastfm.normalizedSourceOverlap,
      color: '#00f2fe',
      icon: '⌥',
    },
    {
      label: t.spotifyVsLastfm.shortExtraPlaysLabel,
      value: fmtNum(spotifyOnlyApprox),
      sub: t.spotifyVsLastfm.shortExtraPlaysSub,
      color: '#a78bfa',
      icon: '◈',
    },
  ];

  const containerVariants = {
    animate: { transition: { staggerChildren: 0.08 } },
  };
  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex items-center space-x-3">
        <GitCompare className="w-6 h-6 text-cyberCyan" />
        <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
          {t.spotifyVsLastfm.pageTitle}
        </h2>
      </div>

      <SectionNarrative content={t.deepNarratives.compare} accent="c4" />

      {/* Hero comparison banner */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-cyan-500/20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-[#e8334a]/5 to-transparent" />
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#1DB954]/5 to-transparent" />
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Last.fm side */}
          <div className="text-center md:text-left space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#e8334a]/10 border border-[#e8334a]/30">
              <span className="text-[#e8334a] font-mono text-xs font-bold">◉ LAST.FM</span>
            </div>
            <p className="text-4xl font-black text-white font-mono">{fmtNum(lastfmTotal)}</p>
            <p className="text-xs text-gray-400 font-mono">{t.spotifyVsLastfm.verifiedScrobbles}</p>
            <div className="space-y-1 text-xs text-gray-300">
              <p className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" />{t.spotifyVsLastfm.lastfmExactTimestamps}</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" />{t.spotifyVsLastfm.lastfmFullAlbumData}</p>
              <p className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" />{t.spotifyVsLastfm.lastfmNoSkipData}</p>
              <p className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" />{t.spotifyVsLastfm.lastfmNoPlaylistContext}</p>
            </div>
          </div>

          {/* Center overlap */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="relative w-36 h-36">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-28 h-28 rounded-full border-4 border-[#e8334a]/60 bg-[#e8334a]/5 absolute -left-3" />
                <div className="w-28 h-28 rounded-full border-4 border-[#1DB954]/60 bg-[#1DB954]/5 absolute -right-3" />
                <div className="z-10 text-center">
                  <p className="text-xl font-black text-white font-mono">{matchRate}%</p>
                  <p className="text-[10px] text-gray-400 font-mono">{t.spotifyVsLastfm.matchWord}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 font-mono text-center">{t.spotifyVsLastfm.artistsAndTracksOverlap}</p>
          </div>

          {/* Spotify side */}
          <div className="text-center md:text-right space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#1DB954]/10 border border-[#1DB954]/30">
              <span className="text-[#1DB954] font-mono text-xs font-bold">▶ SPOTIFY</span>
            </div>
            <p className="text-4xl font-black text-white font-mono">{fmtNum(spotifyEstimatedTotal)}</p>
            <p className="text-xs text-gray-400 font-mono">
              {spotifyDirectTotal ? t.spotifyVsLastfm.measuredPlaysIncludesSkips : t.spotifyVsLastfm.estimatedPlays}
            </p>
            <div className="space-y-1 text-xs text-gray-300 flex flex-col md:items-end">
              <p className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" />{t.spotifyVsLastfm.spotifySkipDataIncluded}</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" />{t.spotifyVsLastfm.spotifyPlaylistContext}</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" />{t.spotifyVsLastfm.spotifyOfflineDevice}</p>
              <p className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" />{t.spotifyVsLastfm.spotifyEmptyPre2015}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {statCards.map(c => (
          <motion.div
            key={c.label}
            variants={cardVariants}
            className="glass-panel p-5 rounded-2xl relative overflow-hidden group"
          >
            <div
              className="absolute top-0 left-0 w-full h-1 rounded-t-2xl"
              style={{ backgroundColor: c.color }}
            />
            <p className="text-3xl font-black font-mono mt-2" style={{ color: c.color }}>
              {c.icon}
            </p>
            <p className="text-xl font-black text-white mt-2 font-mono">{c.value}</p>
            <p className="text-xs font-bold text-gray-300 mt-1">{c.label}</p>
            <p className="text-[10px] text-gray-500 mt-1 font-mono">{c.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Yearly comparison */}
        <div className="glass-panel p-6 rounded-3xl">
          <div className="flex items-center space-x-2 mb-5">
            <Disc className="w-5 h-5 text-cyberCyan" />
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest">
              {t.spotifyVsLastfm.playsByYearTitle(comparisonLabel)}
            </h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyComparison} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <XAxis dataKey="year" stroke="#4b5563" fontSize={10} tick={{ fill: '#9ca3af' }} />
                <YAxis stroke="#4b5563" fontSize={10} tick={{ fill: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}
                />
                <Bar dataKey="lastfm" name="Last.fm" fill="#e8334a" radius={[4, 4, 0, 0]} opacity={0.85} />
                <Bar dataKey="spotify" name="Spotify" fill="#1DB954" radius={[4, 4, 0, 0]} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar comparison */}
        <div className="glass-panel p-6 rounded-3xl">
          <div className="flex items-center space-x-2 mb-5">
            <Users className="w-5 h-5 text-cyberPink" />
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest">
              {t.spotifyVsLastfm.capabilitiesComparisonTitle}
            </h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="metric" stroke="#9ca3af" fontSize={11} tick={{ fill: '#9ca3af' }} />
                <Radar name="Last.fm" dataKey="lastfm" stroke="#e8334a" fill="#e8334a" fillOpacity={0.2} />
                <Radar name="Spotify" dataKey="spotify" stroke="#1DB954" fill="#1DB954" fillOpacity={0.2} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hidden insights section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5 text-cyberCyan" />
          <h3 className="text-lg font-bold font-mono uppercase tracking-wider text-white">
            {t.spotifyVsLastfm.hiddenInsightsTitle}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {insights.map((ins, idx) => (
            <button
              key={idx}
              onClick={() => setActiveInsight(idx)}
              className={`p-3 rounded-xl font-mono text-xs font-bold text-center transition-all border ${
                activeInsight === idx
                  ? 'border-cyberCyan bg-cyberCyan/10 text-cyberCyan'
                  : 'border-cyan-500/10 bg-cyan-950/10 text-gray-400 hover:text-white hover:border-cyan-500/30'
              }`}
            >
              <span className="block text-lg mb-1">{ins.icon}</span>
              <span className="line-clamp-2 leading-tight">{ins.title.split(':')[0]}</span>
            </button>
          ))}
        </div>

        <motion.div
          key={activeInsight}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-panel p-7 rounded-3xl border-l-4"
          style={{ borderLeftColor: insights[activeInsight].color }}
        >
          <div className="flex items-start space-x-4">
            <span className="text-3xl shrink-0">{insights[activeInsight].icon}</span>
            <div className="space-y-3">
              <h4 className="font-bold text-white text-base leading-tight">
                {insights[activeInsight].title}
              </h4>
              {insights[activeInsight].avatarNames && (
                <div className="flex items-center -space-x-2">
                  {insights[activeInsight].avatarNames!.map(name => (
                    <ArtistAvatar key={name} name={name} size={32} className="ring-2 ring-black" />
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-300 font-sans leading-relaxed">
                {insights[activeInsight].body}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Source quality notice */}
      <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-amber-950/5">
        <div className="flex items-start space-x-3">
          <Music className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
              {t.spotifyVsLastfm.dataQualityNoteTitle}
            </p>
            <p className="text-xs text-gray-300 font-sans leading-relaxed">
              {source.source_note}
              {!spotifyDirectTotal && spotifyEstimatedTotal > 0 && (
                <span> {t.spotifyVsLastfm.estimatedValuesDisclaimer}</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
