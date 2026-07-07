import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from 'recharts';
import {
  Activity, AudioWaveform, CalendarCheck, CalendarClock, Clock, Flame,
  Gauge, Headphones, Mic2, Moon, Star, Timer, TrendingUp, Trophy, Zap,
} from 'lucide-react';
import { MusicDnaData } from '../types';
import CountUp from './CountUp';
import ArtistAvatar from './ArtistAvatar';
import { useApp } from '../context/AppContext';
import { formatNumber, getNightRatio, getPeakHour, getPeakYear, getRecords, getWeekdayNames, normalizeGenre } from '../utils/analytics';
import SectionNarrative from './SectionNarrative';
import { localizeEraLabel } from '../utils/localeText';
import { axisProps, barCursor, ChartGradients, GlassTooltip, gridStroke } from './chartKit';
import { buildArtistMoodProfile, EMOTIONAL_MOOD_TAXONOMY } from '../engines/emotionalEngine';
import Reveal from './Reveal';

interface DashboardProps {
  data: MusicDnaData;
}

const cardVariants = {
  initial: { opacity: 0, y: 24, scale: 0.96 },
  animate: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  }),
};

type DashboardIconMotif = 'wave' | 'orbit' | 'stack' | 'calendar' | 'crown' | 'pulse' | 'moon' | 'clock' | 'flame' | 'burst' | 'session';

interface DashboardSignalIconProps {
  icon: React.ElementType;
  color: string;
  secondary: string;
  motif: DashboardIconMotif;
  size?: 'sm' | 'md' | 'lg';
}

const iconSizeClasses = {
  sm: {
    shell: 'h-11 w-11 rounded-2xl',
    icon: 'h-4 w-4',
    glow: '-inset-1',
  },
  md: {
    shell: 'h-[52px] w-[52px] rounded-2xl',
    icon: 'h-5 w-5',
    glow: '-inset-1.5',
  },
  lg: {
    shell: 'h-16 w-16 rounded-3xl',
    icon: 'h-7 w-7',
    glow: '-inset-2',
  },
};

function MotifLayer({ motif, color, secondary }: { motif: DashboardIconMotif; color: string; secondary: string }) {
  if (motif === 'wave') {
    return (
      <div className="absolute inset-x-3 bottom-3 flex h-5 items-end justify-between opacity-70">
        {[0.38, 0.78, 0.5, 1, 0.62].map((height, index) => (
          <span
            key={height}
            className="w-1 rounded-full"
            style={{ height: `${height * 100}%`, backgroundColor: index % 2 ? color : secondary }}
          />
        ))}
      </div>
    );
  }

  if (motif === 'orbit') {
    return (
      <>
        <span className="absolute inset-2 rounded-full border" style={{ borderColor: `${color}55` }} />
        <span className="absolute inset-4 rounded-full border border-dashed" style={{ borderColor: `${secondary}70` }} />
        <span className="absolute right-2 top-3 h-2 w-2 rounded-full" style={{ backgroundColor: secondary, boxShadow: `0 0 12px ${secondary}` }} />
      </>
    );
  }

  if (motif === 'stack') {
    return (
      <>
        <span className="absolute bottom-3 left-3 right-3 h-2 rounded-full" style={{ backgroundColor: `${secondary}70` }} />
        <span className="absolute bottom-5 left-4 right-4 h-2 rounded-full" style={{ backgroundColor: `${color}75` }} />
        <span className="absolute bottom-7 left-5 right-5 h-2 rounded-full" style={{ backgroundColor: `${secondary}55` }} />
      </>
    );
  }

  if (motif === 'calendar') {
    return (
      <div className="absolute inset-3 grid grid-cols-3 gap-1 opacity-70">
        {Array.from({ length: 9 }, (_, index) => (
          <span
            key={index}
            className="rounded-[4px]"
            style={{ backgroundColor: index % 2 ? `${color}80` : `${secondary}70` }}
          />
        ))}
      </div>
    );
  }

  if (motif === 'crown') {
    return (
      <>
        <span className="absolute left-3 top-4 h-5 w-2 rotate-[-24deg] rounded-full" style={{ backgroundColor: `${secondary}65` }} />
        <span className="absolute left-1/2 top-2 h-7 w-2 -translate-x-1/2 rounded-full" style={{ backgroundColor: `${color}70` }} />
        <span className="absolute right-3 top-4 h-5 w-2 rotate-[24deg] rounded-full" style={{ backgroundColor: `${secondary}65` }} />
      </>
    );
  }

  if (motif === 'pulse') {
    return (
      <svg className="absolute inset-0 h-full w-full opacity-70" viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M8 35h9l5-14 8 27 6-20 4 7h16"
          fill="none"
          stroke={secondary}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
      </svg>
    );
  }

  if (motif === 'moon') {
    return (
      <>
        <span className="absolute inset-4 rounded-full" style={{ backgroundColor: `${color}75` }} />
        <span className="absolute bottom-4 right-3 h-7 w-7 rounded-full" style={{ backgroundColor: '#07101f' }} />
        <span className="absolute left-3 top-3 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: secondary }} />
        <span className="absolute right-4 top-4 h-1 w-1 rounded-full" style={{ backgroundColor: secondary }} />
      </>
    );
  }

  if (motif === 'clock') {
    return (
      <>
        <span className="absolute inset-3 rounded-full border-2" style={{ borderColor: `${color}65` }} />
        <span className="absolute left-1/2 top-1/2 h-4 w-0.5 origin-bottom -translate-y-full rounded-full" style={{ backgroundColor: secondary }} />
        <span className="absolute left-1/2 top-1/2 h-0.5 w-4 origin-left rounded-full" style={{ backgroundColor: color }} />
      </>
    );
  }

  if (motif === 'flame') {
    return (
      <>
        <span className="absolute left-4 top-3 h-8 w-5 rounded-full rounded-br-sm" style={{ backgroundColor: `${secondary}75`, transform: 'rotate(28deg)' }} />
        <span className="absolute right-4 top-5 h-6 w-4 rounded-full rounded-bl-sm" style={{ backgroundColor: `${color}75`, transform: 'rotate(-24deg)' }} />
      </>
    );
  }

  if (motif === 'burst') {
    return (
      <>
        {Array.from({ length: 8 }, (_, index) => (
          <span
            key={index}
            className="absolute left-1/2 top-1/2 h-1.5 w-5 origin-left rounded-full"
            style={{
              backgroundColor: index % 2 ? color : secondary,
              transform: `rotate(${index * 45}deg) translateX(8px)`,
              opacity: 0.68,
            }}
          />
        ))}
      </>
    );
  }

  return (
    <>
      <span className="absolute left-3 right-3 top-4 h-2 rounded-full" style={{ backgroundColor: `${color}70` }} />
      <span className="absolute left-4 right-4 top-7 h-2 rounded-full" style={{ backgroundColor: `${secondary}70` }} />
      <span className="absolute left-5 right-5 top-10 h-2 rounded-full" style={{ backgroundColor: `${color}55` }} />
    </>
  );
}

function DashboardSignalIcon({ icon: Icon, color, secondary, motif, size = 'md' }: DashboardSignalIconProps) {
  const sizeClass = iconSizeClasses[size];

  return (
    <div className={`relative shrink-0 ${sizeClass.shell}`}>
      <div className={`absolute ${sizeClass.glow} rounded-[inherit] blur-xl opacity-45`}
        style={{ background: `linear-gradient(135deg, ${color}55, ${secondary}35)` }} />
      <div
        className="absolute inset-0 overflow-hidden rounded-[inherit] border"
        style={{
          borderColor: `${color}55`,
          background: `linear-gradient(135deg, ${color}24, ${secondary}16 52%, rgba(255,255,255,0.04))`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), 0 10px 28px ${color}16`,
        }}
      >
        <div className="absolute -right-5 -top-5 h-14 w-14 rounded-full opacity-45" style={{ backgroundColor: secondary }} />
        <div className="absolute -bottom-5 -left-5 h-14 w-14 rounded-full opacity-35" style={{ backgroundColor: color }} />
        <MotifLayer motif={motif} color={color} secondary={secondary} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-2xl border border-white/15 bg-black/20 p-2 backdrop-blur-sm">
          <Icon className={sizeClass.icon} style={{ color, filter: `drop-shadow(0 0 10px ${color}75)` }} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ data }: DashboardProps) {
  const { tc, t, lang, setActiveTab, setSelectedArtistName, setTopSubTab } = useApp();
  const metrics = data.core_metrics;
  const topArtistsData = useMemo(
    () => data.top_artists.slice(0, 10).map(artist => ({
      ...artist,
      moodColor: EMOTIONAL_MOOD_TAXONOMY[buildArtistMoodProfile(artist).moodKey].color,
    })),
    [data.top_artists],
  );
  const records = getRecords(data);

  /* ── Advanced KPIs ── */
  const bestYear = getPeakYear(data);
  const avgPerActiveDay = metrics.active_days > 0
    ? Math.round(metrics.total_plays / metrics.active_days)
    : 0;
  const nightRatio = getNightRatio(data);
  const peakHour = getPeakHour(data);

  const COLORS = ['#00f2fe', '#f72585', '#7209b7', '#4cc9f0', '#10b981',
                  '#fb923c', '#a78bfa', '#34d399', '#f59e0b', '#ec4899'];

  const formatNum = (num: number) => formatNumber(num, lang === 'en' ? 'en-US' : 'es-ES');
  const formatRecordDate = (date?: string) => {
    if (!date) return t.dashboard.notAvailable;
    return new Date(`${date}T00:00:00`).toLocaleDateString((lang === 'en' ? 'en-US' : 'es-ES'), { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const mainKpis = [
    {
      icon: AudioWaveform,
      label: t.dashboard.kpiTotalPlays,
      val: metrics.total_plays,
      delay: 0,
      color: tc.c1,
      secondary: '#a78bfa',
      motif: 'wave' as const,
      sub: t.dashboard.kpiTotalPlaysSub,
    },
    {
      icon: Headphones,
      label: t.dashboard.kpiHoursListened,
      val: metrics.listening_hours,
      delay: 0.1,
      color: tc.c2,
      secondary: '#fb923c',
      motif: 'orbit' as const,
      sub: t.dashboard.kpiHoursListenedSub(formatNum(metrics.listening_days)),
    },
    {
      icon: Mic2,
      label: t.dashboard.kpiUniqueArtists,
      val: metrics.unique_artists,
      delay: 0.2,
      color: tc.c3,
      secondary: '#4cc9f0',
      motif: 'stack' as const,
      sub: t.dashboard.kpiUniqueArtistsSub,
    },
    {
      icon: CalendarCheck,
      label: t.dashboard.kpiActiveDays,
      val: metrics.active_days,
      delay: 0.3,
      color: '#10b981',
      secondary: '#facc15',
      motif: 'calendar' as const,
      sub: t.dashboard.kpiActiveDaysSub,
    },
  ];

  const advancedKpis = [
    {
      icon: Trophy,
      label: t.dashboard.kpiBestYear,
      val: String(bestYear?.year ?? '—'),
      sub: `${formatNum(bestYear?.plays ?? 0)} ${t.dashboard.playsLegend.toLowerCase()} · ${bestYear ? localizeEraLabel(bestYear.era_label, lang) : ''}`,
      color: tc.c1,
      secondary: '#facc15',
      motif: 'crown' as const,
      numeric: false,
    },
    {
      icon: Activity,
      label: t.dashboard.kpiAvgPerDay,
      val: null,
      numericTarget: avgPerActiveDay,
      sub: t.dashboard.kpiAvgPerDaySub(formatNum(metrics.active_days)),
      color: tc.c2,
      secondary: '#22d3ee',
      motif: 'pulse' as const,
      numeric: true,
    },
    {
      icon: Moon,
      label: t.dashboard.kpiNightListening,
      val: null,
      numericTarget: nightRatio,
      suffix: '%',
      sub: t.dashboard.kpiNightListeningSub,
      color: tc.c3,
      secondary: '#818cf8',
      motif: 'moon' as const,
      numeric: true,
    },
    {
      icon: Gauge,
      label: t.dashboard.kpiPeakHour,
      val: peakHour,
      sub: t.dashboard.kpiPeakHourSub,
      color: '#10b981',
      secondary: '#fb923c',
      motif: 'clock' as const,
      numeric: false,
    },
  ];

  const recordCards = [
    {
      icon: Flame,
      label: t.dashboard.recordLongestStreak,
      val: records.longest_streak_days,
      unit: records.longest_streak_start
        ? t.dashboard.recordStreakUnit(formatRecordDate(records.longest_streak_start), formatRecordDate(records.longest_streak_end))
        : t.dashboard.recordStreakUnitFallback,
      color: '#fb923c',
      secondary: '#ef4444',
      motif: 'flame' as const,
    },
    {
      icon: CalendarClock,
      label: t.dashboard.recordMaxDay,
      val: records.max_day_plays,
      unit: t.dashboard.recordMaxDayUnit(formatRecordDate(records.max_day_date)),
      color: tc.c2,
      secondary: '#facc15',
      motif: 'calendar' as const,
    },
    {
      icon: Timer,
      label: t.dashboard.recordLongestSession,
      val: Math.round(records.longest_session_minutes),
      unit: t.dashboard.recordSessionUnit(records.longest_session_tracks),
      color: tc.c1,
      secondary: '#a78bfa',
      motif: 'session' as const,
    },
    {
      icon: Zap,
      label: t.dashboard.recordBestSession,
      val: records.best_session_tracks,
      unit: t.dashboard.recordBestSessionUnit(records.best_session_start ? new Date(records.best_session_start).toLocaleDateString((lang === 'en' ? 'en-US' : 'es-ES'), { month: 'short', year: 'numeric' }) : t.dashboard.recordUnknownDate),
      color: '#a78bfa',
      secondary: '#22d3ee',
      motif: 'burst' as const,
    },
  ];

  /* ── Smart genre aggregation from top_artists ── */
  const genreMap: Record<string, number> = {};
  data.top_artists.forEach(a => {
    const g = normalizeGenre(a.genre);
    genreMap[g] = (genreMap[g] || 0) + a.plays;
  });
  const richGenreData = Object.entries(genreMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, plays]) => ({ name, plays }));

  // Flatten the heatmap matrix into hours/weekdays for the GitHub-style grid
  const weekdays = getWeekdayNames(lang === 'en' ? 'en-US' : 'es-ES');
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  // Buscar el valor máximo del heatmap para normalizar los colores
  let maxHeatmapValue = 1;
  for (let h = 0; h < 24; h++) {
    for (let w = 0; w < 7; w++) {
      if (data.heatmap[h][w] > maxHeatmapValue) {
        maxHeatmapValue = data.heatmap[h][w];
      }
    }
  }

  // Yearly plays data for area chart
  const yearlyData = data.yearly_eras.map(e => ({
    year: String(e.year),
    plays: e.plays,
    artistas: e.unique_artists,
    diversidad: Math.round(e.diversity_index),
  }));

  // Prepare hourly data for bar chart
  const hourlyData = data.heatmap.map((dayData, hour) => {
    const totalHourPlays = dayData.reduce((a, b) => a + b, 0);
    return {
      hour: `${hour.toString().padStart(2, '0')}:00`,
      plays: totalHourPlays
    };
  });
  const maxHourlyPlays = Math.max(...hourlyData.map(h => h.plays), 0);

  const ArtistTick = ({ x, y, payload }: any) => (
    <foreignObject x={x - 148} y={y - 12} width={144} height={24}>
      <div className="flex items-center justify-end gap-1.5 h-full">
        <span className="text-[11px] text-gray-300 truncate">{payload.value}</span>
        <ArtistAvatar name={payload.value} size={20} />
      </div>
    </foreignObject>
  );

  return (
    <div className="space-y-10 animate-fade-in">
      <SectionNarrative content={t.deepNarratives.dashboard} accent="c1" />

      {/* 1. Main KPIs — animated stagger */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {mainKpis.map(({ icon, label, val, delay, color, secondary, motif, sub }, i) => (
          <motion.div key={label} custom={i} variants={cardVariants} initial="initial" animate="animate"
            className="glass-panel p-5 md:p-6 rounded-3xl relative overflow-hidden group border-b-2 min-h-[210px]"
            style={{ borderBottomColor: `${color}60` }}>
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-15 blur-2xl transition-opacity group-hover:opacity-25"
              style={{ backgroundColor: color }} />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <DashboardSignalIcon icon={icon} color={color} secondary={secondary} motif={motif} size="lg" />
              <div className="flex min-h-16 flex-col items-end justify-between">
                <span className="h-2 w-10 rounded-full" style={{ background: `linear-gradient(90deg, ${color}, ${secondary})` }} />
                <span className="text-[10px] font-mono font-black uppercase tracking-widest" style={{ color }}>
                  0{i + 1}
                </span>
              </div>
            </div>
            <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${color}08, transparent 70%)` }} />
            <p className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest relative z-10 mt-5">{label}</p>
            <p className="text-3xl font-black text-white mt-2 font-mono relative z-10 leading-none">
              <CountUp target={val} duration={1.8} delay={delay} />
            </p>
            <p className="text-xs text-gray-400 mt-3 relative z-10 leading-snug">{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* 1b. Advanced KPIs row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {advancedKpis.map(({ icon, label, val, numericTarget, suffix, sub, color, secondary, motif, numeric }, i) => (
          <motion.div key={label} custom={i + 4} variants={cardVariants} initial="initial" animate="animate"
            className="glass-panel p-4 rounded-2xl relative overflow-hidden border-b-2 min-h-[146px]"
            style={{ borderBottomColor: color }}>
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${color}08, transparent 70%)` }} />
            <div className="relative z-10 flex items-start gap-3">
              <DashboardSignalIcon icon={icon} color={color} secondary={secondary} motif={motif} size="sm" />
              <div className="min-w-0">
                <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">{label}</p>
                <p className="text-2xl font-black mt-1 font-mono leading-tight" style={{ color }}>
                  {numeric && numericTarget !== undefined
                    ? <CountUp target={numericTarget} duration={1.6} delay={0.5 + i * 0.1} suffix={suffix ?? ''} />
                    : val}
                </p>
                <p className="text-[10px] text-gray-500 mt-1 leading-tight">{sub}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 1c. Records strip */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.5 }}
        className="glass-panel p-5 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <DashboardSignalIcon icon={Flame} color={tc.c2} secondary="#fb923c" motif="flame" size="sm" />
          <span className="text-xs font-mono font-bold text-white uppercase tracking-widest">
            {t.dashboard.personalRecords}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {recordCards.map(({ icon, label, val, unit, color, secondary, motif }) => (
            <div key={label} className="p-3 rounded-xl bg-white/3 border border-white/5 text-center min-h-[154px] flex flex-col items-center justify-between">
              <DashboardSignalIcon icon={icon} color={color} secondary={secondary} motif={motif} size="sm" />
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-xl font-black font-mono mt-1" style={{ color }}>
                <CountUp target={Number(val)} duration={1.4} delay={1} />
              </p>
              <p className="text-[10px] text-gray-500">{unit}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 2. Top Artists + Genre DNA */}
      <Reveal>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Artists */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-2">
          <div className="flex items-center space-x-3 mb-6">
            <DashboardSignalIcon icon={Trophy} color={tc.c1} secondary="#facc15" motif="crown" size="sm" />
            <h3 className="text-lg font-bold font-mono uppercase tracking-wider text-white">
              {t.dashboard.topArtistsTitle}
            </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topArtistsData} layout="vertical" margin={{ left: 60, right: 20, top: 0, bottom: 0 }}>
                <ChartGradients specs={topArtistsData.map((artist, index) => ({
                  id: `artistBar-${index}`,
                  color: artist.moodColor ?? tc.c1,
                  direction: 'h' as const,
                  from: index === 0 ? 1 : 0.85,
                  to: 0.3,
                }))} />
                <XAxis type="number" {...axisProps(tc.mode)} />
                <YAxis type="category" dataKey="name" width={150} {...axisProps(tc.mode)} tick={<ArtistTick />} />
                <Tooltip
                  cursor={barCursor(tc.c1)}
                  content={
                    <GlassTooltip
                      renderHeader={(row) => (
                        <div className="flex items-center gap-2">
                          <ArtistAvatar name={String(row.name)} size={28} />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-white">{String(row.name)}</p>
                            <p className="text-[9px] font-mono uppercase tracking-wider text-gray-400">{String(row.genre ?? '')}</p>
                          </div>
                        </div>
                      )}
                    />
                  }
                />
                <Bar dataKey="plays" name={t.dashboard.playsLegend} radius={[0, 6, 6, 0]} className="cursor-pointer">
                  {topArtistsData.map((artist, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#artistBar-${index})`} 
                      stroke={artist.moodColor ?? tc.c1} 
                      strokeOpacity={0.5} 
                      strokeWidth={1}
                      onClick={() => {
                        setSelectedArtistName(artist.name);
                        setTopSubTab('artists');
                        setActiveTab('top');
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Genre DNA */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <DashboardSignalIcon icon={Star} color={tc.c2} secondary={tc.c3} motif="burst" size="sm" />
              <h3 className="text-lg font-bold font-mono uppercase tracking-wider text-white">
                {t.dashboard.genreDnaTitle}
              </h3>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={richGenreData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} cornerRadius={5} dataKey="plays" nameKey="name">
                    {richGenreData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<GlassTooltip accent={tc.c2} unit="plays" />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-1.5 mt-2 max-h-40 overflow-y-auto pr-1">
            {richGenreData.map((genre, idx) => (
              <div key={genre.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-gray-300 truncate">{genre.name}</span>
                </div>
                <span className="font-mono font-bold shrink-0 ml-2" style={{ color: COLORS[idx % COLORS.length] }}>
                  {genre.plays.toLocaleString((lang === 'en' ? 'en-US' : 'es-ES'))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </Reveal>

      {/* 3. Heatmap */}
      <Reveal>
      <div className="glass-panel p-6 rounded-3xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <DashboardSignalIcon icon={CalendarClock} color={tc.c1} secondary={tc.c2} motif="calendar" size="sm" />
            <h3 className="text-lg font-bold font-mono uppercase tracking-wider text-white">
              {t.dashboard.heatmapTitle}
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
            <span>{t.dashboard.heatmapLess}</span>
            <div className="flex space-x-1">
              {[0.08, 0.2, 0.4, 0.7, 1].map(o => (
                <div key={o} className="w-3 h-3 rounded" style={{ backgroundColor: tc.c1, opacity: o }} />
              ))}
            </div>
            <span>{t.dashboard.heatmapMore}</span>
          </div>
        </div>
        <div className="overflow-x-auto w-full pb-4">
          <div className="min-w-[800px] flex">
            <div className="flex flex-col justify-between pr-4 pt-6 pb-2 text-xs font-mono text-gray-400 text-right w-12">
              {weekdays.map(day => <div key={day} className="h-6 flex items-center justify-end">{day}</div>)}
            </div>
            <div className="flex flex-1 flex-col space-y-1">
              <div className="flex justify-between text-xs font-mono text-gray-400 pb-2">
                {hours.map((h, i) => (
                  <div key={h} className="w-7 text-center shrink-0 text-[10px]">
                    {i % 3 === 0 ? h.split(':')[0] : ''}
                  </div>
                ))}
              </div>
              {Array.from({ length: 7 }).map((_, w) => (
                <div key={w} className="flex space-x-1 h-6">
                  {Array.from({ length: 24 }).map((_, h) => {
                    const val = data.heatmap[h][w];
                    return (
                      <div key={`${h}-${w}`}
                        className="w-7 h-6 rounded transition-transform hover:scale-125 cursor-default"
                        style={{ backgroundColor: tc.c1, opacity: val === 0 ? 0.04 : 0.05 + (val / maxHeatmapValue) * 0.95 }}
                        title={`${weekdays[w]}, ${hours[h]}: ${formatNum(val)} plays`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center font-mono">
          {t.dashboard.heatmapFooter}
        </p>
      </div>
      </Reveal>

      {/* 4. Hourly bar chart */}
      <Reveal>
      <div className="glass-panel p-6 rounded-3xl">
        <div className="flex items-center space-x-3 mb-6">
          <DashboardSignalIcon icon={Clock} color={tc.c4} secondary="#10b981" motif="clock" size="sm" />
          <h3 className="text-lg font-bold font-mono uppercase tracking-wider text-white">
            {t.dashboard.hourlyRhythmTitle}
          </h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <ChartGradients specs={[
                { id: 'hourlyGrad', color: tc.c4, from: 0.85, to: 0.18 },
                { id: 'hourlyPeak', color: tc.c1, from: 1, to: 0.35 },
              ]} />
              <XAxis dataKey="hour" {...axisProps(tc.mode)} />
              <YAxis {...axisProps(tc.mode)} />
              <Tooltip cursor={barCursor(tc.c4)} content={<GlassTooltip accent={tc.c4} />} />
              <Bar dataKey="plays" name={t.dashboard.playsLegend} radius={[5, 5, 0, 0]}>
                {hourlyData.map((entry, index) => {
                  const isPeak = entry.plays === maxHourlyPlays && entry.plays > 0;
                  return (
                    <Cell
                      key={`hour-${index}`}
                      fill={isPeak ? 'url(#hourlyPeak)' : 'url(#hourlyGrad)'}
                      stroke={isPeak ? tc.c1 : 'none'}
                      strokeWidth={isPeak ? 1.5 : 0}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      </Reveal>

      {/* 5. Yearly Evolution Area Chart */}
      <Reveal>
      <div className="glass-panel p-6 rounded-3xl">
        <div className="flex items-center space-x-3 mb-6">
          <DashboardSignalIcon icon={TrendingUp} color={tc.c1} secondary={tc.c3} motif="pulse" size="sm" />
          <h3 className="text-lg font-bold font-mono uppercase tracking-wider text-white">
            {t.dashboard.evolutionTitle}
          </h3>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={yearlyData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="dashGradPlays" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={tc.c1} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={tc.c1} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="dashGradArt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={tc.c3} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={tc.c3} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(tc.c1)} />
              <XAxis dataKey="year" {...axisProps(tc.mode)} />
              <YAxis {...axisProps(tc.mode)} />
              <Tooltip content={<GlassTooltip accent={tc.c1} />} />
              <Area type="monotone" dataKey="plays" name={t.dashboard.playsLegend}
                stroke={tc.c1} strokeWidth={2.5} fill="url(#dashGradPlays)"
                dot={{ fill: tc.c1, r: 4, strokeWidth: 0 }} activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }} />
              <Area type="monotone" dataKey="artistas" name={t.dashboard.uniqueArtistsLegend}
                stroke={tc.c3} strokeWidth={2} fill="url(#dashGradArt)"
                dot={{ fill: tc.c3, r: 3, strokeWidth: 0 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4">
          {data.yearly_eras.slice(0, 4).concat(data.yearly_eras.slice(-4)).filter((v, i, a) => a.findIndex(x => x.year === v.year) === i).map(yr => (
            <div key={yr.year} className="text-center p-2 bg-white/3 border border-white/5 rounded-xl">
              <p className="text-xs font-mono font-bold text-white">{yr.year}</p>
              <p className="text-[10px] font-mono" style={{ color: tc.c1 }}>{formatNum(yr.plays)} plays</p>
            </div>
          ))}
        </div>
      </div>
      </Reveal>
    </div>
  );
}
