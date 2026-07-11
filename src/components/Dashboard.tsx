import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from 'recharts';
import {
  Activity, ArrowUpRight, AudioWaveform, CalendarCheck, CalendarClock, Clock, Flame,
  Gauge, Headphones, Mic2, Moon, Sparkles, Star, Timer, TrendingUp, Trophy, Zap,
} from 'lucide-react';
import { MusicDnaData } from '../types';
import CountUp from './CountUp';
import ArtistAvatar from './ArtistAvatar';
import { useApp } from '../context/AppContext';
import { formatNumber, getNightRatio, getPeakHour, getPeakYear, getRecords, getWeekdayNames, normalizeGenre } from '../utils/analytics';
import SectionNarrative from './SectionNarrative';
import { localizeEraLabel } from '../utils/localeText';
import { axisProps, barCursor, ChartGradients, GlassTooltip, gridStroke, CHART_ANIMATION } from './chartKit';
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

interface EditorialChapterHeaderProps {
  id: string;
  index: string;
  title: string;
  note: string;
  icon: React.ElementType;
  color: string;
  secondary: string;
  motif: DashboardIconMotif;
}

function EditorialChapterHeader({
  id, index, title, note, icon, color, secondary, motif,
}: EditorialChapterHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-5 sm:mb-7 sm:gap-4 sm:pb-6 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <DashboardSignalIcon icon={icon} color={color} secondary={secondary} motif={motif} size="sm" />
        <div className="min-w-0">
          <p className="text-[10px] font-mono font-black uppercase tracking-[0.28em]" style={{ color }}>
            {index}
          </p>
          <h2 id={id} className="mt-1 break-words text-[1.35rem] font-black leading-tight tracking-tight text-white sm:text-2xl md:text-3xl">
            {title}
          </h2>
        </div>
      </div>
      <p className="max-w-md text-[13px] leading-relaxed text-gray-400 sm:text-sm md:text-right">{note}</p>
    </header>
  );
}

function useMediaQuery(query: string) {
  const readMatch = () => typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(readMatch);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

export default function Dashboard({ data }: DashboardProps) {
  const { tc, t, lang, setActiveTab, setSelectedArtistName, setTopSubTab } = useApp();
  const reduceMotion = Boolean(useReducedMotion());
  const showDesktopArtistChart = useMediaQuery('(min-width: 768px)');
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

  const editorialCopy = lang === 'en'
    ? {
        archiveEyebrow: 'Your listening archive',
        archiveTitle: 'A life measured in music',
        archiveNote: 'Every play leaves a coordinate in your personal sound map.',
        supportingSignals: 'Supporting signals',
        dominantSignal: 'Dominant signal',
        topArtist: 'No. 1 artist',
        archiveShare: 'of the complete archive',
        openArtist: (name: string) => `Open ${name} in Top Artists`,
        rankedArtist: (rank: number, name: string) => `View rank ${rank}: ${name}`,
        tasteChapter: 'Taste architecture',
        tasteNote: 'The artists and genres that hold the center of gravity.',
        rhythmChapter: 'Time signature',
        rhythmNote: 'When listening becomes ritual across the week and the day.',
        evolutionChapter: 'The long arc',
        evolutionNote: 'How your musical identity accumulated, shifted and expanded.',
        recordsChapter: 'Personal milestones',
        recordsNote: 'The sessions and streaks that pushed beyond the ordinary.',
      }
    : {
        archiveEyebrow: 'Tu archivo de escucha',
        archiveTitle: 'Una vida medida en música',
        archiveNote: 'Cada reproducción deja una coordenada en tu mapa sonoro personal.',
        supportingSignals: 'Señales de apoyo',
        dominantSignal: 'Señal dominante',
        topArtist: 'Artista n.º 1',
        archiveShare: 'del archivo completo',
        openArtist: (name: string) => `Abrir ${name} en Top Artistas`,
        rankedArtist: (rank: number, name: string) => `Ver puesto ${rank}: ${name}`,
        tasteChapter: 'Arquitectura del gusto',
        tasteNote: 'Los artistas y géneros que sostienen tu centro de gravedad.',
        rhythmChapter: 'Compás del tiempo',
        rhythmNote: 'Cuándo la escucha se convierte en ritual durante la semana y el día.',
        evolutionChapter: 'El arco completo',
        evolutionNote: 'Cómo tu identidad musical se acumuló, cambió y se expandió.',
        recordsChapter: 'Hitos personales',
        recordsNote: 'Las sesiones y rachas que superaron lo cotidiano.',
      };

  const topArtist = topArtistsData[0];
  const topArtistShare = topArtist && metrics.total_plays > 0
    ? (topArtist.plays / metrics.total_plays) * 100
    : 0;
  const eraYears = data.yearly_eras.map(era => era.year).filter(Number.isFinite);
  const yearRange = eraYears.length > 0
    ? `${Math.min(...eraYears)}—${Math.max(...eraYears)}`
    : t.dashboard.notAvailable;

  const supportingKpis = [
    {
      icon: Headphones,
      label: t.dashboard.kpiHoursListened,
      val: metrics.listening_hours,
      delay: 0.2,
      color: tc.c2,
      secondary: '#fb923c',
      motif: 'orbit' as const,
      sub: t.dashboard.kpiHoursListenedSub(formatNum(metrics.listening_days)),
    },
    {
      icon: Mic2,
      label: t.dashboard.kpiUniqueArtists,
      val: metrics.unique_artists,
      delay: 0.3,
      color: tc.c3,
      secondary: '#4cc9f0',
      motif: 'stack' as const,
      sub: t.dashboard.kpiUniqueArtistsSub,
    },
    {
      icon: CalendarCheck,
      label: t.dashboard.kpiActiveDays,
      val: metrics.active_days,
      delay: 0.4,
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

  const openArtist = (name: string) => {
    setSelectedArtistName(name);
    setTopSubTab('artists');
    setActiveTab('top');
  };

  return (
    <div data-testid="dashboard-layout" className="min-w-0 space-y-12 overflow-x-clip animate-fade-in sm:space-y-16">
      <SectionNarrative content={t.deepNarratives.dashboard} accent="c1" />

      {/* 1. Editorial protagonist — one unmistakable opening signal. */}
      <motion.section
        aria-labelledby="dashboard-protagonist-heading"
        initial={reduceMotion ? false : { opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.65, ease: [0.4, 0, 0.2, 1] }}
        className="glass-panel relative isolate overflow-hidden rounded-[1.5rem] p-4 min-[420px]:p-5 sm:rounded-[2rem] md:p-9 lg:p-11"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-80"
          style={{
            background: `radial-gradient(circle at 12% 12%, ${tc.c1}2e, transparent 34%), radial-gradient(circle at 88% 78%, ${tc.c3}24, transparent 38%), linear-gradient(135deg, ${tc.c1}0c, transparent 44%, ${tc.c2}0d)`,
          }}
        />
        <div aria-hidden="true" className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -right-10 -top-10 -z-10 h-44 w-44 rounded-full border border-dashed border-white/10" />

        <div className="grid min-w-0 gap-7 sm:gap-10 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] xl:items-stretch">
          <div className="flex min-w-0 flex-col justify-between">
            <div>
              <div className="mb-6 flex flex-col items-start justify-between gap-3 min-[420px]:flex-row min-[420px]:items-center sm:mb-7 sm:gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <DashboardSignalIcon icon={Sparkles} color={tc.c1} secondary={tc.c2} motif="burst" size="sm" />
                  <div>
                    <p className="text-[10px] font-mono font-black uppercase tracking-[0.28em]" style={{ color: tc.c1 }}>
                      01 · {editorialCopy.archiveEyebrow}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{yearRange}</p>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-gray-400 sm:text-[10px]">
                  ✦ Nova Music DNA
                </span>
              </div>

              <h2 id="dashboard-protagonist-heading" className="max-w-3xl text-[clamp(2rem,10.5vw,3rem)] font-black leading-[0.96] tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
                {editorialCopy.archiveTitle}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-400 md:text-base">
                {editorialCopy.archiveNote}
              </p>
            </div>

            <div className="mt-8 min-w-0 border-l-2 pl-4 sm:mt-10 sm:pl-5 md:mt-14 md:pl-7" style={{ borderColor: tc.c1 }}>
              <p className="text-xs font-mono font-black uppercase tracking-[0.22em] text-gray-400">
                {t.dashboard.kpiTotalPlays}
              </p>
              <p className="mt-2 max-w-full font-mono text-[clamp(2.65rem,14vw,4.5rem)] font-black leading-none tracking-[-0.075em] text-white tabular-nums sm:text-7xl lg:text-[6.5rem]">
                <CountUp target={metrics.total_plays} duration={reduceMotion ? 0.001 : 1.9} />
              </p>
              <p className="mt-4 text-xs text-gray-500 md:text-sm">{t.dashboard.kpiTotalPlaysSub}</p>
            </div>
          </div>

          <div className="relative flex min-h-[310px] min-w-0 flex-col justify-between overflow-hidden rounded-[1.4rem] border border-white/10 bg-black/20 p-4 backdrop-blur-md sm:min-h-[330px] sm:rounded-[1.75rem] sm:p-5 md:p-7">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-75"
              style={{ background: `linear-gradient(145deg, ${topArtist?.moodColor ?? tc.c2}22, transparent 48%, ${tc.c1}12)` }}
            />
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono font-black uppercase tracking-[0.24em]" style={{ color: topArtist?.moodColor ?? tc.c2 }}>
                  {editorialCopy.dominantSignal}
                </p>
                <p className="mt-1 text-xs text-gray-500">{editorialCopy.topArtist}</p>
              </div>
              <AudioWaveform className="h-6 w-6" aria-hidden="true" style={{ color: topArtist?.moodColor ?? tc.c2 }} />
            </div>

            {topArtist ? (
              <button
                type="button"
                aria-label={editorialCopy.openArtist(topArtist.name)}
                onClick={() => openArtist(topArtist.name)}
                className="group relative z-10 my-6 flex min-h-[132px] w-full touch-manipulation flex-col items-start justify-center gap-4 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:my-8 sm:min-h-[104px] sm:flex-row sm:items-center sm:gap-5"
              >
                <div className="relative shrink-0">
                  <div className="absolute -inset-2 rounded-full blur-xl opacity-45" style={{ backgroundColor: topArtist.moodColor }} />
                  <ArtistAvatar name={topArtist.name} size={92} tooltip={false} className="relative ring-2 ring-white/20 transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none" />
                </div>
                <div className="min-w-0 max-w-full flex-1 pr-8 sm:pr-0">
                  <p className="break-words text-xl font-black leading-tight text-white [overflow-wrap:anywhere] md:text-2xl">{topArtist.name}</p>
                  <p className="mt-2 max-w-full truncate text-xs font-mono uppercase tracking-wider text-gray-400">{topArtist.genre}</p>
                </div>
                <ArrowUpRight className="absolute right-1 top-1 h-5 w-5 shrink-0 text-gray-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white motion-reduce:transform-none sm:static" aria-hidden="true" />
              </button>
            ) : null}

            <div className="relative z-10 grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
              <div>
                <p className="font-mono text-xl font-black text-white">{formatNum(topArtist?.plays ?? 0)}</p>
                <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-gray-500">{t.dashboard.playsLegend}</p>
              </div>
              <div className="border-l border-white/10 pl-4">
                <p className="font-mono text-xl font-black" style={{ color: topArtist?.moodColor ?? tc.c2 }}>
                  {topArtistShare.toLocaleString(lang === 'en' ? 'en-US' : 'es-ES', { maximumFractionDigits: 1 })}%
                </p>
                <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-gray-500">{editorialCopy.archiveShare}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Secondary metrics support the protagonist instead of competing with it. */}
      <section aria-labelledby="dashboard-supporting-signals">
        <div className="mb-5 flex items-center gap-3">
          <span className="h-px w-10" style={{ backgroundColor: tc.c1 }} />
          <h2 id="dashboard-supporting-signals" className="text-[10px] font-mono font-black uppercase tracking-[0.28em] text-gray-400">
            {editorialCopy.supportingSignals}
          </h2>
        </div>
        <div data-testid="dashboard-supporting-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {supportingKpis.map(({ icon, label, val, delay, color, secondary, motif, sub }, i) => (
            <motion.div
              key={label}
              custom={i}
              variants={cardVariants}
              initial={reduceMotion ? false : 'initial'}
              animate="animate"
              className={`glass-panel group relative overflow-hidden rounded-3xl border-b-2 p-4 sm:min-h-[168px] sm:p-5 md:p-6 ${i === 0 ? 'col-span-2 min-h-[150px] sm:col-span-1' : 'min-h-[164px]'}`}
              style={{ borderBottomColor: `${color}75` }}
            >
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20" style={{ backgroundColor: color }} />
              <div className="relative z-10 flex items-start justify-between gap-4">
                <DashboardSignalIcon icon={icon} color={color} secondary={secondary} motif={motif} size="md" />
                <span className="text-[10px] font-mono font-black tracking-[0.22em]" style={{ color }}>0{i + 2}</span>
              </div>
              <div className="relative z-10 mt-5">
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">{label}</p>
                <p className="mt-1 font-mono text-3xl font-black leading-none text-white">
                  <CountUp target={val} duration={reduceMotion ? 0.001 : 1.8} delay={reduceMotion ? 0 : delay} decimals={label === t.dashboard.kpiHoursListened ? 1 : 0} />
                </p>
                <p className="mt-2 text-[11px] leading-snug text-gray-500">{sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <Reveal delay={0.05}>
        <div data-testid="dashboard-advanced-grid" className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 lg:grid-cols-4">
          {advancedKpis.map(({ icon, label, val, numericTarget, suffix, sub, color, secondary, motif, numeric }, i) => (
            <div
              key={label}
              className="glass-panel relative min-h-[150px] overflow-hidden rounded-2xl border-b-2 p-4"
              style={{ borderBottomColor: color }}
            >
              <div className="absolute inset-0 rounded-2xl" aria-hidden="true" style={{ background: `radial-gradient(circle at top right, ${color}0c, transparent 70%)` }} />
              <div className="relative z-10 flex items-start gap-3">
                <DashboardSignalIcon icon={icon} color={color} secondary={secondary} motif={motif} size="sm" />
                <div className="min-w-0">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">{label}</p>
                  <p className="mt-1 font-mono text-2xl font-black leading-tight" style={{ color }}>
                    {numeric && numericTarget !== undefined
                      ? <CountUp target={numericTarget} duration={reduceMotion ? 0.001 : 1.6} delay={reduceMotion ? 0 : 0.5 + i * 0.1} suffix={suffix ?? ''} />
                      : val}
                  </p>
                  <p className="mt-1 text-[10px] leading-tight text-gray-500">{sub}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* 2. Top Artists + Genre DNA */}
      <Reveal>
      <section aria-labelledby="dashboard-taste-heading">
      <EditorialChapterHeader
        id="dashboard-taste-heading"
        index="02 / DNA"
        title={editorialCopy.tasteChapter}
        note={editorialCopy.tasteNote}
        icon={Star}
        color={tc.c2}
        secondary={tc.c3}
        motif="burst"
      />
      <div className="grid min-w-0 grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3">
        {/* Top Artists */}
        <div className="glass-panel min-w-0 rounded-3xl p-4 sm:p-6 lg:col-span-2">
          <div className="mb-5 flex min-w-0 items-center space-x-3 sm:mb-6">
            <DashboardSignalIcon icon={Trophy} color={tc.c1} secondary="#facc15" motif="crown" size="sm" />
            <h3 className="min-w-0 break-words text-base font-bold font-mono uppercase tracking-wider text-white sm:text-lg">
              {t.dashboard.topArtistsTitle}
            </h3>
          </div>

          {/* A native ranking replaces the axis-heavy chart on small screens. */}
          <div
            data-testid="dashboard-mobile-top-artists"
            className="space-y-2 md:hidden"
            role="list"
            aria-label={t.dashboard.topArtistsTitle}
          >
            {!showDesktopArtistChart ? topArtistsData.slice(0, 6).map((artist, index) => (
              <div key={artist.name} role="listitem">
                <button
                  type="button"
                  aria-label={editorialCopy.rankedArtist(index + 1, artist.name)}
                  onClick={() => openArtist(artist.name)}
                  className="group relative grid min-h-[72px] w-full touch-manipulation grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-2xl border border-white/5 bg-white/3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 motion-reduce:transition-none"
                >
                  <div className="relative">
                    <ArtistAvatar name={artist.name} size={44} tooltip={false} />
                    <span
                      className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-black/40 bg-gray-950 px-1 font-mono text-[9px] font-black text-white"
                    >
                      {index + 1}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black leading-tight text-white [overflow-wrap:anywhere]">
                      {artist.name}
                    </p>
                    <p className="mt-1 truncate text-[9px] font-mono uppercase tracking-wider text-gray-500">
                      {artist.genre}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-xs font-black tabular-nums" style={{ color: artist.moodColor ?? tc.c1 }}>
                      {formatNum(artist.plays)}
                    </p>
                    <ArrowUpRight className="ml-auto mt-1 h-4 w-4 text-gray-600 transition group-hover:text-white motion-reduce:transition-none" aria-hidden="true" />
                  </div>
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 origin-left"
                    style={{
                      width: `${Math.max(4, (artist.plays / Math.max(topArtistsData[0]?.plays ?? 1, 1)) * 100)}%`,
                      backgroundColor: artist.moodColor ?? tc.c1,
                      boxShadow: `0 0 12px ${artist.moodColor ?? tc.c1}`,
                    }}
                  />
                </button>
              </div>
            )) : null}
          </div>

          <div data-testid="dashboard-desktop-top-artists" className="hidden h-80 w-full min-w-0 md:block">
            {showDesktopArtistChart ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                <Bar dataKey="plays" name={t.dashboard.playsLegend} radius={[0, 6, 6, 0]} className="cursor-pointer" {...CHART_ANIMATION}>
                  {topArtistsData.map((artist, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#artistBar-${index})`} 
                      stroke={artist.moodColor ?? tc.c1} 
                      strokeOpacity={0.5} 
                      strokeWidth={1}
                      onClick={() => openArtist(artist.name)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Genre DNA */}
        <div className="glass-panel flex min-w-0 flex-col justify-between rounded-3xl p-4 sm:p-6">
          <div>
            <div className="mb-5 flex min-w-0 items-center space-x-3 sm:mb-6">
              <DashboardSignalIcon icon={Star} color={tc.c2} secondary={tc.c3} motif="burst" size="sm" />
              <h3 className="min-w-0 break-words text-base font-bold font-mono uppercase tracking-wider text-white sm:text-lg">
                {t.dashboard.genreDnaTitle}
              </h3>
            </div>
            <div className="h-52 w-full min-w-0 sm:h-60">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
      </section>
      </Reveal>

      {/* 3. Listening rhythm — two related views read as one chapter. */}
      <Reveal delay={0.08}>
      <section aria-labelledby="dashboard-rhythm-heading">
      <EditorialChapterHeader
        id="dashboard-rhythm-heading"
        index="03 / 24H"
        title={editorialCopy.rhythmChapter}
        note={editorialCopy.rhythmNote}
        icon={CalendarClock}
        color={tc.c1}
        secondary={tc.c2}
        motif="calendar"
      />
      <div className="grid min-w-0 gap-6 sm:gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <div className="glass-panel min-w-0 rounded-3xl p-4 sm:p-6">
        <div className="mb-5 flex flex-col justify-between gap-4 sm:mb-6 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center space-x-3">
            <DashboardSignalIcon icon={CalendarClock} color={tc.c1} secondary={tc.c2} motif="calendar" size="sm" />
            <h3 className="min-w-0 break-words text-base font-bold font-mono uppercase tracking-wider text-white sm:text-lg">
              {t.dashboard.heatmapTitle}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-gray-400 sm:gap-3 sm:text-xs">
            <span>{t.dashboard.heatmapLess}</span>
            <div className="flex space-x-1">
              {[0.08, 0.2, 0.4, 0.7, 1].map(o => (
                <div key={o} className="w-3 h-3 rounded" style={{ backgroundColor: tc.c1, opacity: o }} />
              ))}
            </div>
            <span>{t.dashboard.heatmapMore}</span>
          </div>
        </div>
        <div
          data-testid="dashboard-mobile-heatmap"
          className="min-w-0 sm:hidden"
          role="img"
          aria-label={t.dashboard.heatmapTitle}
        >
          <div aria-hidden="true" className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-x-2 gap-y-1.5">
            <span />
            <div className="grid grid-cols-4 font-mono text-[8px] text-gray-500">
              {[0, 6, 12, 18].map(hour => (
                <span key={hour} className="text-left">{String(hour).padStart(2, '0')}</span>
              ))}
            </div>
            {weekdays.map((day, weekdayIndex) => (
              <React.Fragment key={day}>
                <span className="self-center truncate text-right font-mono text-[9px] text-gray-500">
                  {day.slice(0, 2)}
                </span>
                <div className="grid min-w-0 grid-cols-[repeat(24,minmax(0,1fr))] gap-px">
                  {Array.from({ length: 24 }, (_, hourIndex) => {
                    const val = data.heatmap[hourIndex][weekdayIndex];
                    return (
                      <span
                        key={`${hourIndex}-${weekdayIndex}`}
                        className="h-4 min-w-0 rounded-[2px]"
                        style={{
                          backgroundColor: tc.c1,
                          opacity: val === 0 ? 0.04 : 0.08 + (val / maxHeatmapValue) * 0.92,
                        }}
                        title={`${day}, ${hours[hourIndex]}: ${formatNum(val)} plays`}
                      />
                    );
                  })}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div data-testid="dashboard-desktop-heatmap" className="hidden w-full overflow-x-auto pb-4 sm:block">
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
      <div className="glass-panel min-w-0 overflow-hidden rounded-3xl p-4 sm:p-6">
        <div className="mb-5 flex min-w-0 items-center space-x-3 sm:mb-6">
          <DashboardSignalIcon icon={Clock} color={tc.c4} secondary="#10b981" motif="clock" size="sm" />
          <h3 className="min-w-0 break-words text-base font-bold font-mono uppercase tracking-wider text-white sm:text-lg">
            {t.dashboard.hourlyRhythmTitle}
          </h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={hourlyData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <ChartGradients specs={[
                { id: 'hourlyGrad', color: tc.c4, from: 0.85, to: 0.18 },
                { id: 'hourlyPeak', color: tc.c1, from: 1, to: 0.35 },
              ]} />
              <XAxis dataKey="hour" interval={5} minTickGap={18} tickFormatter={(value: string) => value.slice(0, 2)} {...axisProps(tc.mode)} />
              <YAxis width={42} {...axisProps(tc.mode)} />
              <Tooltip cursor={barCursor(tc.c4)} content={<GlassTooltip accent={tc.c4} />} />
              <Bar dataKey="plays" name={t.dashboard.playsLegend} radius={[5, 5, 0, 0]} {...CHART_ANIMATION}>
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
      </div>
      </section>
      </Reveal>

      {/* 4. Yearly Evolution Area Chart */}
      <Reveal delay={0.12}>
      <section aria-labelledby="dashboard-evolution-heading">
      <EditorialChapterHeader
        id="dashboard-evolution-heading"
        index={`04 / ${yearRange}`}
        title={editorialCopy.evolutionChapter}
        note={editorialCopy.evolutionNote}
        icon={TrendingUp}
        color={tc.c3}
        secondary={tc.c1}
        motif="pulse"
      />
      <div className="glass-panel min-w-0 overflow-hidden rounded-3xl p-4 sm:p-6">
        <div className="mb-5 flex min-w-0 items-center space-x-3 sm:mb-6">
          <DashboardSignalIcon icon={TrendingUp} color={tc.c1} secondary={tc.c3} motif="pulse" size="sm" />
          <h3 className="min-w-0 break-words text-base font-bold font-mono uppercase tracking-wider text-white sm:text-lg">
            {t.dashboard.evolutionTitle}
          </h3>
        </div>
        <div className="h-60 w-full min-w-0 sm:h-72">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={yearlyData} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
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
              <XAxis dataKey="year" interval="preserveStartEnd" minTickGap={24} {...axisProps(tc.mode)} />
              <YAxis width={44} {...axisProps(tc.mode)} />
              <Tooltip content={<GlassTooltip accent={tc.c1} />} />
              <Area {...CHART_ANIMATION} type="monotone" dataKey="plays" name={t.dashboard.playsLegend}
                stroke={tc.c1} strokeWidth={2.5} fill="url(#dashGradPlays)"
                dot={{ fill: tc.c1, r: 4, strokeWidth: 0 }} activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }} />
              <Area {...CHART_ANIMATION} type="monotone" dataKey="artistas" name={t.dashboard.uniqueArtistsLegend}
                stroke={tc.c3} strokeWidth={2} fill="url(#dashGradArt)"
                dot={{ fill: tc.c3, r: 3, strokeWidth: 0 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.yearly_eras.slice(0, 4).concat(data.yearly_eras.slice(-4)).filter((v, i, a) => a.findIndex(x => x.year === v.year) === i).map(yr => (
            <div key={yr.year} className="text-center p-2 bg-white/3 border border-white/5 rounded-xl">
              <p className="text-xs font-mono font-bold text-white">{yr.year}</p>
              <p className="text-[10px] font-mono" style={{ color: tc.c1 }}>{formatNum(yr.plays)} plays</p>
            </div>
          ))}
        </div>
      </div>
      </section>
      </Reveal>

      {/* 5. Records close the story as an editorial colophon. */}
      <Reveal delay={0.16}>
      <section aria-labelledby="dashboard-records-heading">
        <EditorialChapterHeader
          id="dashboard-records-heading"
          index="05 / MAX"
          title={editorialCopy.recordsChapter}
          note={editorialCopy.recordsNote}
          icon={Flame}
          color={tc.c2}
          secondary="#fb923c"
          motif="flame"
        />
        <div className="glass-panel overflow-hidden rounded-3xl p-4 sm:p-5 md:p-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <h3 className="text-center text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-white sm:text-xs sm:tracking-[0.22em]">
              {t.dashboard.personalRecords}
            </h3>
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <div data-testid="dashboard-record-grid" className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 lg:grid-cols-4">
            {recordCards.map(({ icon, label, val, unit, color, secondary, motif }, index) => (
              <div
                key={label}
                className="group relative flex min-h-[155px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-white/3 p-4 min-[380px]:min-h-[175px]"
              >
                <div aria-hidden="true" className="absolute -right-10 -top-10 h-24 w-24 rounded-full opacity-10 blur-2xl" style={{ backgroundColor: color }} />
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <DashboardSignalIcon icon={icon} color={color} secondary={secondary} motif={motif} size="sm" />
                  <span className="font-mono text-[9px] font-black tracking-[0.2em] text-gray-600">R{index + 1}</span>
                </div>
                <div className="relative z-10 mt-5">
                  <p className="break-words text-[10px] font-mono uppercase tracking-wide text-gray-400">{label}</p>
                  <p className="mt-1 font-mono text-2xl font-black leading-none" style={{ color }}>
                    <CountUp target={Number(val)} duration={reduceMotion ? 0.001 : 1.4} delay={reduceMotion ? 0 : 0.2 + index * 0.08} />
                  </p>
                  <p className="mt-2 text-[10px] leading-snug text-gray-500">{unit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      </Reveal>
    </div>
  );
}
