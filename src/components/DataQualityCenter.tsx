import React from 'react';
import {
  Activity,
  CheckCircle2,
  BookOpenText,
  Database,
  FileJson,
  Gauge,
  Info,
  Layers3,
  ListChecks,
} from 'lucide-react';
import type {
  ArtistEnrichmentGap,
  ArtistEnrichmentPriority,
  ArtistGenreCatalogEntry,
  GenreAssignment,
  MusicDnaData,
  PlaySource,
} from '../types';
import {
  buildMonthlyActivity,
  deriveSourceSummary,
  formatNumber,
  getNightRatio,
  getPeakYear,
} from '../utils/analytics';
import { useApp } from '../context/AppContext';
import SectionNarrative from './SectionNarrative';
import { localizeProjectLabel, localizeSourceNote } from '../utils/localizedDatasetText';
import MediaCoverageAudit from './MediaCoverageAudit';
import { buildOfflineArtistKnowledgeSummary } from '../utils/offlineArtistKnowledge';
import { deriveDatasetTemporalTrust } from '../utils/dataTrust';
import { localeFor, pickLanguage } from '../utils/i18n';
import GenreTaggingStudio from './GenreTaggingStudio';

type ConfidenceKind = 'exact' | 'mixed' | 'estimated' | 'inferred' | 'curated' | 'unavailable';

interface DataQualityCenterProps {
  data: MusicDnaData;
  genreAssignments?: GenreAssignment[];
  useBundledGenreCatalog?: boolean;
  onGenreAssignmentsChange?: (
    assignments: GenreAssignment[],
    catalog: ArtistGenreCatalogEntry[],
  ) => void;
}

function confidenceColor(kind: ConfidenceKind, tc: ReturnType<typeof useApp>['tc']) {
  const map: Record<ConfidenceKind, string> = {
    exact: '#22c55e',
    mixed: tc.c1,
    estimated: '#f59e0b',
    inferred: tc.c3,
    curated: tc.c2,
    unavailable: '#6b7280',
  };
  return map[kind];
}

function metricConfidence(id: string, sourceType: PlaySource, hasMonthlyActivity: boolean): ConfidenceKind {
  if (id === 'totalPlays' || id === 'activeDays') return 'exact';
  if (id === 'listeningTime') {
    if (sourceType === 'spotify') return 'exact';
    if (sourceType === 'merged') return 'mixed';
    return 'estimated';
  }
  if (id === 'sessions' || id === 'eras') return 'mixed';
  if (id === 'obsessions' || id === 'genres') return 'inferred';
  if (id === 'countries') return sourceType === 'spotify' || sourceType === 'merged' ? 'mixed' : 'inferred';
  if (id === 'personality') return 'curated';
  if (id === 'matchRate') return sourceType === 'merged' ? 'exact' : hasMonthlyActivity ? 'estimated' : 'unavailable';
  return 'mixed';
}

function overallConfidence(data: MusicDnaData) {
  const source = deriveSourceSummary(data);
  const monthly = buildMonthlyActivity(data);
  let score = 52;

  if (source.source_type === 'lastfm') score += 10;
  if (source.source_type === 'spotify') score += 14;
  if (source.source_type === 'youtube') score += 8;
  if (source.source_type === 'apple_music') score += 10;
  if (source.source_type === 'listenbrainz') score += 12;
  if (source.source_type === 'merged') score += 24;
  if (data.records) score += 6;
  if (data.platform_breakdown?.length) score += 5;
  if (data.monthly_activity?.length && !monthly.estimated) score += 6;
  if (data.top_artists.length && data.top_tracks.length) score += 5;
  if (source.overlap_unique_tracks > 0) score += 4;

  return Math.min(96, Math.max(45, score));
}

function sourceKindCopy(sourceType: PlaySource, copy: Record<PlaySource, string>) {
  return copy[sourceType] ?? copy.unknown;
}

function priorityColor(priority: ArtistEnrichmentPriority, tc: ReturnType<typeof useApp>['tc']) {
  const colors: Record<ArtistEnrichmentPriority, string> = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: tc.c2,
    low: '#22c55e',
  };
  return colors[priority];
}

export default function DataQualityCenter({
  data,
  genreAssignments = [],
  useBundledGenreCatalog = false,
  onGenreAssignmentsChange,
}: DataQualityCenterProps) {
  const { t, tc, lang } = useApp();
  const source = deriveSourceSummary(data);
  const locale = localeFor(lang);
  const sourceNote = localizeSourceNote(source, lang);
  // The bundled dataset can outlive an offline-knowledge refresh. Always build
  // this view from the live offline archive instead of displaying its embedded
  // (and potentially stale) import-time snapshot.
  const knowledgeSummary = buildOfflineArtistKnowledgeSummary(data.top_artists);
  const temporalTrust = deriveDatasetTemporalTrust(data);
  const peakYear = getPeakYear(data);
  const night = getNightRatio(data);
  const confidence = overallConfidence(data);
  const hasMonthlyActivity = Boolean(data.monthly_activity?.length);
  const top10ArtistPlays = data.top_artists.slice(0, 10).reduce((sum, artist) => sum + artist.plays, 0);
  const topArtist = data.top_artists[0];
  const topArtistShare = topArtist && top10ArtistPlays > 0
    ? Math.round((topArtist.plays / top10ArtistPlays) * 100)
    : 0;
  const explorationScore = Math.round((data.core_metrics.unique_artists / Math.max(1, data.core_metrics.total_plays)) * 1000);
  const generatedAt = data.generated_at
    ? new Date(data.generated_at).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
    : 'N/A';
  const formatDataDate = (dateKey: string) => new Date(`${dateKey}T12:00:00Z`)
    .toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  const periodStatus = temporalTrust.latestPeriodStatus === 'ytd'
    ? pickLanguage(lang, { en: '⏳ YTD', es: '⏳ Año en curso', he: '⏳ מתחילת השנה' })
    : temporalTrust.latestPeriodStatus === 'complete'
      ? pickLanguage(lang, { en: '✅ Complete year', es: '✅ Año completo', he: '✅ שנה מלאה' })
      : temporalTrust.latestPeriodStatus === 'partial'
        ? pickLanguage(lang, { en: '⚠ Partial period', es: '⚠ Periodo parcial', he: '⚠ תקופה חלקית' })
        : pickLanguage(lang, { en: 'Date range unavailable', es: 'Rango no disponible', he: 'טווח התאריכים אינו זמין' });
  const observedPeriod = temporalTrust.dataMinDate && temporalTrust.dataMaxDate
    ? `${formatDataDate(temporalTrust.dataMinDate)} → ${formatDataDate(temporalTrust.dataMaxDate)} · ${periodStatus} · ${temporalTrust.analysisTimeZone}`
    : t.dataQuality.activeDatasetLabel;
  const formatPct = (value: number) => `${value.toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
  const gapLabel = (gap: ArtistEnrichmentGap) => t.dataQuality.knowledge.gaps[gap] ?? gap;

  const sourceReading = source.source_type === 'merged'
    ? t.dataQuality.dynamic.sourceMerged
    : source.source_type === 'spotify'
      ? t.dataQuality.dynamic.sourceSpotify
      : source.source_type === 'youtube'
        ? t.dataQuality.dynamic.sourceYoutube
        : source.source_type === 'apple_music'
          ? t.dataQuality.dynamic.sourceAppleMusic
          : source.source_type === 'listenbrainz'
            ? t.dataQuality.dynamic.sourceListenBrainz
            : source.source_type === 'lastfm'
              ? t.dataQuality.dynamic.sourceLastfm
              : t.dataQuality.dynamic.sourceUnknown;

  const profileCards = [
    {
      icon: Database,
      label: t.dataQuality.sourceTypeLabel,
      value: sourceKindCopy(source.source_type, t.dataQuality.sourceTypes),
      sub: localizeProjectLabel(data.project, lang),
      color: tc.c1,
    },
    {
      icon: Activity,
      label: t.dataQuality.eventCountLabel,
      value: formatNumber(source.merged_plays || data.core_metrics.total_plays, locale),
      sub: pickLanguage(lang, {
        en: `${formatNumber(data.core_metrics.unique_artists, locale)} artists · ${formatNumber(data.core_metrics.unique_tracks, locale)} tracks`,
        es: `${formatNumber(data.core_metrics.unique_artists, locale)} artistas · ${formatNumber(data.core_metrics.unique_tracks, locale)} canciones`,
        he: `${formatNumber(data.core_metrics.unique_artists, locale)} אמנים · ${formatNumber(data.core_metrics.unique_tracks, locale)} שירים`,
      }),
      color: tc.c2,
    },
    {
      icon: Gauge,
      label: t.dataQuality.confidenceScoreLabel,
      value: `${confidence}%`,
      sub: confidence >= 82 ? t.dataQuality.exact : confidence >= 70 ? t.dataQuality.mixed : t.dataQuality.estimated,
      color: confidence >= 82 ? '#22c55e' : confidence >= 70 ? tc.c1 : '#f59e0b',
    },
    {
      icon: FileJson,
      label: t.dataQuality.generatedAtLabel,
      value: generatedAt,
      sub: observedPeriod,
      color: tc.c4,
    },
  ];

  const sourceCards = [
    { label: t.dataQuality.lastfmLabel, value: source.lastfm_plays, kind: 'exact' as ConfidenceKind },
    {
      label: t.dataQuality.spotifyLabel,
      value: source.spotify_plays,
      kind: source.source_type === 'lastfm' && source.spotify_plays > 0 ? 'estimated' as ConfidenceKind : 'exact' as ConfidenceKind,
    },
    {
      label: t.dataQuality.youtubeLabel,
      value: source.youtube_plays,
      kind: source.youtube_plays ? 'inferred' as ConfidenceKind : 'unavailable' as ConfidenceKind,
    },
    // Apple Music / ListenBrainz only appear once a matching upload actually
    // contributed plays - most datasets never touch these two sources, so a
    // permanent zero-value row would just be noise for everyone else.
    ...(source.apple_music_plays ? [{
      label: t.dataQuality.appleMusicLabel,
      value: source.apple_music_plays,
      kind: 'exact' as ConfidenceKind,
    }] : []),
    ...(source.listenbrainz_plays ? [{
      label: t.dataQuality.listenBrainzLabel,
      value: source.listenbrainz_plays,
      kind: 'exact' as ConfidenceKind,
    }] : []),
    {
      label: t.dataQuality.overlapLabel,
      value: source.overlap_unique_tracks,
      kind: source.source_type === 'merged' ? 'exact' as ConfidenceKind : 'unavailable' as ConfidenceKind,
    },
    { label: t.dataQuality.skipsLabel, value: source.spotify_skips, kind: source.spotify_plays ? 'exact' as ConfidenceKind : 'unavailable' as ConfidenceKind },
    { label: t.dataQuality.shortPlaysLabel, value: source.spotify_short_plays, kind: source.spotify_short_plays ? 'estimated' as ConfidenceKind : 'unavailable' as ConfidenceKind },
    { label: t.dataQuality.platformLabel, value: data.platform_breakdown?.length ?? 0, kind: data.platform_breakdown?.length ? 'exact' as ConfidenceKind : 'unavailable' as ConfidenceKind },
    { label: t.dataQuality.countryLabel, value: data.countries.length, kind: 'inferred' as ConfidenceKind },
  ];

  const dynamicLines = [
    sourceReading,
    peakYear ? t.dataQuality.dynamic.peakYear(peakYear.year, formatNumber(peakYear.plays, locale)) : '',
    topArtist ? t.dataQuality.dynamic.topArtistShare(topArtist.name, topArtistShare) : '',
    t.dataQuality.knowledge.dynamic(
      formatPct(knowledgeSummary.match_rate_pct),
      knowledgeSummary.matched_artists,
      knowledgeSummary.total_artists,
    ),
    t.dataQuality.dynamic.nightRatio(night),
    t.dataQuality.dynamic.exploration(explorationScore),
  ].filter(Boolean);

  const knowledgeCards = [
    {
      label: t.dataQuality.knowledge.matchedArtists,
      value: `${knowledgeSummary.matched_artists}/${knowledgeSummary.total_artists}`,
      sub: formatPct(knowledgeSummary.match_rate_pct),
      color: '#22c55e',
    },
    {
      label: t.dataQuality.knowledge.playCoverage,
      value: formatPct(knowledgeSummary.matched_play_rate_pct),
      sub: formatNumber(knowledgeSummary.matched_plays, locale),
      color: tc.c2,
    },
    {
      label: t.dataQuality.knowledge.localCache,
      value: formatNumber(knowledgeSummary.cache_artist_count, locale),
      sub: t.dataQuality.knowledge.wikidataProfiles(formatNumber(knowledgeSummary.wikidata_profile_count, locale)),
      color: tc.c3,
    },
    {
      label: t.dataQuality.knowledge.missingProfiles,
      value: formatNumber(knowledgeSummary.unmatched_artists, locale),
      sub: knowledgeSummary.unmatched_artists ? t.dataQuality.knowledge.needsEnrichment : t.dataQuality.knowledge.complete,
      color: knowledgeSummary.unmatched_artists ? '#f59e0b' : '#22c55e',
    },
  ];

  return (
    <div className="space-y-10 animate-fade-in">
      <SectionNarrative content={t.deepNarratives.dataQuality} accent="c1" />

      {onGenreAssignmentsChange && (
        <GenreTaggingStudio
          data={data}
          assignments={genreAssignments}
          useBundledCatalog={useBundledGenreCatalog}
          onAssignmentsChange={onGenreAssignmentsChange}
        />
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5" style={{ color: tc.c1 }} />
          <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
            {t.dataQuality.sourceProfileTitle}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {profileCards.map(({ icon: Icon, label, value, sub, color }) => (
            <div key={label} className="nova-surface nova-surface--utility rounded-2xl border-l-4 p-5" style={{ borderLeftColor: color }}>
              <Icon className="w-5 h-5 mb-3" style={{ color }} />
              <p className="text-[10px] font-mono font-black uppercase tracking-widest text-gray-400">{label}</p>
              <p className="text-lg font-black text-white mt-1 leading-tight">{value}</p>
              <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{sub}</p>
            </div>
          ))}
        </div>

        <div className="nova-surface nova-surface--analysis rounded-2xl p-5">
          <p className="text-xs text-gray-300 leading-relaxed">{sourceNote}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mt-5">
            {sourceCards.map(card => {
              const color = confidenceColor(card.kind, tc);
              return (
                <div key={card.label} className="rounded-xl bg-white/3 border border-white/5 p-3">
                  <p className="text-[10px] font-mono font-black uppercase tracking-wider text-gray-500">{card.label}</p>
                  <p className="text-xl font-black font-mono mt-1" style={{ color }}>
                    {formatNumber(card.value, locale)}
                  </p>
                  <p className="text-[9px] font-mono mt-1" style={{ color }}>
                    {t.dataQuality[card.kind]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5" style={{ color: tc.c2 }} />
          <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
            {t.dataQuality.knowledge.title}
          </h3>
        </div>

        <div className="nova-surface nova-surface--analysis rounded-3xl p-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <p className="text-xs leading-relaxed text-gray-300">
                {t.dataQuality.knowledge.subtitle}
              </p>
              <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
                {t.dataQuality.knowledge.sourceNote}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {knowledgeCards.map(card => (
                  <div key={card.label} className="rounded-2xl border bg-white/[0.035] p-3" style={{ borderColor: `${card.color}28` }}>
                    <p className="text-[9px] font-mono font-black uppercase tracking-wider text-gray-500">{card.label}</p>
                    <p className="mt-1 text-xl font-black font-mono" style={{ color: card.color }}>{card.value}</p>
                    <p className="mt-1 truncate text-[10px] text-gray-500">{card.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                <p className="text-[10px] font-mono font-black uppercase tracking-widest text-gray-500">
                  {t.dataQuality.knowledge.topMatches}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {knowledgeSummary.top_matches.slice(0, 8).map(match => (
                    <span key={`${match.mbid}-${match.name}`} className="rounded-full border px-2.5 py-1 text-[10px] font-mono font-bold" style={{ color: tc.c1, borderColor: `${tc.c1}35`, backgroundColor: `${tc.c1}10` }}>
                      {match.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                <p className="text-[10px] font-mono font-black uppercase tracking-widest text-gray-500">
                  {t.dataQuality.knowledge.topMissing}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {knowledgeSummary.top_missing.length ? knowledgeSummary.top_missing.slice(0, 8).map(match => (
                    <span key={match.name} className="rounded-full border border-amber-500/30 bg-amber-950/10 px-2.5 py-1 text-[10px] font-mono font-bold text-amber-300">
                      {match.name}
                    </span>
                  )) : (
                    <span className="text-xs text-gray-400">{t.dataQuality.knowledge.noMissing}</span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4 lg:col-span-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-4 h-4" style={{ color: tc.c4 }} />
                      <p className="text-[10px] font-mono font-black uppercase tracking-widest" style={{ color: tc.c4 }}>
                        {t.dataQuality.knowledge.enrichmentQueueTitle}
                      </p>
                    </div>
                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-500">
                      {t.dataQuality.knowledge.enrichmentQueueHint}
                    </p>
                  </div>
                  <span className="rounded-full border px-2.5 py-1 text-[10px] font-mono font-black"
                    style={{ color: tc.c4, borderColor: `${tc.c4}35`, backgroundColor: `${tc.c4}10` }}>
                    {knowledgeSummary.enrichment_queue.length}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {knowledgeSummary.enrichment_queue.length ? knowledgeSummary.enrichment_queue.slice(0, 6).map(item => {
                    const color = priorityColor(item.priority, tc);
                    return (
                      <div key={`${item.rank}-${item.name}`} className="rounded-2xl border bg-black/20 p-3" style={{ borderColor: `${color}30` }}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-black text-white truncate">
                              #{item.rank} {item.name}
                            </p>
                            <p className="mt-1 text-[10px] font-mono text-gray-500">
                              {formatNumber(item.plays, locale)} {t.topHistorico.playsLegend.toLowerCase()} · {t.dataQuality.knowledge.queueScore}: {item.score}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full border px-2 py-1 text-[9px] font-mono font-black uppercase tracking-wider"
                            style={{ color, borderColor: `${color}40`, backgroundColor: `${color}12` }}>
                            {t.dataQuality.knowledge.priorityLabels[item.priority]}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {item.gaps.slice(0, 4).map(gap => (
                            <span key={`${item.name}-${gap}`} className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-[9px] font-mono font-bold text-gray-300">
                              {gapLabel(gap)}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-xs text-gray-400">{t.dataQuality.knowledge.noEnrichmentQueue}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MediaCoverageAudit data={data} />

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Layers3 className="w-5 h-5" style={{ color: tc.c2 }} />
            <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
              {t.dataQuality.metricConfidenceTitle}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {t.dataQuality.metrics.map(metric => {
              const kind = metricConfidence(metric.id, source.source_type, hasMonthlyActivity);
              const color = confidenceColor(kind, tc);
              return (
                <div key={metric.id} className="nova-surface nova-surface--analysis rounded-2xl p-4" style={{ borderColor: `${color}28` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">{metric.label}</p>
                      <p className="text-xs text-gray-400 leading-relaxed mt-1">{metric.method}</p>
                    </div>
                    <span
                      className="shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-mono font-black uppercase"
                      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}12` }}
                    >
                      {t.dataQuality[kind]}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-3">{t.dataQuality.confidenceCopy[kind]}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5" style={{ color: tc.c3 }} />
            <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
              {t.dataQuality.dynamicReadingTitle}
            </h3>
          </div>
          <div className="nova-surface nova-surface--analysis space-y-3 rounded-2xl p-5">
            {dynamicLines.map((line, index) => (
              <div key={line} className="flex gap-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black"
                  style={{ backgroundColor: `${[tc.c1, tc.c2, tc.c3, tc.c4][index % 4]}20`, color: [tc.c1, tc.c2, tc.c3, tc.c4][index % 4] }}
                >
                  {index + 1}
                </span>
                <p className="text-xs text-gray-300 leading-relaxed">{line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5" style={{ color: tc.c4 }} />
          <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
            {t.dataQuality.methodologyTitle}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {t.dataQuality.methodology.map((method, index) => {
            const color = [tc.c1, tc.c2, tc.c3, tc.c4][index % 4];
            return (
              <div key={method.title} className="nova-surface nova-surface--analysis rounded-2xl border-t-4 p-5" style={{ borderTopColor: color }}>
                <p className="text-[10px] font-mono font-black uppercase tracking-widest mb-2" style={{ color }}>
                  {method.tag}
                </p>
                <h4 className="text-base font-black text-white">{method.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed mt-2">{method.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpenText className="w-5 h-5" style={{ color: tc.c1 }} />
          <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
            {t.dataQuality.glossaryTitle}
          </h3>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed max-w-4xl">
          {t.dataQuality.glossaryIntro}
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {t.dataQuality.glossary.map((group, groupIndex) => {
            const color = [tc.c1, tc.c2, tc.c3, tc.c4][groupIndex % 4];
            return (
              <div key={group.group} className="nova-surface nova-surface--analysis rounded-2xl p-5" style={{ borderColor: `${color}25` }}>
                <h4 className="text-xs font-mono font-black uppercase tracking-widest mb-4" style={{ color }}>
                  {group.group}
                </h4>
                <div className="space-y-3">
                  {group.terms.map(term => (
                    <div key={term.term} className="rounded-xl border border-white/5 bg-white/3 p-3">
                      <p className="text-sm font-bold text-white">{term.term}</p>
                      <p className="text-xs text-gray-400 leading-relaxed mt-1">{term.definition}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="nova-surface nova-surface--utility rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
            {t.dataQuality.checklistTitle}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {t.dataQuality.checklist.map(item => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-green-500/15 bg-green-950/5 p-4">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-green-400" />
              <p className="text-xs text-gray-300 leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
