import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  AreaChart, Area, CartesianGrid, Treemap,
} from 'recharts';
import { Trophy, Music2, Disc3, MicVocal, BarChart2, Search, X } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import { normalizeGenre } from '../utils/analytics';
import ArtistAvatar from './ArtistAvatar';
import GenreArt from './GenreArt';
import SectionNarrative from './SectionNarrative';

interface TopHistoricoProps {
  data: MusicDnaData;
}

type TopTab = 'canciones' | 'artistas' | 'albums' | 'generos' | 'anos';

const tabTransition = { duration: 0.3, ease: 'easeOut' as const };

const listVariants = { animate: { transition: { staggerChildren: 0.04 } } };
const itemVariants = {
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

export default function TopHistorico({ data }: TopHistoricoProps) {
  const { tc, t, lang } = useApp();
  const [tab, setTab] = useState<TopTab>('artistas');
  const [search, setSearch] = useState('');

  const COLORS = [tc.c1, tc.c2, tc.c3, tc.c4, '#fb923c', '#a78bfa', '#34d399', '#f59e0b', '#ec4899', '#6ee7b7'];

  const tabs = [
    { id: 'artistas',  label: t.topHistorico.tabArtists,  icon: MicVocal },
    { id: 'canciones', label: t.topHistorico.tabTracks,   icon: Music2 },
    { id: 'albums',    label: t.topHistorico.tabAlbums,   icon: Disc3 },
    { id: 'generos',   label: t.topHistorico.tabGenres,   icon: BarChart2 },
    { id: 'anos',      label: t.topHistorico.tabYears,    icon: Trophy },
  ] as const;

  const fmtNum = (n: number) => Math.round(n).toLocaleString(lang === 'en' ? 'en-US' : 'es-ES');
  const q = search.toLowerCase().trim();

  /* ── Filtered lists ── */
  const filteredArtists = useMemo(() =>
    data.top_artists.filter(a => !q || a.name.toLowerCase().includes(q) || a.genre.toLowerCase().includes(q)),
    [data.top_artists, q]);

  const filteredTracks = useMemo(() =>
    data.top_tracks.filter(t => !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)),
    [data.top_tracks, q]);

  const filteredAlbums = useMemo(() =>
    data.top_albums.filter(a => !q || a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)),
    [data.top_albums, q]);

  /* ── Charts data ── */
  const yearlyData = data.yearly_eras.map(e => ({ year: String(e.year), plays: e.plays, artistas: e.unique_artists }));

  const genreMap: Record<string, number> = {};
  data.top_artists.forEach(a => { const g = normalizeGenre(a.genre); genreMap[g] = (genreMap[g] || 0) + a.plays; });
  const genreData = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, plays]) => ({ name, plays }));

  /* ── Treemap ── */
  const treemapChildren = genreData.slice(0, 10).map(g => ({ name: g.name, size: g.plays, plays: g.plays }));
  const TREEMAP_COLORS = COLORS;

  const CustomTreemapContent = ({ x, y, width, height, index, name, plays }: any) => {
    if (!plays || width < 40 || height < 25) return null;
    const color = TREEMAP_COLORS[index % TREEMAP_COLORS.length];
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} rx={8} ry={8}
          style={{ fill: `${color}22`, stroke: `${color}55`, strokeWidth: 1 }} />
        {width > 55 && (
          <text x={x + 8} y={y + 18} fontSize={10} fontFamily="monospace" fontWeight="bold"
            fill={color}>{name}</text>
        )}
        {width > 55 && height > 38 && (
          <text x={x + 8} y={y + 32} fontSize={9} fontFamily="monospace"
            fill="#9ca3af">{plays.toLocaleString(lang === 'en' ? 'en-US' : 'es-ES')}</text>
        )}
      </g>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl px-4 py-3 text-xs font-mono shadow-lg"
        style={{ backgroundColor: '#070e1c', border: `1px solid ${tc.c1}40` }}>
        <p className="text-white font-bold mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color ?? tc.c1 }}>
            {p.name}: <span className="text-white">{Number(p.value).toLocaleString(lang === 'en' ? 'en-US' : 'es-ES')}</span>
          </p>
        ))}
      </div>
    );
  };

  const ListRow = ({ rank, main, sub, plays, color, avatarName }: { rank: number; main: string; sub?: string; plays: number; color: string; avatarName?: string }) => (
    <motion.div variants={itemVariants}
      className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/3 transition-all group"
      style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="flex items-center space-x-3 truncate min-w-0">
        <span className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-xs font-black font-mono"
          style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}40` }}>
          {rank}
        </span>
        {avatarName && <ArtistAvatar name={avatarName} size={32} />}
        <div className="truncate">
          <p className="text-sm font-bold text-white truncate leading-tight">{main}</p>
          {sub && <p className="text-[11px] text-gray-400 truncate">{sub}</p>}
        </div>
      </div>
      <span className="text-xs font-mono font-bold px-3 py-1 rounded-full shrink-0 ml-3"
        style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
        {fmtNum(plays)}
      </span>
    </motion.div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-3">
          <Trophy className="w-6 h-6" style={{ color: tc.c1 }} />
          <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
            {t.topHistorico.title}
          </h2>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.topHistorico.searchPlaceholder}
            className="bg-white/5 border rounded-xl pl-9 pr-8 py-2 text-sm font-mono text-white placeholder-gray-500 focus:outline-none transition-all w-52"
            style={{ borderColor: search ? tc.c1 : 'rgba(255,255,255,0.1)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-gray-400 hover:text-white transition-colors" />
            </button>
          )}
        </div>
      </div>

      <SectionNarrative content={t.deepNarratives.top} accent="c2" />

      {/* Tabs */}
      <div className="flex overflow-x-auto space-x-2 pb-1">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id as TopTab)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider shrink-0 transition-all border"
              style={active ? {
                background: `linear-gradient(135deg, ${tc.c1}20, ${tc.c3}10)`,
                borderColor: tc.c1, color: tc.c1,
                boxShadow: `0 0 15px ${tc.c1}20`,
              } : { borderColor: 'rgba(255,255,255,0.08)', color: '#6b7280' }}>
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }} transition={tabTransition}>

          {/* ARTISTAS */}
          {tab === 'artistas' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="glass-panel p-6 rounded-3xl">
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest mb-5"
                  style={{ color: tc.c1 }}>
                  {t.topHistorico.top50Artists}
                  {search && <span className="text-gray-400 ml-2">({t.topHistorico.resultsCount(filteredArtists.length)})</span>}
                </h3>
                <motion.div variants={listVariants} initial="initial" animate="animate"
                  className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                  {filteredArtists.slice(0, 50).map((a, idx) => (
                    <ListRow key={a.name} rank={idx + 1} main={a.name}
                      sub={`${a.country} · ${a.genre}`} plays={a.plays}
                      color={COLORS[idx % COLORS.length]} avatarName={a.name} />
                  ))}
                </motion.div>
              </div>

              <div className="glass-panel p-6 rounded-3xl">
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest mb-5"
                  style={{ color: tc.c2 }}>
                  {t.topHistorico.top20Chart}
                </h3>
                <div className="h-[550px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.top_artists.slice(0, 20)} layout="vertical"
                      margin={{ left: 0, right: 32, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0d1f38" horizontal={false} />
                      <XAxis type="number" stroke="#374151" fontSize={10} tick={{ fill: '#9ca3af' }} />
                      <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={11}
                        width={145} tick={{ fill: '#d1d5db' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="plays" name={t.topHistorico.playsLegend} radius={[0, 6, 6, 0]}>
                        {data.top_artists.slice(0, 20).map((_, i) => (
                          <Cell key={i} fill={i < 3 ? tc.c1 : tc.c3} fillOpacity={i < 3 ? 1 : 0.7} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* CANCIONES */}
          {tab === 'canciones' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="glass-panel p-6 rounded-3xl">
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest mb-5"
                  style={{ color: tc.c1 }}>
                  {t.topHistorico.top50Tracks}
                  {search && <span className="text-gray-400 ml-2">({filteredTracks.length})</span>}
                </h3>
                <motion.div variants={listVariants} initial="initial" animate="animate"
                  className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                  {filteredTracks.slice(0, 50).map((t, idx) => (
                    <ListRow key={`${t.artist}-${t.title}`} rank={idx + 1} main={t.title}
                      sub={`${t.artist} · ${t.genre}`} plays={t.plays}
                      color={COLORS[idx % COLORS.length]} avatarName={t.artist} />
                  ))}
                </motion.div>
              </div>

              <div className="glass-panel p-6 rounded-3xl">
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest mb-5"
                  style={{ color: tc.c2 }}>
                  {t.topHistorico.top20Chart}
                </h3>
                <div className="h-[550px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.top_tracks.slice(0, 20).map(t => ({ ...t, name: t.title }))}
                      layout="vertical" margin={{ left: 0, right: 32, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0d1f38" horizontal={false} />
                      <XAxis type="number" stroke="#374151" fontSize={10} tick={{ fill: '#9ca3af' }} />
                      <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={11}
                        width={145} tick={{ fill: '#d1d5db' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="plays" radius={[0, 6, 6, 0]}>
                        {data.top_tracks.slice(0, 20).map((_, i) => (
                          <Cell key={i} fill={i < 3 ? tc.c2 : tc.c3} fillOpacity={i < 3 ? 1 : 0.7} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ALBUMS */}
          {tab === 'albums' && (
            <div className="glass-panel p-6 rounded-3xl">
              <h3 className="text-sm font-mono font-bold uppercase tracking-widest mb-5"
                style={{ color: tc.c3 }}>
                {t.topHistorico.top50Albums}
                {search && <span className="text-gray-400 ml-2">({filteredAlbums.length})</span>}
              </h3>
              <motion.div variants={listVariants} initial="initial" animate="animate"
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[660px] overflow-y-auto pr-1">
                {filteredAlbums.slice(0, 50).map((a, idx) => (
                  <ListRow key={`${a.artist}-${a.title}`} rank={idx + 1} main={a.title}
                    sub={a.artist} plays={a.plays} color={COLORS[idx % COLORS.length]} avatarName={a.artist} />
                ))}
              </motion.div>
            </div>
          )}

          {/* GÉNEROS */}
          {tab === 'generos' && (
            <div className="space-y-8">
              <div className="glass-panel p-6 rounded-3xl">
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest mb-5"
                  style={{ color: tc.c2 }}>
                  {t.topHistorico.tabGenres}
                </h3>
                <div className="flex flex-wrap gap-5">
                  {genreData.slice(0, 10).map(g => (
                    <GenreArt key={g.name} genre={g.name} size={68} showLabel />
                  ))}
                </div>
              </div>

              <div className="glass-panel p-6 rounded-3xl">
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest mb-5"
                  style={{ color: tc.c1 }}>
                  {t.topHistorico.genreTreemap}
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap data={treemapChildren} dataKey="size"
                      content={<CustomTreemapContent />} isAnimationActive />
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-3xl">
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest mb-5"
                  style={{ color: tc.c4 }}>
                  {t.topHistorico.genreBreakdown}
                </h3>
                <div className="h-[420px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={genreData} layout="vertical"
                      margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0d1f38" horizontal={false} />
                      <XAxis type="number" stroke="#374151" fontSize={10} tick={{ fill: '#9ca3af' }} />
                      <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={10}
                        width={160} tick={{ fill: '#9ca3af' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="plays" name={t.topHistorico.playsLegend} radius={[0, 6, 6, 0]}>
                        {genreData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* AÑOS */}
          {tab === 'anos' && (
            <div className="space-y-8">
              <div className="glass-panel p-6 rounded-3xl">
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest mb-6"
                  style={{ color: tc.c1 }}>
                  {t.topHistorico.playsByYear}
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={yearlyData} margin={{ left: 0, right: 24, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="topGradYear" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={tc.c1} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={tc.c1} stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="topGradArt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={tc.c3} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={tc.c3} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0d1f38" />
                      <XAxis dataKey="year" stroke="#4b5563" fontSize={11} tick={{ fill: '#9ca3af' }} />
                      <YAxis stroke="#4b5563" fontSize={11} tick={{ fill: '#9ca3af' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="plays" name={t.topHistorico.playsLegend}
                        stroke={tc.c1} strokeWidth={2.5} fill="url(#topGradYear)"
                        dot={{ fill: tc.c1, r: 4 }} activeDot={{ r: 7 }} />
                      <Area type="monotone" dataKey="artistas" name={t.topHistorico.uniqueArtistsLegend}
                        stroke={tc.c3} strokeWidth={2} fill="url(#topGradArt)"
                        dot={{ fill: tc.c3, r: 3 }} activeDot={{ r: 6 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.yearly_eras.map((era, idx) => (
                  <motion.div key={era.year} variants={itemVariants} initial="initial" animate="animate"
                    transition={{ delay: idx * 0.05 }}
                    className="glass-panel p-4 rounded-2xl space-y-2 border-t-2"
                    style={{ borderTopColor: COLORS[idx % COLORS.length] }}>
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-base font-black text-white">{era.year}</span>
                      <span className="text-[10px] font-mono font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
                        {fmtNum(era.plays)}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-gray-200 leading-tight">{era.era_label}</p>
                    <p className="text-[10px] text-gray-500 font-mono">♪ {era.top_artist}</p>
                    <div className="pt-1 border-t border-white/5 text-[9px] text-gray-600 font-mono">
                      {t.topHistorico.eraDiversityLine(era.diversity_index, era.unique_artists)}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
