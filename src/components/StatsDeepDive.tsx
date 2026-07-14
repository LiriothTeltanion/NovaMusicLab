import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  AreaChart, Area, CartesianGrid,
  Treemap,
} from 'recharts';
import { Calendar, Zap, TrendingUp, Award, Target } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import CountUp from './CountUp';
import GenreArt from './GenreArt';
import DailyHeatmap from './DailyHeatmap';
import {
  buildMonthlyActivity,
  getMonthNames,
  getPeakYear,
  getWeekdayNames,
  getWeekdayTotals,
} from '../utils/analytics';
import { buildGenreDistribution, getDatasetCoverage } from '../utils/chartIntegrity';
import SectionNarrative from './SectionNarrative';
import YearlyErasTable from './YearlyErasTable';
import { axisProps, ChartCanvas, ChartFrame, ChartSwap, gridStroke, useChartAnimation } from './chartKit';
import { localeFor, pickLanguage } from '../utils/i18n';
import { localizeGenreName } from '../utils/localizedDatasetText';

interface StatsDeepDiveProps { data: MusicDnaData; }

const CustomTooltip = ({ active, payload, label, tc }: any) => {
  const { lang } = useApp();
  if (!active || !payload?.length) return null;
  return (
    <div className="nova-chart-tooltip rounded-xl px-4 py-3 text-xs font-mono shadow-lg"
      style={{ border: `1px solid ${tc?.c1 ?? '#00f2fe'}40` }}>
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? tc?.c1 }}>
          {p.name}: <span className="nova-chart-tooltip__value">{Number(p.value).toLocaleString(localeFor(lang))}</span>
        </p>
      ))}
    </div>
  );
};

export default function StatsDeepDive({ data }: StatsDeepDiveProps) {
  const { tc, lang, t } = useApp();
  const chartAnimation = useChartAnimation();
  const peakYear = useMemo(() => getPeakYear(data), [data]);
  const [selectedYear, setSelectedYear] = useState<number>(() => peakYear?.year ?? data.yearly_eras[0]?.year ?? new Date().getFullYear());
  const [yearMetric, setYearMetric] = useState<'plays' | 'artistas' | 'diversidad'>('plays');

  useEffect(() => {
    if (peakYear?.year) setSelectedYear(peakYear.year);
  }, [peakYear?.year]);

  const locale = localeFor(lang);
  const MONTHS  = useMemo(() => getMonthNames(locale), [locale]);
  const WEEKDAYS = useMemo(() => getWeekdayNames(locale), [locale]);

  const fmtNum = (n: number) => Math.round(n).toLocaleString(locale);
  const coverage = useMemo(() => getDatasetCoverage(data), [data]);
  const selectedYearIsYtd = coverage.isPartialYear && coverage.maxYear === selectedYear;

  /* ── Monthly matrix ── */
  const monthlyActivity = useMemo(() => buildMonthlyActivity(data), [data]);
  const monthlyMatrix = monthlyActivity.rows;

  const years = useMemo(() => data.yearly_eras.map(e => e.year), [data.yearly_eras]);
  const maxMonthlyPlays = useMemo(() => Math.max(1, ...monthlyMatrix.map(d => d.plays)), [monthlyMatrix]);

  /* ── Weekday data ── */
  const wdTotals = useMemo(() => getWeekdayTotals(data.heatmap), [data.heatmap]);
  const maxWd = useMemo(() => Math.max(1, ...wdTotals), [wdTotals]);
  const radarData = useMemo(
    () => WEEKDAYS.map((day, i) => ({ day, plays: wdTotals[i] })),
    [WEEKDAYS, wdTotals]
  );

  /* ── Monthly bar chart for selected year ── */
  const selectedYearMonths = useMemo(
    () => MONTHS.map((month, i) => ({
      month,
      plays: monthlyMatrix.find(d => d.year === selectedYear && d.month === i)?.plays ?? 0,
    })),
    [MONTHS, monthlyMatrix, selectedYear]
  );
  const peakMonth = useMemo(
    () => selectedYearMonths.reduce((a, b) => b.plays > a.plays ? b : a, selectedYearMonths[0]),
    [selectedYearMonths]
  );

  /* ── Genre Treemap ── */
  const treemapData = useMemo(() => {
    const distribution = buildGenreDistribution(data.top_genres, data.core_metrics.total_plays, 10);
    return {
      name: 'root',
      totalPlays: distribution.totalPlays,
      children: distribution.rows.map(row => ({
        ...row,
        genre: row.name,
        name: localizeGenreName(row.name, lang),
        size: row.plays,
      })),
    };
  }, [data.core_metrics.total_plays, data.top_genres, lang]);

  /* ── Genre evolution area data ── */
  const genreEvolution = useMemo(
    () => data.yearly_eras.map(era => ({
      year: String(era.year),
      plays: era.plays,
      artistas: era.unique_artists,
      diversidad: era.diversity_index,
    })),
    [data.yearly_eras]
  );
  const yearMetricConfig = {
    plays: {
      label: t.statsDeepDive.plays,
      color: tc.c1,
      unit: pickLanguage(lang, { en: 'counted listens', es: 'escuchas contadas', he: 'השמעות שנספרו' }),
    },
    artistas: {
      label: t.statsDeepDive.uniqueArtists,
      color: tc.c3,
      unit: pickLanguage(lang, { en: 'unique artists', es: 'artistas únicos', he: 'אמנים ייחודיים' }),
    },
    diversidad: {
      label: t.statsDeepDive.diversityPct,
      color: tc.c4,
      unit: '%',
    },
  } as const;
  const activeYearMetric = yearMetricConfig[yearMetric];
  const peakMetricRow = genreEvolution.reduce((best, row) =>
    row[yearMetric] > best[yearMetric] ? row : best,
  genreEvolution[0] ?? { year: '—', plays: 0, artistas: 0, diversidad: 0 });

  /* ── Advanced metrics ── */
  const consistencyScore = useMemo(() => Math.round(
    Math.min(100, (data.core_metrics.active_days / Math.max(1, data.yearly_eras.length * 365)) * 100)
  ), [data.core_metrics.active_days, data.yearly_eras.length]);
  const explorationScore = useMemo(() => Math.round(
    (data.core_metrics.unique_artists / data.core_metrics.total_plays) * 1000
  ), [data.core_metrics.unique_artists, data.core_metrics.total_plays]);
  const obsessionScore = useMemo(() => Math.round(
    Math.max(0, (1 - data.core_metrics.unique_tracks / Math.max(1, data.core_metrics.total_plays)) * 100)
  ), [data.core_metrics.unique_tracks, data.core_metrics.total_plays]);

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
                fill="#9ca3af">{plays.toLocaleString(locale)}</text>
            )}
          </>
        )}
      </g>
    );
  };

  return (
    <div className="animate-fade-in space-y-8 md:space-y-10">
      <SectionNarrative content={t.deepNarratives.statsdeep} accent="c1" />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[
          { label: t.statsDeepDive.kpiConsistency,  val: consistencyScore,  suffix: '%', icon: Target,   color: tc.c1, desc: t.statsDeepDive.kpiConsistencyDesc },
          { label: t.statsDeepDive.kpiExploration,    val: explorationScore,  suffix: '/1k', icon: TrendingUp, color: tc.c2, desc: t.statsDeepDive.kpiExplorationDesc },
          { label: t.statsDeepDive.kpiObsession,       val: obsessionScore,    suffix: '%', icon: Zap,     color: tc.c3, desc: t.statsDeepDive.kpiObsessionDesc },
          { label: t.statsDeepDive.kpiPeakYear,    val: peakYear?.year ?? 0, numOnly: true, icon: Award,   color: tc.c4, desc: t.statsDeepDive.kpiPeakYearDesc(fmtNum(peakYear?.plays ?? 0)) },
        ].map(({ label, val, suffix, icon: Icon, color, desc, numOnly }) => (
          <div key={label} className="nova-surface nova-surface--analysis relative rounded-2xl border-l-4 p-4 sm:p-5"
            style={{ borderLeftColor: color }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${color}08, transparent 70%)` }} />
            <Icon className="w-5 h-5 mb-2 relative z-10" style={{ color }} />
            <p className="type-label type-muted relative z-10">{label}</p>
            <p className="type-metric relative z-10 mt-1 text-2xl font-black" style={{ color }}>
              {numOnly ? val : <CountUp target={val} duration={1.5} delay={0.1} suffix={suffix ?? ''} />}
            </p>
            <p className="type-caption type-muted relative z-10 mt-1">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Annual Activity Calendar (Month × Year grid) ── */}
      <div className="nova-surface nova-surface--analysis rounded-3xl p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <Calendar className="w-5 h-5" style={{ color: tc.c1 }} />
          <h3 className="type-section type-strong">
            {t.statsDeepDive.heatmapTitle} (2015–2026)
          </h3>
          {monthlyActivity.estimated && (
            <span className="type-label rounded-full border px-2 py-0.5"
              style={{ color: tc.c2, borderColor: `${tc.c2}40`, backgroundColor: `${tc.c2}10` }}>
              {t.statsDeepDive.estimatedMonths}
            </span>
          )}
          <div className="type-caption type-muted ml-auto flex items-center gap-1.5">
            <span>{t.statsDeepDive.less}</span>
            {[0.1, 0.3, 0.55, 0.8, 1.0].map(o => (
              <div key={o} className="w-3 h-3 rounded-sm" style={{ backgroundColor: tc.c1, opacity: o }} />
            ))}
            <span>{t.statsDeepDive.more}</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[600px]">
            {/* Month headers */}
            <div className="flex ml-10 mb-1">
              {MONTHS.map(m => (
                <div key={m} className="type-caption type-muted flex-1 text-center">{m}</div>
              ))}
            </div>
            {/* Year rows */}
            {years.map(year => {
              const monthDescriptions = Array.from({ length: 12 }, (_, month) => {
                const plays = monthlyMatrix.find(d => d.year === year && d.month === month)?.plays ?? 0;
                return t.statsDeepDive.monthCellTitle(year, MONTHS[month], fmtNum(plays));
              });
              const descriptionId = `monthly-activity-${year}`;

              return (
              <div
                key={year}
                role="button"
                tabIndex={0}
                aria-pressed={selectedYear === year}
                aria-label={pickLanguage(lang, {
                  en: `Show ${year} monthly breakdown`,
                  es: `Ver desglose mensual de ${year}`,
                  he: `הצגת הפירוט החודשי של ${year}`,
                })}
                aria-describedby={descriptionId}
                onClick={() => setSelectedYear(year)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedYear(year);
                  }
                }}
                className="mb-1 flex min-h-6 items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                style={{ '--tw-ring-color': tc.c1 } as React.CSSProperties}
              >
                <span className="type-caption type-muted w-10 pr-2 text-right">{year}</span>
                <div className="flex flex-1 gap-1">
                  {Array.from({ length: 12 }, (_, m) => {
                    const plays = monthlyMatrix.find(d => d.year === year && d.month === m)?.plays ?? 0;
                    const opacity = 0.08 + (plays / maxMonthlyPlays) * 0.92;
                    return (
                      <motion.div key={m}
                        className="h-6 flex-1 cursor-pointer rounded-sm"
                        style={{ backgroundColor: tc.c1, opacity }}
                        whileHover={{ scale: 1.12, opacity: 1 }}
                        title={t.statsDeepDive.monthCellTitle(year, MONTHS[m], fmtNum(plays))}
                        aria-hidden="true"
                      />
                    );
                  })}
                </div>
                <span id={descriptionId} className="sr-only">
                  {monthDescriptions.join('. ')}
                </span>
              </div>
              );
            })}
          </div>
        </div>
        <p className="type-caption type-muted mt-2 text-center">
          {t.statsDeepDive.clickYearHint}
        </p>
      </div>

      {/* Daily Scrobble Grid Heatmap */}
      <DailyHeatmap data={data} />

      {/* ── Monthly Breakdown + Weekday Radar ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Monthly bar */}
        <div className="nova-surface nova-surface--analysis rounded-3xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="type-section type-strong">
                {t.statsDeepDive.monthlyBreakdown} {selectedYear}
              </h3>
              {selectedYearIsYtd && (
                <span className="rounded-full border border-amber-400/35 bg-amber-400/10 px-2 py-1 text-xs font-mono font-black uppercase tracking-wider text-amber-500">
                  ⏳ YTD · {coverage.maxDate}
                </span>
              )}
            </div>
            <div className="flex max-w-[58%] gap-1 overflow-x-auto pb-1">
              {years.map(y => (
                <button key={y} onClick={() => setSelectedYear(y)}
                  aria-pressed={selectedYear === y}
                  className="type-label min-h-11 rounded-lg border px-2 py-1 transition-all"
                  style={selectedYear === y
                    ? {
                        backgroundColor: `${tc.c1}18`,
                        borderColor: `${tc.c1}55`,
                        color: 'color-mix(in srgb, var(--c1) 58%, var(--fg))',
                        fontWeight: 'bold',
                      }
                    : { borderColor: 'transparent', color: 'var(--type-ink-muted)' }}>
                  {y}
                </button>
              ))}
            </div>
          </div>
          <div className="type-caption type-muted mb-2">
            {t.statsDeepDive.peakLabel}<span style={{ color: tc.c2 }}>{peakMonth.month}</span>
            {' — '}{t.statsDeepDive.playsCount(fmtNum(peakMonth.plays))}
          </div>
          <ChartSwap swapKey={selectedYear} className="h-52">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart accessibilityLayer data={selectedYearMonths} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(tc.c1, tc.mode)} />
                <XAxis dataKey="month" {...axisProps(tc.mode)} fontSize={10} />
                <YAxis {...axisProps(tc.mode)} fontSize={10} />
                <Tooltip content={<CustomTooltip tc={tc} />} />
                <Bar dataKey="plays" name={t.statsDeepDive.plays} radius={[4, 4, 0, 0]} {...chartAnimation}>
                  {selectedYearMonths.map((d, i) => (
                    <Cell key={i} fill={d.plays === peakMonth.plays ? tc.c2 : tc.c1} fillOpacity={d.plays === peakMonth.plays ? 1 : 0.65} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartSwap>
        </div>

        {/* Weekday comparison */}
        <div className="nova-surface nova-surface--analysis rounded-3xl p-4 sm:p-6">
          <h3 className="type-section type-strong mb-5">
            {t.statsDeepDive.weekdayPatternTitle}
          </h3>
          <ol data-testid="weekday-comparison" className="space-y-2.5" aria-label={t.statsDeepDive.weekdayPatternTitle}>
            {radarData.map(({ day, plays }, index) => {
              const ratio = maxWd > 0 ? plays / maxWd : 0;
              return (
                <li
                  key={day}
                  className="grid min-h-11 grid-cols-[minmax(4.5rem,auto)_minmax(0,1fr)_auto] items-center gap-3"
                  aria-label={`${day}: ${fmtNum(plays)} ${t.statsDeepDive.plays}`}
                >
                  <span className="type-caption type-strong min-w-0 break-words"><bdi dir="auto">{day}</bdi></span>
                  <span className="nova-data-ltr h-2.5 overflow-hidden rounded-full bg-white/5" dir="ltr" aria-hidden="true">
                    <motion.span
                      className="block h-full origin-left rounded-full"
                      style={{ background: `linear-gradient(90deg, ${tc.c1}, ${tc.c3})` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${ratio * 100}%` }}
                      transition={{ duration: 0.8, delay: index * 0.05 }}
                    />
                  </span>
                  <span className="type-metric min-w-14 text-end text-xs font-black" style={{ color: tc.c1 }}>
                    {fmtNum(plays)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* ── Interactive yearly eras table ── */}
      <YearlyErasTable
        eras={data.yearly_eras}
        selectedYear={selectedYear}
        onSelectYear={setSelectedYear}
      />

      {/* ── Genre Treemap ── */}
      <div className="nova-surface nova-surface--analysis rounded-3xl p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <Zap className="w-5 h-5" style={{ color: tc.c2 }} />
          <h3 className="type-section type-strong">
            {t.statsDeepDive.genreTreemapTitle}
          </h3>
        </div>
        <p className="type-caption type-muted -mt-3 mb-5">
          🧭 {pickLanguage(lang, { en: 'Whole archive', es: 'Archivo completo', he: 'כל הארכיון' })} · {treemapData.totalPlays.toLocaleString(locale)} {pickLanguage(lang, { en: 'counted listens · includes Other', es: 'escuchas contadas · incluye Otros', he: 'השמעות שנספרו · כולל אחר' })}
        </p>
        <div className="flex flex-wrap gap-4 mb-6">
          {treemapData.children.slice(0, 8).map(g => (
            <GenreArt key={g.genre} genre={g.genre} label={g.name} size={52} showLabel />
          ))}
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <Treemap data={treemapData.children} dataKey="size"
              content={<CustomTreemapContent />} {...chartAnimation} />
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Genre Evolution Area Chart ── */}
      <div className="nova-surface nova-surface--analysis rounded-3xl p-4 sm:p-6">
        <ChartFrame
          title={`📈 ${t.statsDeepDive.genreEvolutionTitle}`}
          subtitle={`${activeYearMetric.label} · ${activeYearMetric.unit}${coverage.maxDate ? ` · ${pickLanguage(lang, { en: 'observed through', es: 'observado hasta', he: 'נצפה עד' })} ${coverage.maxDate}` : ''}`}
          summary={pickLanguage(lang, {
            en: `${peakMetricRow.year} has the highest ${activeYearMetric.label.toLowerCase()} value in this view: ${fmtNum(peakMetricRow[yearMetric])}${yearMetric === 'diversidad' ? '%' : ''}. Metrics use separate scales.`,
            es: `${peakMetricRow.year} tiene el valor más alto de ${activeYearMetric.label.toLowerCase()} en esta vista: ${fmtNum(peakMetricRow[yearMetric])}${yearMetric === 'diversidad' ? '%' : ''}. Las métricas usan escalas separadas.`,
            he: `${peakMetricRow.year} היא השנה עם הערך הגבוה ביותר של ${activeYearMetric.label}: ${fmtNum(peakMetricRow[yearMetric])}${yearMetric === 'diversidad' ? '%' : ''}. לכל מדד מוצג קנה מידה נפרד.`,
          })}
          status={coverage.isPartialYear ? ['exact', 'ytd'] : 'exact'}
          tableRows={genreEvolution.map((row) => ({
            year: coverage.isPartialYear && Number(row.year) === coverage.maxYear ? `${row.year} YTD` : row.year,
            value: row[yearMetric],
            metric: activeYearMetric.label,
          }))}
          fileName={`nova-yearly-${yearMetric}.csv`}
        >
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={pickLanguage(lang, { en: 'Yearly metric', es: 'Métrica anual', he: 'מדד שנתי' })}>
            {(Object.keys(yearMetricConfig) as Array<keyof typeof yearMetricConfig>).map((metric) => (
              <button
                key={metric}
                type="button"
                aria-pressed={yearMetric === metric}
                onClick={() => setYearMetric(metric)}
                className="min-h-11 rounded-xl border px-3 py-2 text-[10px] font-mono font-black uppercase tracking-wider transition-colors"
                style={yearMetric === metric
                  ? { color: yearMetricConfig[metric].color, borderColor: `${yearMetricConfig[metric].color}65`, backgroundColor: `${yearMetricConfig[metric].color}12` }
                  : { color: 'var(--type-ink-muted)', borderColor: 'rgba(148,163,184,.18)' }}
              >
                {yearMetricConfig[metric].label}
              </button>
            ))}
          </div>
          <ChartCanvas>
            <ChartSwap swapKey={yearMetric} className="h-64">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart accessibilityLayer data={genreEvolution} margin={{ left: 0, right: 20, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id={`yearMetric-${yearMetric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={activeYearMetric.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={activeYearMetric.color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(activeYearMetric.color, tc.mode)} />
                <XAxis dataKey="year" {...axisProps(tc.mode)} />
                <YAxis
                  {...axisProps(tc.mode)}
                  domain={yearMetric === 'diversidad' ? [0, 100] : [0, 'auto']}
                  tickFormatter={(value) => yearMetric === 'diversidad' ? `${value}%` : fmtNum(Number(value))}
                />
                <Tooltip content={<CustomTooltip tc={tc} />} />
                <Area
                  {...chartAnimation}
                  type="monotone"
                  dataKey={yearMetric}
                  name={activeYearMetric.label}
                  stroke={activeYearMetric.color}
                  strokeWidth={2.5}
                  fill={`url(#yearMetric-${yearMetric})`}
                  dot={{ fill: activeYearMetric.color, r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 7 }}
                />
              </AreaChart>
              </ResponsiveContainer>
            </ChartSwap>
          </ChartCanvas>
        </ChartFrame>
      </div>
    </div>
  );
}
