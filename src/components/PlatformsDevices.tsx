import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Gauge,
  Radio,
  ShieldCheck,
  TabletSmartphone,
  Timer,
  Upload,
  Zap,
} from 'lucide-react';
import type { MusicDnaData, PlaySource, PlatformPlay } from '../types';
import { deriveSourceSummary, formatNumber } from '../utils/analytics';
import { useApp, type ThemeColors } from '../context/AppContext';
import SectionNarrative from './SectionNarrative';

interface PlatformsDevicesProps {
  data: MusicDnaData;
}

type ConfidenceKind = 'exact' | 'estimated' | 'inferred' | 'unavailable';

interface PlatformChartRow extends PlatformPlay {
  share: number;
}

interface TooltipPayload {
  value?: number;
  color?: string;
  payload?: PlatformChartRow;
}

const CHART_COLORS = ['#38bdf8', '#10b981', '#a78bfa', '#f59e0b', '#fb7185', '#22d3ee', '#f472b6'];

function sourceLabel(sourceType: PlaySource, sourceTypes: Record<PlaySource, string>) {
  return sourceTypes[sourceType] ?? sourceTypes.unknown;
}

function statusColor(kind: ConfidenceKind, tc: ThemeColors) {
  const colors: Record<ConfidenceKind, string> = {
    exact: '#22c55e',
    estimated: '#f59e0b',
    inferred: tc.c3,
    unavailable: '#64748b',
  };

  return colors[kind];
}

function PlatformTooltip({
  active,
  payload,
  label,
  locale,
  copy,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  locale: string;
  copy: ReturnType<typeof useApp>['t']['platforms'];
}) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  const plays = Number(payload[0]?.value ?? 0);

  return (
    <div className="rounded-xl border border-white/10 bg-[#070e1c] px-4 py-3 text-xs font-mono shadow-lg">
      <p className="font-black text-white">{label}</p>
      <p className="mt-1" style={{ color: payload[0]?.color ?? '#38bdf8' }}>
        {copy.plays(formatNumber(plays, locale))}
      </p>
      {row && (
        <p className="mt-1 text-gray-400">
          {copy.shareLabel(row.share)}
        </p>
      )}
    </div>
  );
}

export default function PlatformsDevices({ data }: PlatformsDevicesProps) {
  const { t, tc, lang } = useApp();
  const copy = t.platforms;
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  const source = deriveSourceSummary(data);
  const directSpotify = (source.source_type === 'spotify' || source.source_type === 'merged') && source.spotify_plays > 0;

  const platformRows = useMemo<PlatformChartRow[]>(() => {
    const rows = [...(data.platform_breakdown ?? [])]
      .filter(row => row.platform && row.plays > 0)
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 10);
    const total = rows.reduce((sum, row) => sum + row.plays, 0) || 1;

    return rows.map(row => ({
      ...row,
      share: Math.round((row.plays / total) * 1000) / 10,
    }));
  }, [data.platform_breakdown]);

  const hasPlatformData = platformRows.length > 0;
  const totalPlatformPlays = platformRows.reduce((sum, row) => sum + row.plays, 0);
  const dominantPlatform = platformRows[0];
  const skipRate = Math.round((source.spotify_skip_rate_pct || 0) * 10) / 10;
  const shortPlayRate = Math.round((source.spotify_short_play_rate_pct || 0) * 10) / 10;
  const estimatedSpotifyEvents = source.spotify_plays > 0 && !directSpotify;

  const heroCards = [
    {
      icon: Database,
      label: copy.cards.source.label,
      value: sourceLabel(source.source_type, t.dataQuality.sourceTypes),
      sub: directSpotify ? copy.cards.source.direct : copy.cards.source.limited,
      color: tc.c1,
    },
    {
      icon: TabletSmartphone,
      label: copy.cards.platforms.label,
      value: hasPlatformData ? formatNumber(platformRows.length, locale) : copy.notAvailable,
      sub: hasPlatformData
        ? copy.cards.platforms.withData(formatNumber(totalPlatformPlays, locale))
        : copy.cards.platforms.noData,
      color: '#38bdf8',
    },
    {
      icon: Zap,
      label: copy.cards.skips.label,
      value: directSpotify ? `${skipRate}%` : copy.notAvailable,
      sub: directSpotify
        ? copy.cards.skips.withData(formatNumber(source.spotify_skips, locale))
        : copy.cards.skips.noData,
      color: directSpotify ? '#f59e0b' : '#64748b',
    },
    {
      icon: Timer,
      label: copy.cards.shortPlays.label,
      value: source.spotify_short_plays ? formatNumber(source.spotify_short_plays, locale) : copy.notAvailable,
      sub: source.spotify_short_plays
        ? copy.cards.shortPlays.withData(shortPlayRate)
        : copy.cards.shortPlays.noData,
      color: source.spotify_short_plays ? '#fb7185' : '#64748b',
    },
  ];

  const confidenceRows = [
    {
      icon: TabletSmartphone,
      title: copy.unlock.platform.title,
      body: copy.unlock.platform.body,
      kind: hasPlatformData ? 'exact' : 'unavailable',
    },
    {
      icon: Zap,
      title: copy.unlock.skips.title,
      body: copy.unlock.skips.body,
      kind: directSpotify ? 'exact' : estimatedSpotifyEvents ? 'estimated' : 'unavailable',
    },
    {
      icon: Timer,
      title: copy.unlock.duration.title,
      body: copy.unlock.duration.body,
      kind: directSpotify ? 'exact' : 'estimated',
    },
    {
      icon: Radio,
      title: copy.unlock.country.title,
      body: copy.unlock.country.body,
      kind: directSpotify ? 'exact' : data.countries.length ? 'inferred' : 'unavailable',
    },
  ] satisfies Array<{
    icon: React.ElementType;
    title: string;
    body: string;
    kind: ConfidenceKind;
  }>;

  const analysisPoints = hasPlatformData
    ? [
      copy.analysis.withPlatform(dominantPlatform.platform, dominantPlatform.share),
      copy.analysis.platformDepth(formatNumber(totalPlatformPlays, locale), formatNumber(platformRows.length, locale)),
      directSpotify ? copy.analysis.directSpotify : copy.analysis.estimatedSpotify,
    ]
    : [
      copy.analysis.missingPlatform,
      copy.analysis.currentDataset(sourceLabel(source.source_type, t.dataQuality.sourceTypes), formatNumber(source.spotify_plays, locale)),
      copy.analysis.nextUpload,
    ];

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex items-center space-x-3">
        <TabletSmartphone className="w-6 h-6" style={{ color: tc.c1 }} />
        <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
          {copy.title}
        </h2>
      </div>

      <SectionNarrative content={t.deepNarratives.platforms} accent="c2" />

      <section className="glass-panel rounded-3xl overflow-hidden border border-white/10">
        <div className="relative p-6 md:p-7">
          <div className="absolute inset-0 pointer-events-none opacity-60" style={{
            background: `radial-gradient(circle at top left, ${tc.c1}18, transparent 34%), radial-gradient(circle at bottom right, ${tc.c3}14, transparent 36%)`,
          }} />

          <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-mono font-black uppercase tracking-widest"
                  style={{
                    color: hasPlatformData ? '#22c55e' : '#f59e0b',
                    borderColor: hasPlatformData ? '#22c55e40' : '#f59e0b40',
                    backgroundColor: hasPlatformData ? '#22c55e10' : '#f59e0b10',
                  }}
                >
                  {hasPlatformData ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {hasPlatformData ? copy.sourceReady : copy.sourceLimited}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-mono font-black uppercase tracking-widest text-gray-400">
                  {copy.privacyBadge}
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white leading-tight">
                {copy.heroTitle}
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                {copy.heroBody}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 min-w-[260px]">
              <div>
                <p className="text-[9px] font-mono font-black uppercase tracking-widest text-gray-500">{copy.directEventsLabel}</p>
                <p className="mt-1 text-lg font-black font-mono" style={{ color: directSpotify ? '#22c55e' : '#64748b' }}>
                  {directSpotify ? formatNumber(source.spotify_plays, locale) : copy.notAvailable}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-mono font-black uppercase tracking-widest text-gray-500">{copy.estimatedEventsLabel}</p>
                <p className="mt-1 text-lg font-black font-mono" style={{ color: estimatedSpotifyEvents ? '#f59e0b' : tc.c2 }}>
                  {estimatedSpotifyEvents ? formatNumber(source.spotify_plays, locale) : copy.notAvailable}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {heroCards.map(({ icon: Icon, label, value, sub, color }, index) => (
          <motion.div
            key={label}
            className="glass-panel rounded-2xl border-l-4 p-5 relative overflow-hidden"
            style={{ borderLeftColor: color }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: index * 0.04 }}
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20" style={{ backgroundColor: color }} />
            <Icon className="relative z-10 w-5 h-5 mb-3" style={{ color }} />
            <p className="relative z-10 text-[10px] font-mono font-black uppercase tracking-widest text-gray-400">{label}</p>
            <p className="relative z-10 text-xl font-black text-white mt-1 leading-tight">{value}</p>
            <p className="relative z-10 text-[10px] text-gray-500 mt-2 leading-relaxed">{sub}</p>
          </motion.div>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        <div className="xl:col-span-2 glass-panel rounded-3xl p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" style={{ color: tc.c1 }} />
              <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
                {copy.chartTitle}
              </h3>
            </div>
            {dominantPlatform && (
              <span className="rounded-full border px-3 py-1 text-[10px] font-mono font-black uppercase tracking-widest"
                style={{ color: tc.c2, borderColor: `${tc.c2}35`, backgroundColor: `${tc.c2}10` }}>
                {copy.dominantPlatform}: {dominantPlatform.platform}
              </span>
            )}
          </div>

          {hasPlatformData ? (
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformRows} layout="vertical" margin={{ left: 16, right: 20, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={value => formatNumber(Number(value), locale)} />
                  <YAxis
                    dataKey="platform"
                    type="category"
                    width={130}
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<PlatformTooltip locale={locale} copy={copy} />} cursor={{ fill: `${tc.c1}08` }} />
                  <Bar dataKey="plays" radius={[0, 10, 10, 0]} barSize={22}>
                    {platformRows.map((row, index) => (
                      <Cell key={row.platform} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed p-6 md:p-8 text-center"
              style={{ borderColor: `${tc.c1}28`, backgroundColor: `${tc.c1}06` }}>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border"
                style={{ borderColor: `${tc.c1}35`, background: `linear-gradient(135deg, ${tc.c1}18, ${tc.c3}12)` }}>
                <Upload className="h-7 w-7" style={{ color: tc.c1 }} />
              </div>
              <h4 className="text-lg font-black text-white">{copy.noPlatformTitle}</h4>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
                {copy.noPlatformBody}
              </p>
              <p className="mx-auto mt-4 max-w-2xl rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-relaxed text-gray-300">
                {copy.uploadHint}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5" style={{ color: tc.c3 }} />
            <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
              {copy.readingTitle}
            </h3>
          </div>
          <div className="glass-panel rounded-3xl p-5 space-y-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              {copy.readingBody}
            </p>
            <div className="space-y-3">
              {analysisPoints.map((point, index) => (
                <div key={point} className="flex gap-3 rounded-2xl border border-white/5 bg-white/3 p-3">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black"
                    style={{ color: '#020617', backgroundColor: [tc.c1, tc.c2, tc.c3][index % 3] }}
                  >
                    {index + 1}
                  </span>
                  <p className="text-xs leading-relaxed text-gray-300">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" style={{ color: tc.c2 }} />
          <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
            {copy.confidenceTitle}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {confidenceRows.map(({ icon: Icon, title, body, kind }) => {
            const color = statusColor(kind, tc);
            return (
              <div key={title} className="glass-panel rounded-2xl p-5 border" style={{ borderColor: `${color}28` }}>
                <div className="flex items-start justify-between gap-3">
                  <Icon className="h-5 w-5 shrink-0" style={{ color }} />
                  <span
                    className="rounded-full border px-2.5 py-1 text-[9px] font-mono font-black uppercase tracking-widest"
                    style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}
                  >
                    {copy.status[kind]}
                  </span>
                </div>
                <h4 className="mt-4 text-sm font-black text-white">{title}</h4>
                <p className="mt-2 text-xs leading-relaxed text-gray-400">{body}</p>
                <p className="mt-3 text-[10px] leading-relaxed text-gray-500">
                  {copy.statusCopy[kind]}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
