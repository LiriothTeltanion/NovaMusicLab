import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, AreaChart, Area, CartesianGrid,
  Treemap,
} from 'recharts';
import { Activity, Calendar, Zap, TrendingUp, Award, Target } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import CountUp from './CountUp';
import {
  buildMonthlyActivity,
  getPeakYear,
  getWeekdayTotals,
  MONTHS_EN,
  MONTHS_ES,
  normalizeGenre,
  WEEKDAYS_EN,
  WEEKDAYS_ES,
} from '../utils/analytics';

interface StatsDeepDiveProps { data: MusicDnaData; }

const CustomTooltip = ({ active, payload, label, tc }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 text-xs font-mono shadow-lg"
      style={{ backgroundColor: '#070e1c', border: `1px solid ${tc?.c1 ?? '#00f2fe'}40` }}>
      <p className="text-white font-bold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? tc?.c1 }}>
          {p.name}: <span className="text-white">{Number(p.value).toLocaleString('es-ES')}</span>
        </p>
      ))}
    </div>
  );
};

export default function StatsDeepDive({ data }: StatsDeepDiveProps) {
  const { tc, lang } = useApp();
  const peakYear = useMemo(() => getPeakYear(data), [data]);
  const [selectedYear, setSelectedYear] = useState<number>(() => peakYear?.year ?? data.yearly_eras[0]?.year ?? new Date().getFullYear());

  useEffect(() => {
    if (peakYear?.year) setSelectedYear(peakYear.year);
  }, [peakYear?.year]);

  const MONTHS  = lang === 'en' ? MONTHS_EN  : MONTHS_ES;
  const WEEKDAYS = lang === 'en' ? WEEKDAYS_EN : WEEKDAYS_ES;

  const fmtNum = (n: number) => Math.round(n).toLocaleString('es-ES');

  /* ── Monthly matrix ── */
  const monthlyActivity = useMemo(() => buildMonthlyActivity(data), [data]);
  const monthlyMatrix = monthlyActivity.rows;

  const years = data.yearly_eras.map(e => e.year);
  const maxMonthlyPlays = Math.max(1, ...monthlyMatrix.map(d => d.plays));

  /* ── Weekday data ── */
  const wdTotals = useMemo(() => getWeekdayTotals(data.heatmap), [data.heatmap]);
  const maxWd = Math.max(1, ...wdTotals);
  const radarData = WEEKDAYS.map((day, i) => ({ day, plays: wdTotals[i] }));

  /* ── Monthly bar chart for selected year ── */
  const selectedYearMonths = MONTHS.map((month, i) => ({
    month,
    plays: monthlyMatrix.find(d => d.year === selectedYear && d.month === i)?.plays ?? 0,
  }));
  const peakMonth = selectedYearMonths.reduce((a, b) => b.plays > a.plays ? b : a, selectedYearMonths[0]);

  /* ── Genre Treemap ── */
  const genreMap: Record<string, number> = {};
  data.top_artists.forEach(a => {
    const g = normalizeGenre(a.genre ?? '');
    genreMap[g] = (genreMap[g] || 0) + a.plays;
  });
  const treemapData = {
    name: 'root',
    children: Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, plays]) => ({
      name, plays, size: plays,
    })),
  };

  /* ── Genre evolution area data ── */
  const genreEvolution = data.yearly_eras.map(era => ({
    year: String(era.year),
    plays: era.plays,
    artistas: era.unique_artists,
    diversidad: era.diversity_index,
  }));

  /* ── Advanced metrics ── */
  const consistencyScore = Math.round(
    Math.min(100, (data.core_metrics.active_days / Math.max(1, data.yearly_eras.length * 365)) * 100)
  );
  const explorationScore = Math.round(
    (data.core_metrics.unique_artists / data.core_metrics.total_plays) * 1000
  );
  const obsessionScore = Math.round(
    Math.max(0, (1 - data.core_metrics.unique_tracks / Math.max(1, data.core_metrics.total_plays)) * 100)
  );

  const TREEMAP_COLORS = [tc.c1, tc.c2, tc.c3, tc.c4, '#fb923c', '#34d399', '#a78bfa', '#f59e0b', '#ec4899', '#6ee7b7'];

  const CustomTreemapContent = ({ x, y, width, height, index, name, plays }: any) => {
    if (!plays || width < 40 || height < 30) return null;
    const color = TREEMAP_COLORS[index % TREEMAP_COLORS.length];
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} rx={8} ry={8}
          style={{ fill: `${color}25`, stroke: `${color}60`, strokeWidth: 1 }} />
        {width > 60 && (
          <>
            <text x={x + 10} y={y + 20} fontSize={11} fontFamily="monospace" fontWeight="bold"
              fill={color} dominantBaseline="auto">{name}</text>
            {height > 40 && (
              <text x={x + 10} y={y + 36} fontSize={9} fontFamily="monospace"
                fill="#9ca3af">{plays.toLocaleString('es-ES')}</text>
            )}
          </>
        )}
      </g>
    );
  };

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex items-center space-x-3">
        <Activity className="w-6 h-6" style={{ color: tc.c1 }} />
        <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
          {lang === 'en' ? 'Pro Statistics' : 'Estadísticas Profundas'}
        </h2>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: lang === 'en' ? 'Consistency' : 'Consistencia',  val: consistencyScore,  suffix: '%', icon: Target,   color: tc.c1, desc: lang === 'en' ? 'Active days / total days' : 'Días activos / días totales' },
          { label: lang === 'en' ? 'Exploration' : 'Exploración',    val: explorationScore,  suffix: '/1k', icon: TrendingUp, color: tc.c2, desc: lang === 'en' ? 'Artists per 1000 plays' : 'Artistas por 1000 plays' },
          { label: lang === 'en' ? 'Obsession'   : 'Obsesión',       val: obsessionScore,    suffix: '%', icon: Zap,     color: tc.c3, desc: lang === 'en' ? 'Repetition rate' : 'Tasa de repetición' },
          { label: lang === 'en' ? 'Peak Year'   : 'Año Cumbre',    val: peakYear?.year ?? 0, numOnly: true, icon: Award,   color: tc.c4, desc: `${fmtNum(peakYear?.plays ?? 0)} plays` },
        ].map(({ label, val, suffix, icon: Icon, color, desc, numOnly }) => (
          <div key={label} className="glass-panel p-5 rounded-2xl border-l-4 relative overflow-hidden"
            style={{ borderLeftColor: color }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${color}08, transparent 70%)` }} />
            <Icon className="w-5 h-5 mb-2 relative z-10" style={{ color }} />
            <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest relative z-10">{label}</p>
            <p className="text-2xl font-black font-mono mt-1 relative z-10" style={{ color }}>
              {numOnly ? val : <CountUp target={val} duration={1.5} delay={0.1} suffix={suffix ?? ''} />}
            </p>
            <p className="text-[10px] text-gray-500 mt-1 relative z-10">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Annual Activity Calendar (Month × Year grid) ── */}
      <div className="glass-panel p-6 rounded-3xl">
        <div className="flex items-center gap-3 mb-5">
          <Calendar className="w-5 h-5" style={{ color: tc.c1 }} />
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest">
            {lang === 'en' ? '11-Year Activity Heatmap' : 'Mapa de Actividad 11 Años'} (2015–2026)
          </h3>
          {monthlyActivity.estimated && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
              style={{ color: tc.c2, borderColor: `${tc.c2}40`, backgroundColor: `${tc.c2}10` }}>
              {lang === 'en' ? 'estimated months' : 'meses estimados'}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5 text-xs font-mono text-gray-500">
            <span>{lang === 'en' ? 'Less' : 'Menos'}</span>
            {[0.1, 0.3, 0.55, 0.8, 1.0].map(o => (
              <div key={o} className="w-3 h-3 rounded-sm" style={{ backgroundColor: tc.c1, opacity: o }} />
            ))}
            <span>{lang === 'en' ? 'More' : 'Más'}</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[600px]">
            {/* Month headers */}
            <div className="flex ml-10 mb-1">
              {MONTHS.map(m => (
                <div key={m} className="flex-1 text-center text-[10px] font-mono text-gray-500">{m}</div>
              ))}
            </div>
            {/* Year rows */}
            {years.map(year => (
              <div key={year} className="flex items-center mb-1">
                <span className="w-10 text-[10px] font-mono text-gray-500 text-right pr-2">{year}</span>
                <div className="flex flex-1 gap-1">
                  {Array.from({ length: 12 }, (_, m) => {
                    const plays = monthlyMatrix.find(d => d.year === year && d.month === m)?.plays ?? 0;
                    const opacity = 0.08 + (plays / maxMonthlyPlays) * 0.92;
                    return (
                      <motion.div key={m}
                        className="flex-1 h-5 rounded-sm cursor-pointer"
                        style={{ backgroundColor: tc.c1, opacity }}
                        whileHover={{ scale: 1.2, opacity: 1 }}
                        title={`${year} ${MONTHS[m]}: ~${fmtNum(plays)} plays`}
                        onClick={() => setSelectedYear(year)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-gray-500 font-mono mt-2 text-center">
          {lang === 'en' ? 'Click a year row to see monthly breakdown below' : 'Haz clic en una fila para ver el desglose mensual'}
        </p>
      </div>

      {/* ── Monthly Breakdown + Weekday Radar ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Monthly bar */}
        <div className="glass-panel p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest">
              {lang === 'en' ? 'Monthly Breakdown' : 'Desglose Mensual'} {selectedYear}
            </h3>
            <div className="flex gap-1">
              {years.map(y => (
                <button key={y} onClick={() => setSelectedYear(y)}
                  className="text-[10px] font-mono px-2 py-1 rounded-lg transition-all"
                  style={selectedYear === y ? { backgroundColor: tc.c1, color: '#000', fontWeight: 'bold' } : { color: '#6b7280' }}>
                  {y}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-2 text-xs text-gray-400 font-mono">
            {lang === 'en' ? 'Peak: ' : 'Pico: '}<span style={{ color: tc.c2 }}>{peakMonth.month}</span>
            {' — '}{fmtNum(peakMonth.plays)} plays
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={selectedYearMonths} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0d1f38" />
                <XAxis dataKey="month" stroke="#374151" fontSize={10} tick={{ fill: '#9ca3af' }} />
                <YAxis stroke="#374151" fontSize={10} tick={{ fill: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip tc={tc} />} />
                <Bar dataKey="plays" name={lang === 'en' ? 'Plays' : 'Plays'} radius={[4, 4, 0, 0]}>
                  {selectedYearMonths.map((d, i) => (
                    <Cell key={i} fill={d.plays === peakMonth.plays ? tc.c2 : tc.c1} fillOpacity={d.plays === peakMonth.plays ? 1 : 0.65} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekday Radar */}
        <div className="glass-panel p-6 rounded-3xl">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest mb-5">
            {lang === 'en' ? 'Day-of-Week Pattern' : 'Patrón por Día de la Semana'}
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="day" stroke="#9ca3af" fontSize={11} tick={{ fill: '#9ca3af' }} />
                <Radar name={lang === 'en' ? 'Plays' : 'Plays'} dataKey="plays"
                  stroke={tc.c1} fill={tc.c1} fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-7 gap-1 mt-3">
            {WEEKDAYS.map((day, i) => {
              const ratio = wdTotals[i] / maxWd;
              return (
                <div key={day} className="flex flex-col items-center gap-1">
                  <div className="w-full h-1.5 rounded-full bg-white/5">
                    <motion.div className="h-full rounded-full"
                      style={{ backgroundColor: tc.c1, width: `${ratio * 100}%` }}
                      initial={{ width: 0 }} animate={{ width: `${ratio * 100}%` }}
                      transition={{ duration: 0.8, delay: i * 0.05 }} />
                  </div>
                  <span className="text-[9px] font-mono text-gray-500">{day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Genre Treemap ── */}
      <div className="glass-panel p-6 rounded-3xl">
        <div className="flex items-center gap-3 mb-5">
          <Zap className="w-5 h-5" style={{ color: tc.c2 }} />
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest">
            {lang === 'en' ? 'Genre Treemap (by plays)' : 'Treemap de Géneros (por plays)'}
          </h3>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap data={treemapData.children} dataKey="size"
              content={<CustomTreemapContent />} isAnimationActive />
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Genre Evolution Area Chart ── */}
      <div className="glass-panel p-6 rounded-3xl">
        <div className="flex items-center gap-3 mb-5">
          <TrendingUp className="w-5 h-5" style={{ color: tc.c4 }} />
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest">
            {lang === 'en' ? 'Plays & Artist Discovery 2015–2026' : 'Evolución de Plays & Descubrimiento 2015–2026'}
          </h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={genreEvolution} margin={{ left: 0, right: 20, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="gPlays" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={tc.c1} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={tc.c1} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gArtistas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={tc.c3} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={tc.c3} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gDiversity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={tc.c4} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={tc.c4} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#0d1f38" />
              <XAxis dataKey="year" stroke="#4b5563" fontSize={11} tick={{ fill: '#9ca3af' }} />
              <YAxis stroke="#4b5563" fontSize={11} tick={{ fill: '#9ca3af' }} />
              <Tooltip content={<CustomTooltip tc={tc} />} />
              <Area type="monotone" dataKey="plays" name={lang === 'en' ? 'Plays' : 'Plays'}
                stroke={tc.c1} strokeWidth={2.5} fill="url(#gPlays)"
                dot={{ fill: tc.c1, r: 4 }} activeDot={{ r: 7 }} />
              <Area type="monotone" dataKey="artistas" name={lang === 'en' ? 'Unique Artists' : 'Artistas únicos'}
                stroke={tc.c3} strokeWidth={2} fill="url(#gArtistas)"
                dot={{ fill: tc.c3, r: 3 }} activeDot={{ r: 6 }} />
              <Area type="monotone" dataKey="diversidad" name={lang === 'en' ? 'Diversity %' : 'Diversidad %'}
                stroke={tc.c4} strokeWidth={1.5} fill="url(#gDiversity)"
                dot={false} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
