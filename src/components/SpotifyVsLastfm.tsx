import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Eye, Music, GitMerge, TableProperties } from 'lucide-react';
import { MusicDnaData } from '../types';
import { deriveSourceSummary, getNightRatio, getTwoYearPeak } from '../utils/analytics';
import { buildSourceReconciliation } from '../utils/chartIntegrity';
import { useApp } from '../context/AppContext';
import ArtistAvatar from './ArtistAvatar';
import SectionNarrative from './SectionNarrative';
import { localizeSourceNote } from '../utils/localizedDatasetText';
import { ChartCanvas, ChartFrame } from './chartKit';
import { localeFor, pickLanguage } from '../utils/i18n';

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

export default function SpotifyVsLastfm({ data }: SpotifyVsLastfmProps) {
  const [activeInsight, setActiveInsight] = useState(0);
  const { t, lang, setActiveTab, setSelectedArtistName, setTopSubTab } = useApp();
  const locale = localeFor(lang);
  const fmtNum = (n: number) => Math.round(n).toLocaleString(locale);
  const source = deriveSourceSummary(data);
  const sourceNote = localizeSourceNote(source, lang);
  const lastfmTotal = source.lastfm_plays;
  const spotifyDirectTotal = source.spotify_plays;
  const matchRate = data.core_metrics.match_rate_pct;
  const reconciliation = buildSourceReconciliation(source);
  const spotifyOnlyApprox = source.spotify_short_plays;
  const topArtist = data.top_artists[0];
  const topConsciousArtist = data.top_artists.find(artist => artist.name !== topArtist?.name) ?? data.top_artists[1];
  const twoYearPeak = getTwoYearPeak(data.yearly_eras);
  const night = getNightRatio(data);
  const copy = pickLanguage(lang, {
    en: {
        reconciliationTitle: 'Source reconciliation',
        reconciliationSubtitle: 'Raw inbound events → countability filters → deduplicated listens. Every value comes from the active source summary.',
        reconciliationSummary: reconciliation.reconcilesExactly
          ? `${fmtNum(reconciliation.rawEvents)} raw events reconcile exactly to ${fmtNum(reconciliation.finalListens)} counted listens.`
          : `The source summary needs a visible ${fmtNum(Math.abs(reconciliation.adjustment))}-event adjustment to reconcile.`,
        raw: 'Raw source events', short: 'Under 30 seconds', duplicate: 'Cross-source duplicates',
        adjustment: 'Other declared filters', final: 'Final counted listens',
        capabilitiesTitle: 'Measured capability matrix',
        capabilitiesSubtitle: 'Qualitative availability only—no synthetic scores.',
        metric: 'Signal', direct: '✅ Direct', unavailable: '— Unavailable', conditional: '◐ Export-dependent',
        timestamp: 'Timestamp', album: 'Album metadata', skips: 'Skip / short-play flag',
        context: 'Playlist context', device: 'Device / platform',
      },
    es: {
        reconciliationTitle: 'Reconciliación de fuentes',
        reconciliationSubtitle: 'Eventos crudos → filtros de conteo → escuchas deduplicadas. Cada valor viene del resumen de la fuente activa.',
        reconciliationSummary: reconciliation.reconcilesExactly
          ? `${fmtNum(reconciliation.rawEvents)} eventos crudos reconcilian exactamente con ${fmtNum(reconciliation.finalListens)} escuchas contadas.`
          : `El resumen necesita un ajuste visible de ${fmtNum(Math.abs(reconciliation.adjustment))} eventos para reconciliar.`,
        raw: 'Eventos crudos por fuente', short: 'Menos de 30 segundos', duplicate: 'Duplicados entre fuentes',
        adjustment: 'Otros filtros declarados', final: 'Escuchas finales contadas',
        capabilitiesTitle: 'Matriz de capacidades medidas',
        capabilitiesSubtitle: 'Disponibilidad cualitativa, sin puntuaciones sintéticas.',
        metric: 'Señal', direct: '✅ Directo', unavailable: '— Ausente', conditional: '◐ Depende del export',
        timestamp: 'Timestamp', album: 'Metadatos de álbum', skips: 'Skip / reproducción corta',
        context: 'Contexto de playlist', device: 'Dispositivo / plataforma',
      },
    he: {
        reconciliationTitle: 'התאמת מקורות',
        reconciliationSubtitle: 'אירועי מקור גולמיים ← מסנני ספירה ← השמעות לאחר הסרת כפילויות. כל ערך מגיע מסיכום המקור הפעיל.',
        reconciliationSummary: reconciliation.reconcilesExactly
          ? `${fmtNum(reconciliation.rawEvents)} אירועים גולמיים מתאימים בדיוק ל-${fmtNum(reconciliation.finalListens)} השמעות שנספרו.`
          : `כדי להשלים את ההתאמה נדרש תיקון גלוי של ${fmtNum(Math.abs(reconciliation.adjustment))} אירועים.`,
        raw: 'אירועי מקור גולמיים', short: 'פחות מ-30 שניות', duplicate: 'כפילויות בין מקורות',
        adjustment: 'מסננים מוצהרים נוספים', final: 'השמעות סופיות שנספרו',
        capabilitiesTitle: 'מטריצת יכולות נמדדות',
        capabilitiesSubtitle: 'זמינות איכותנית בלבד, ללא ציונים מלאכותיים.',
        metric: 'אות', direct: '✅ ישיר', unavailable: '— לא זמין', conditional: '◐ תלוי בקובץ הייצוא',
        timestamp: 'חותמת זמן', album: 'מטא-נתוני אלבום', skips: 'דילוג / השמעה קצרה',
        context: 'הקשר של פלייליסט', device: 'מכשיר / פלטפורמה',
      },
  });

  const waterfallRows = [
    { stage: copy.raw, delta: reconciliation.rawEvents, runningTotal: reconciliation.rawEvents, start: 0, end: reconciliation.rawEvents, tone: 'anchor' },
    { stage: copy.short, delta: -reconciliation.shortEvents, runningTotal: reconciliation.afterShort, start: reconciliation.afterShort, end: reconciliation.rawEvents, tone: 'remove' },
    { stage: copy.duplicate, delta: -reconciliation.duplicateEvents, runningTotal: reconciliation.afterDeduplication, start: reconciliation.afterDeduplication, end: reconciliation.afterShort, tone: 'remove' },
    ...(reconciliation.adjustment !== 0 ? [{
      stage: copy.adjustment,
      delta: reconciliation.adjustment,
      runningTotal: reconciliation.finalListens,
      start: Math.min(reconciliation.afterDeduplication, reconciliation.finalListens),
      end: Math.max(reconciliation.afterDeduplication, reconciliation.finalListens),
      tone: reconciliation.adjustment > 0 ? 'add' : 'remove',
    }] : []),
    { stage: copy.final, delta: reconciliation.finalListens, runningTotal: reconciliation.finalListens, start: 0, end: reconciliation.finalListens, tone: 'final' },
  ];
  const waterfallMax = Math.max(1, reconciliation.rawEvents, reconciliation.finalListens);
  const capabilityRows = [
    { metric: copy.timestamp, lastfm: lastfmTotal ? copy.direct : copy.unavailable, spotify: spotifyDirectTotal ? copy.direct : copy.unavailable },
    { metric: copy.album, lastfm: lastfmTotal ? copy.direct : copy.unavailable, spotify: spotifyDirectTotal ? copy.direct : copy.unavailable },
    { metric: copy.skips, lastfm: copy.unavailable, spotify: source.spotify_skips || source.spotify_short_plays ? copy.direct : copy.unavailable },
    { metric: copy.context, lastfm: copy.unavailable, spotify: spotifyDirectTotal ? copy.conditional : copy.unavailable },
    { metric: copy.device, lastfm: copy.unavailable, spotify: data.platform_breakdown?.length ? copy.direct : copy.conditional },
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
      label: copy.raw,
      value: fmtNum(reconciliation.rawEvents),
      sub: pickLanguage(lang, { en: 'All inbound source counters', es: 'Todos los contadores de entrada', he: 'כל מוני האירועים שנקלטו' }),
      color: '#38bdf8',
      icon: 'Σ',
    },
    {
      label: copy.short,
      value: fmtNum(reconciliation.shortEvents),
      sub: pickLanguage(lang, { en: 'Excluded from counted listens', es: 'Excluidos de escuchas contadas', he: 'לא נכללו בהשמעות שנספרו' }),
      color: '#f59e0b',
      icon: '−',
    },
    {
      label: copy.duplicate,
      value: fmtNum(reconciliation.duplicateEvents),
      sub: pickLanguage(lang, { en: 'Collapsed to one listen', es: 'Colapsados a una escucha', he: 'אוחדו להשמעה אחת' }),
      color: '#f72585',
      icon: '≋',
    },
    {
      label: copy.final,
      value: fmtNum(reconciliation.finalListens),
      sub: reconciliation.reconcilesExactly
        ? pickLanguage(lang, { en: 'Exact reconciliation', es: 'Reconciliación exacta', he: 'התאמה מדויקת' })
        : pickLanguage(lang, { en: 'Includes visible adjustment', es: 'Incluye ajuste visible', he: 'כולל תיקון גלוי' }),
      color: '#10b981',
      icon: '✓',
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
            <p className="text-4xl font-black text-white font-mono">
              {spotifyDirectTotal ? fmtNum(spotifyDirectTotal) : '—'}
            </p>
            <p className="text-xs text-gray-400 font-mono">
              {spotifyDirectTotal
                ? t.spotifyVsLastfm.measuredPlaysIncludesSkips
                : pickLanguage(lang, { en: 'No direct Spotify export', es: 'Sin export directo de Spotify', he: 'אין ייצוא ישיר מ-Spotify' })}
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

      {/* Evidence-first reconciliation + qualitative capability matrix */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="glass-panel p-6 rounded-3xl">
          <ChartFrame
            title={copy.reconciliationTitle}
            subtitle={copy.reconciliationSubtitle}
            summary={copy.reconciliationSummary}
            status={reconciliation.reconcilesExactly ? 'exact' : 'estimated'}
            tableRows={waterfallRows.map(({ stage, delta, runningTotal }) => ({ stage, delta, runningTotal }))}
            fileName="nova-source-reconciliation.csv"
          >
            <ChartCanvas className="space-y-3" data-testid="source-reconciliation-waterfall">
              {waterfallRows.map((row) => {
                const color = row.tone === 'final' ? '#10b981'
                  : row.tone === 'remove' ? '#f59e0b'
                    : row.tone === 'add' ? '#38bdf8' : '#64748b';
                return (
                  <div key={row.stage} className="grid grid-cols-[minmax(7.5rem,0.9fr)_minmax(8rem,1.5fr)_auto] items-center gap-3">
                    <span className="text-[10px] font-mono font-bold leading-tight text-gray-400">{row.stage}</span>
                    <div className="relative h-7 overflow-hidden rounded-lg bg-white/5" aria-hidden="true">
                      <span
                        className="absolute inset-y-1 rounded-md border"
                        style={{
                          left: `${(Math.min(row.start, row.end) / waterfallMax) * 100}%`,
                          width: `${Math.max(1.2, (Math.abs(row.end - row.start) / waterfallMax) * 100)}%`,
                          backgroundColor: `${color}38`,
                          borderColor: `${color}90`,
                        }}
                      />
                    </div>
                    <span className="min-w-[5.25rem] text-right text-xs font-mono font-black" style={{ color }}>
                      {row.tone === 'remove' ? '−' : row.tone === 'add' ? '+' : ''}{fmtNum(Math.abs(row.delta))}
                    </span>
                  </div>
                );
              })}
            </ChartCanvas>
          </ChartFrame>
        </div>

        <div className="glass-panel p-6 rounded-3xl">
          <div className="mb-4 flex items-center gap-2">
            <TableProperties className="h-5 w-5 text-cyberPink" />
            <div>
              <h3 className="type-section type-strong">{copy.capabilitiesTitle}</h3>
              <p className="type-caption type-muted mt-1">{copy.capabilitiesSubtitle}</p>
            </div>
          </div>
          <div data-testid="source-capability-matrix" className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead className="bg-white/5 font-mono uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-4 py-3">{copy.metric}</th>
                  <th className="px-4 py-3 text-[#e8334a]">Last.fm</th>
                  <th className="px-4 py-3 text-[#1DB954]">Spotify</th>
                </tr>
              </thead>
              <tbody>
                {capabilityRows.map((row) => (
                  <tr key={row.metric} className="border-t border-white/5">
                    <th className="px-4 py-3 font-medium text-gray-300">{row.metric}</th>
                    <td className="px-4 py-3 font-mono text-gray-400">{row.lastfm}</td>
                    <td className="px-4 py-3 font-mono text-gray-400">{row.spotify}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-gray-500">
            <GitMerge className="mt-0.5 h-4 w-4 shrink-0 text-cyberCyan" />
            {pickLanguage(lang, {
              en: 'Availability describes fields present in the active archive; it is not a platform quality ranking.',
              es: 'La disponibilidad describe campos presentes en el archivo activo; no es un ranking de calidad entre plataformas.',
              he: 'הזמינות מתארת אילו שדות קיימים בארכיון הפעיל; היא אינה דירוג איכות של הפלטפורמות.',
            })}
          </p>
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
                    <span 
                      key={name} 
                      className="cursor-pointer transition-transform hover:scale-110 active:scale-95 z-10 hover:z-20"
                      onClick={() => {
                        setSelectedArtistName(name);
                        setTopSubTab('artists');
                        setActiveTab('top');
                      }}
                    >
                      <ArtistAvatar name={name} size={32} className="ring-2 ring-black" />
                    </span>
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
              {sourceNote}
              {!spotifyDirectTotal && (
                <span> {pickLanguage(lang, { en: 'No Spotify count has been estimated.', es: 'No se ha estimado ningún conteo de Spotify.', he: 'לא הוערך מספר השמעות עבור Spotify.' })}</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
