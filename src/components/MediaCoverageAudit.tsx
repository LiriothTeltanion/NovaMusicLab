import React, { useMemo } from 'react';
import {
  ExternalLink,
  Headphones,
  Link2,
  ListChecks,
  PlayCircle,
  Radio,
  Search,
  ShieldCheck,
} from 'lucide-react';
import type { MusicDnaData } from '../types';
import { formatNumber } from '../utils/analytics';
import { buildMediaCoverageReport, type MediaCoverageRow } from '../utils/mediaCoverage';
import { useApp } from '../context/AppContext';
import { localeFor } from '../utils/i18n';

interface MediaCoverageAuditProps {
  data: MusicDnaData;
}

function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function statusColor(ready: boolean, fallback: boolean, tc: ReturnType<typeof useApp>['tc']) {
  if (ready) return '#22c55e';
  if (fallback) return '#f59e0b';
  return tc.c2;
}

function ProgressLine({ value, total, color }: { value: number; total: number; color: string }) {
  const width = pct(value, total);

  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <div
        className="h-full rounded-full"
        style={{ width: `${width}%`, background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 35%, white))` }}
      />
    </div>
  );
}

function StatusPill({ label, ready, fallback, tc }: { label: string; ready: boolean; fallback?: boolean; tc: ReturnType<typeof useApp>['tc'] }) {
  const color = statusColor(ready, Boolean(fallback), tc);

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-mono font-black uppercase tracking-widest"
      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}12` }}
    >
      {label}
    </span>
  );
}

function MissingList({ rows, emptyLabel }: { rows: MediaCoverageRow[]; emptyLabel: string }) {
  if (!rows.length) {
    return <p className="text-xs text-green-400 leading-relaxed">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {rows.slice(0, 12).map(row => (
        <span key={row.artist} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-mono font-bold text-gray-300">
          {row.rank}. {row.artist}
        </span>
      ))}
    </div>
  );
}

export default function MediaCoverageAudit({ data }: MediaCoverageAuditProps) {
  const { t, tc, lang } = useApp();
  const copy = t.dataQuality.mediaCoverage;
  const locale = localeFor(lang);
  const report = useMemo(() => buildMediaCoverageReport(data, 100), [data]);

  const statCards = [
    {
      icon: Headphones,
      label: copy.curatedProfiles,
      value: report.curatedProfiles,
      total: report.auditedArtists,
      color: tc.c1,
    },
    {
      icon: PlayCircle,
      label: copy.spotifyVerified,
      value: report.spotifyVerified,
      total: report.auditedArtists,
      color: '#1DB954',
    },
    {
      icon: Radio,
      label: copy.youtubeVerified,
      value: report.youtubeVerified,
      total: report.auditedArtists,
      color: '#ff0033',
    },
    {
      icon: Link2,
      label: copy.youtubeEmbeddable,
      value: report.youtubeEmbeddable,
      total: report.auditedArtists,
      color: tc.c3,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Radio className="w-5 h-5" style={{ color: tc.c2 }} />
        <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
          {copy.title}
        </h3>
      </div>

      <div className="glass-panel rounded-3xl p-5 md:p-6 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-gray-300 leading-relaxed max-w-4xl">{copy.subtitle}</p>
            <p className="text-xs text-gray-500 leading-relaxed mt-2">
              {copy.summary(report.spotifyVerified, report.youtubeVerified, report.auditedArtists)}
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 text-center min-w-[150px]">
            <p className="text-[10px] font-mono font-black uppercase tracking-widest text-gray-500">{copy.score}</p>
            <p className="text-4xl font-black font-mono mt-1" style={{ color: report.score >= 70 ? '#22c55e' : report.score >= 45 ? '#f59e0b' : tc.c2 }}>
              {report.score}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map(({ icon: Icon, label, value, total, color }) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-mono font-black uppercase tracking-widest text-gray-500">{label}</p>
                  <p className="text-2xl font-black font-mono mt-1 text-white">
                    {formatNumber(value, locale)}
                    <span className="text-xs text-gray-500"> / {formatNumber(total, locale)}</span>
                  </p>
                </div>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ color, backgroundColor: `${color}16`, border: `1px solid ${color}35` }}>
                  <Icon className="w-5 h-5" />
                </span>
              </div>
              <ProgressLine value={value} total={total} color={color} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4" style={{ color: tc.c2 }} />
              <h4 className="text-xs font-mono font-black uppercase tracking-widest" style={{ color: tc.c2 }}>
                {copy.missingYoutube}
              </h4>
            </div>
            <MissingList rows={report.missingYoutube} emptyLabel={copy.noneMissing} />
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ListChecks className="w-4 h-4" style={{ color: tc.c4 }} />
              <h4 className="text-xs font-mono font-black uppercase tracking-widest" style={{ color: tc.c4 }}>
                {copy.missingProfiles}
              </h4>
            </div>
            <MissingList rows={report.missingAnyMedia} emptyLabel={copy.noneMissing} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.025] overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3 flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" style={{ color: tc.c1 }} />
              <h4 className="text-xs font-mono font-black uppercase tracking-widest text-white">{copy.top20Status}</h4>
            </div>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
              {copy.auditedArtists(report.auditedArtists, report.totalArtists)}
            </p>
          </div>

          <div className="divide-y divide-white/5">
            {report.rows.map(row => {
              const youtubeLabel = row.youtubeEmbeddable
                ? copy.embedReady
                : row.youtubeVerified
                  ? copy.verifiedLink
                  : copy.searchFallback;

              return (
                <div key={row.artist} className="grid grid-cols-1 gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1.1fr)_auto_auto_minmax(170px,0.5fr)] lg:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate">
                      <span className="mr-2 font-mono text-xs" style={{ color: tc.c1 }}>#{row.rank}</span>
                      {row.artist}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {copy.plays(formatNumber(row.plays, locale))}
                    </p>
                  </div>

                  <StatusPill
                    label={row.spotifyVerified ? copy.verifiedLink : copy.searchFallback}
                    ready={row.spotifyVerified}
                    fallback={!row.spotifyVerified}
                    tc={tc}
                  />
                  <StatusPill
                    label={youtubeLabel}
                    ready={row.youtubeVerified}
                    fallback={!row.youtubeVerified}
                    tc={tc}
                  />

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <a
                      href={row.spotifyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-widest transition-all hover:bg-white/10"
                      style={{ color: '#1DB954', borderColor: '#1DB95440', backgroundColor: '#1DB95412' }}
                    >
                      {copy.openSpotify}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={row.youtubeVerified ? row.youtubeUrl : row.youtubeSearchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-widest transition-all hover:bg-white/10"
                      style={{ color: '#ff0033', borderColor: '#ff003340', backgroundColor: '#ff003312' }}
                    >
                      {row.youtubeVerified ? copy.openYoutube : copy.openSearch}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-green-500/15 bg-green-950/5 p-4">
          <p className="text-xs text-gray-400 leading-relaxed">{copy.legalNote}</p>
        </div>
      </div>
    </section>
  );
}
