import React from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from 'recharts';
import { Calendar, Clock, Disc, Music, Trophy, Star, TrendingUp, Flame } from 'lucide-react';
import { MusicDnaData } from '../types';
import CountUp from './CountUp';
import { useApp } from '../context/AppContext';
import { formatNumber, getNightRatio, getPeakHour, getPeakYear, getRecords, normalizeGenre } from '../utils/analytics';

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

export default function Dashboard({ data }: DashboardProps) {
  const { tc, t } = useApp();
  const metrics = data.core_metrics;
  const topArtistsData = data.top_artists.slice(0, 10);
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

  const formatNum = (num: number) => formatNumber(num);
  const formatRecordDate = (date?: string) => {
    if (!date) return t.dashboard.notAvailable;
    return new Date(`${date}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

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

  // Convertir matriz de heatmap en lista plana de horas y días para renderizar la cuadrícula tipo GitHub
  const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
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

  return (
    <div className="space-y-10 animate-fade-in">
      {/* 1. Main KPIs — animated stagger */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: Music,    label: t.dashboard.kpiTotalPlays,    val: metrics.total_plays,     delay: 0,   color: tc.c1, sub: t.dashboard.kpiTotalPlaysSub },
          { icon: Clock,    label: t.dashboard.kpiHoursListened, val: metrics.listening_hours, delay: 0.1, color: tc.c2, sub: t.dashboard.kpiHoursListenedSub(formatNum(metrics.listening_days)) },
          { icon: Disc,     label: t.dashboard.kpiUniqueArtists, val: metrics.unique_artists,  delay: 0.2, color: tc.c3, sub: t.dashboard.kpiUniqueArtistsSub },
          { icon: Calendar, label: t.dashboard.kpiActiveDays,    val: metrics.active_days,     delay: 0.3, color: '#10b981', sub: t.dashboard.kpiActiveDaysSub },
        ].map(({ icon: Icon, label, val, delay, color, sub }, i) => (
          <motion.div key={label} custom={i} variants={cardVariants} initial="initial" animate="animate"
            className="glass-panel p-6 rounded-3xl relative overflow-hidden group border-b-2"
            style={{ borderBottomColor: `${color}60` }}>
            <div className="absolute top-0 right-0 p-4 transition-opacity opacity-5 group-hover:opacity-15">
              <Icon className="w-16 h-16" style={{ color }} />
            </div>
            <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${color}06, transparent 70%)` }} />
            <p className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest relative z-10">{label}</p>
            <p className="text-3xl font-black text-white mt-2 font-mono relative z-10">
              <CountUp target={val} duration={1.8} delay={delay} />
            </p>
            <p className="text-xs text-gray-400 mt-1 relative z-10 leading-snug">{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* 1b. Advanced KPIs row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t.dashboard.kpiBestYear,       val: String(bestYear?.year ?? '—'),  sub: `${formatNum(bestYear?.plays ?? 0)} plays · ${bestYear?.era_label ?? ''}`, color: tc.c1,    numeric: false },
          { label: t.dashboard.kpiAvgPerDay,      val: null, numericTarget: avgPerActiveDay, sub: t.dashboard.kpiAvgPerDaySub(formatNum(metrics.active_days)), color: tc.c2, numeric: true },
          { label: t.dashboard.kpiNightListening, val: null, numericTarget: nightRatio, suffix: '%', sub: t.dashboard.kpiNightListeningSub, color: tc.c3,    numeric: true },
          { label: t.dashboard.kpiPeakHour,       val: peakHour,                        sub: t.dashboard.kpiPeakHourSub, color: '#10b981', numeric: false },
        ].map(({ label, val, numericTarget, suffix, sub, color, numeric }, i) => (
          <motion.div key={label} custom={i + 4} variants={cardVariants} initial="initial" animate="animate"
            className="glass-panel p-4 rounded-2xl relative overflow-hidden border-b-2"
            style={{ borderBottomColor: color }}>
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${color}08, transparent 70%)` }} />
            <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest relative z-10">{label}</p>
            <p className="text-2xl font-black mt-1 font-mono relative z-10" style={{ color }}>
              {numeric && numericTarget !== undefined
                ? <CountUp target={numericTarget} duration={1.6} delay={0.5 + i * 0.1} suffix={suffix ?? ''} />
                : val}
            </p>
            <p className="text-[10px] text-gray-500 mt-1 leading-tight relative z-10">{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* 1c. Records strip */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.5 }}
        className="glass-panel p-5 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-4 h-4" style={{ color: tc.c2 }} />
          <span className="text-xs font-mono font-bold text-white uppercase tracking-widest">
            {t.dashboard.personalRecords}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t.dashboard.recordLongestStreak,  val: records.longest_streak_days, unit: records.longest_streak_start ? t.dashboard.recordStreakUnit(formatRecordDate(records.longest_streak_start), formatRecordDate(records.longest_streak_end)) : t.dashboard.recordStreakUnitFallback, color: '#fb923c' },
            { label: t.dashboard.recordMaxDay,         val: records.max_day_plays, unit: t.dashboard.recordMaxDayUnit(formatRecordDate(records.max_day_date)), color: tc.c2 },
            { label: t.dashboard.recordLongestSession, val: Math.round(records.longest_session_minutes), unit: t.dashboard.recordSessionUnit(records.longest_session_tracks), color: tc.c1 },
            { label: t.dashboard.recordBestSession,    val: records.best_session_tracks, unit: t.dashboard.recordBestSessionUnit(records.best_session_start ? new Date(records.best_session_start).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) : t.dashboard.recordUnknownDate), color: '#a78bfa' },
          ].map(({ label, val, unit, color }) => (
            <div key={label} className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Artists */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-2">
          <div className="flex items-center space-x-3 mb-6">
            <Trophy className="w-6 h-6" style={{ color: tc.c1 }} />
            <h3 className="text-lg font-bold font-mono uppercase tracking-wider text-white">
              {t.dashboard.topArtistsTitle}
            </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topArtistsData} layout="vertical" margin={{ left: 50, right: 20, top: 0, bottom: 0 }}>
                <XAxis type="number" stroke="#4b5563" fontSize={11} tick={{ fill: '#9ca3af' }} />
                <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={11} width={130} tick={{ fill: '#d1d5db' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(7,14,28,0.95)', borderColor: tc.c1, borderRadius: '12px' }}
                  labelStyle={{ color: '#fff', fontFamily: 'monospace' }}
                />
                <Bar dataKey="plays" name={t.dashboard.playsLegend} radius={[0, 4, 4, 0]}>
                  {topArtistsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? tc.c1 : tc.c3} fillOpacity={index === 0 ? 1 : 0.7} />
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
              <Star className="w-6 h-6" style={{ color: tc.c2 }} />
              <h3 className="text-lg font-bold font-mono uppercase tracking-wider text-white">
                {t.dashboard.genreDnaTitle}
              </h3>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={richGenreData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="plays">
                    {richGenreData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(7,14,28,0.95)', borderColor: tc.c2, borderRadius: '12px' }}
                    formatter={(val: any) => [`${Number(val).toLocaleString('es-ES')} plays`]}
                  />
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
                  {genre.plays.toLocaleString('es-ES')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Heatmap */}
      <div className="glass-panel p-6 rounded-3xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6" style={{ color: tc.c1 }} />
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

      {/* 4. Hourly bar chart */}
      <div className="glass-panel p-6 rounded-3xl">
        <div className="flex items-center space-x-3 mb-6">
          <Clock className="w-6 h-6" style={{ color: tc.c4 }} />
          <h3 className="text-lg font-bold font-mono uppercase tracking-wider text-white">
            {t.dashboard.hourlyRhythmTitle}
          </h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <XAxis dataKey="hour" stroke="#4b5563" fontSize={11} tick={{ fill: '#9ca3af' }} />
              <YAxis stroke="#4b5563" fontSize={11} tick={{ fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(7,14,28,0.95)', borderColor: tc.c4, borderRadius: '12px' }}
                labelStyle={{ color: '#fff', fontFamily: 'monospace' }}
              />
              <Bar dataKey="plays" name={t.dashboard.playsLegend} fill={tc.c4} radius={[4, 4, 0, 0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Yearly Evolution Area Chart */}
      <div className="glass-panel p-6 rounded-3xl">
        <div className="flex items-center space-x-3 mb-6">
          <TrendingUp className="w-6 h-6" style={{ color: tc.c1 }} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#0d1f38" />
              <XAxis dataKey="year" stroke="#4b5563" fontSize={11} tick={{ fill: '#9ca3af' }} />
              <YAxis stroke="#4b5563" fontSize={11} tick={{ fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(7,14,28,0.95)', borderColor: tc.c1, borderRadius: '12px' }}
                labelStyle={{ color: '#fff', fontFamily: 'monospace' }}
              />
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
    </div>
  );
}
