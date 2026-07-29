import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Eye, Music, GitMerge, TableProperties } from 'lucide-react';
import { MusicDnaData } from '../types';
import {
  deriveSourceSummary,
  getNightRatio,
  getSourceTelemetry,
  getTwoYearPeak,
} from '../utils/analytics';
import { buildSourceReconciliation } from '../utils/chartIntegrity';
import { useApp } from '../context/AppContext';
import { useExperienceDepth } from '../context/ExperienceContext';
import ArtistAvatar from './ArtistAvatar';
import BrandIcon from './BrandIcon';
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
  const experienceDepth = useExperienceDepth();
  const isDeepDive = experienceDepth === 'deep-dive';
  const locale = localeFor(lang);
  const fmtNum = (n: number) => Math.round(n).toLocaleString(locale);
  const source = deriveSourceSummary(data);
  const sourceTelemetry = getSourceTelemetry(source);
  const sourceNote = localizeSourceNote(source, lang);
  const musicBeeSnapshot = data.musicbee_snapshot;
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
        capabilitiesTitle: 'Capability guide by export format',
        capabilitiesSubtitle: 'What each imported format can usually provide. This does not claim that every optional field was present.',
        metric: 'Signal', direct: '✅ Direct', unavailable: '— Unavailable', conditional: '◐ Export-dependent',
      timestamp: 'Timestamp', album: 'Album metadata', skips: 'Skip / short-play flag',
      context: 'Playlist context', device: 'Device / platform',
      ecosystemTitle: 'Source Observatory',
      ecosystemSubtitle: 'Every supported archive source is visible. Counts are raw inbound events before short-play filtering and cross-source deduplication.',
      friendlyEcosystemTitle: 'Where your listening history comes from',
      friendlyEcosystemSubtitle: 'See which music services contributed information and what each one adds to the story.',
      friendlyReconciliationSummary: reconciliation.adjustment === 0
        ? `After removing very short plays and repeated copies, ${fmtNum(reconciliation.rawEvents)} imported records became ${fmtNum(reconciliation.finalListens)} counted listens.`
        : `Nova kept ${fmtNum(reconciliation.finalListens)} counted listens from ${fmtNum(reconciliation.rawEvents)} imported records. An additional difference of ${fmtNum(Math.abs(reconciliation.adjustment))} records is explained by archive rules in Deep Dive.`,
      imported: 'Imported',
      notImported: 'Not in this archive',
      rawShare: 'of raw events',
      pairLensTitle: 'Detailed pair lens · Last.fm + Spotify',
      pairLensSubtitle: 'The two richest sources receive a deeper field-by-field comparison below; YouTube, Apple Music and ListenBrainz remain visible in the shared observatory.',
      friendlyPairLensTitle: 'What Last.fm and Spotify each add',
      friendlyPairLensSubtitle: 'Last.fm remembers when you listened; Spotify can add duration, skips, device and context when those fields exist in the export.',
      },
    es: {
        reconciliationTitle: 'Reconciliación de fuentes',
        reconciliationSubtitle: 'Eventos crudos → filtros de conteo → escuchas deduplicadas. Cada valor viene del resumen de la fuente activa.',
        reconciliationSummary: reconciliation.reconcilesExactly
          ? `${fmtNum(reconciliation.rawEvents)} eventos crudos reconcilian exactamente con ${fmtNum(reconciliation.finalListens)} escuchas contadas.`
          : `El resumen necesita un ajuste visible de ${fmtNum(Math.abs(reconciliation.adjustment))} eventos para reconciliar.`,
        raw: 'Eventos crudos por fuente', short: 'Menos de 30 segundos', duplicate: 'Duplicados entre fuentes',
        adjustment: 'Otros filtros declarados', final: 'Escuchas finales contadas',
        capabilitiesTitle: 'Guía de capacidades por formato',
        capabilitiesSubtitle: 'Lo que cada formato importado suele aportar. No afirma que todos los campos opcionales estuvieran presentes.',
        metric: 'Señal', direct: '✅ Directo', unavailable: '— Ausente', conditional: '◐ Depende del export',
        timestamp: 'Timestamp', album: 'Metadatos de álbum', skips: 'Skip / reproducción corta',
        context: 'Contexto de playlist', device: 'Dispositivo / plataforma',
        ecosystemTitle: 'Observatorio de Fuentes',
        ecosystemSubtitle: 'Todas las fuentes compatibles quedan visibles. Los conteos son eventos crudos antes de filtrar reproducciones cortas y deduplicar entre servicios.',
        friendlyEcosystemTitle: 'De dónde viene tu historial musical',
        friendlyEcosystemSubtitle: 'Mira qué servicios aportaron información y qué añade cada uno a la historia.',
        friendlyReconciliationSummary: reconciliation.adjustment === 0
          ? `Después de quitar reproducciones muy cortas y copias repetidas, ${fmtNum(reconciliation.rawEvents)} registros importados quedaron en ${fmtNum(reconciliation.finalListens)} escuchas contadas.`
          : `Nova conservó ${fmtNum(reconciliation.finalListens)} escuchas contadas de ${fmtNum(reconciliation.rawEvents)} registros importados. Una diferencia adicional de ${fmtNum(Math.abs(reconciliation.adjustment))} registros se explica con las reglas del archivo en A fondo.`,
        imported: 'Importado',
        notImported: 'No está en este archivo',
        rawShare: 'de eventos crudos',
        pairLensTitle: 'Lupa detallada · Last.fm + Spotify',
        pairLensSubtitle: 'Las dos fuentes más ricas reciben una comparación profunda; YouTube, Apple Music y ListenBrainz siguen visibles en el observatorio común.',
        friendlyPairLensTitle: 'Qué aporta Last.fm y qué aporta Spotify',
        friendlyPairLensSubtitle: 'Last.fm recuerda cuándo escuchaste; Spotify puede añadir duración, saltos, dispositivo y contexto cuando el export los incluye.',
      },
    he: {
        reconciliationTitle: 'התאמת מקורות',
        reconciliationSubtitle: 'אירועי מקור גולמיים ← מסנני ספירה ← השמעות לאחר הסרת כפילויות. כל ערך מגיע מסיכום המקור הפעיל.',
        reconciliationSummary: reconciliation.reconcilesExactly
          ? `${fmtNum(reconciliation.rawEvents)} אירועים גולמיים מתאימים בדיוק ל-${fmtNum(reconciliation.finalListens)} השמעות שנספרו.`
          : `כדי להשלים את ההתאמה נדרש תיקון גלוי של ${fmtNum(Math.abs(reconciliation.adjustment))} אירועים.`,
        raw: 'אירועי מקור גולמיים', short: 'פחות מ-30 שניות', duplicate: 'כפילויות בין מקורות',
        adjustment: 'מסננים מוצהרים נוספים', final: 'השמעות סופיות שנספרו',
        capabilitiesTitle: 'מדריך יכולות לפי פורמט הייצוא',
        capabilitiesSubtitle: 'מה כל פורמט שיובא יכול בדרך כלל לספק. אין זו טענה שכל שדה אופציונלי היה קיים.',
        metric: 'אות', direct: '✅ ישיר', unavailable: '— לא זמין', conditional: '◐ תלוי בקובץ הייצוא',
        timestamp: 'חותמת זמן', album: 'מטא-נתוני אלבום', skips: 'דילוג / השמעה קצרה',
        context: 'הקשר של פלייליסט', device: 'מכשיר / פלטפורמה',
        ecosystemTitle: 'מצפה מקורות',
        ecosystemSubtitle: 'כל מקורות הארכיון הנתמכים מוצגים. הספירות הן אירועים גולמיים לפני סינון השמעות קצרות והסרת כפילויות בין מקורות.',
        friendlyEcosystemTitle: 'מאין מגיעה היסטוריית ההאזנה שלך',
        friendlyEcosystemSubtitle: 'אפשר לראות אילו שירותים תרמו מידע ומה כל אחד מוסיף לסיפור.',
        friendlyReconciliationSummary: reconciliation.adjustment === 0
          ? `לאחר הסרת השמעות קצרות מאוד ורשומות כפולות, ${fmtNum(reconciliation.rawEvents)} רשומות שיובאו הפכו ל־${fmtNum(reconciliation.finalListens)} השמעות שנספרו.`
          : `Nova שמרה ${fmtNum(reconciliation.finalListens)} השמעות שנספרו מתוך ${fmtNum(reconciliation.rawEvents)} רשומות שיובאו. הבדל נוסף של ${fmtNum(Math.abs(reconciliation.adjustment))} רשומות מוסבר בכללי הארכיון במצב ״לעומק״.`,
        imported: 'יובא',
        notImported: 'לא נמצא בארכיון הזה',
        rawShare: 'מתוך האירועים הגולמיים',
        pairLensTitle: 'מבט מפורט · Last.fm + Spotify',
        pairLensSubtitle: 'שני המקורות העשירים ביותר מקבלים השוואה עמוקה; YouTube, Apple Music ו-ListenBrainz נשארים גלויים במצפה המשותף.',
        friendlyPairLensTitle: 'מה Last.fm ומה Spotify מוסיפים',
        friendlyPairLensSubtitle: 'Last.fm זוכר מתי האזנת; Spotify יכול להוסיף משך, דילוגים, מכשיר והקשר כאשר הייצוא כולל אותם.',
      },
  });

  const sourceProviders = [
    { id: 'lastfm', label: 'Last.fm', brand: 'lastfm', color: '#e8334a', plays: source.lastfm_plays },
    { id: 'spotify', label: 'Spotify', brand: 'spotify', color: '#1DB954', plays: source.spotify_plays },
    { id: 'youtube', label: 'YouTube', brand: 'youtube', color: '#ff0033', plays: source.youtube_plays },
    { id: 'apple_music', label: 'Apple Music', brand: 'applemusic', color: '#fa243c', plays: source.apple_music_plays },
    { id: 'listenbrainz', label: 'ListenBrainz', brand: 'listenbrainz', color: '#eb743b', plays: source.listenbrainz_plays },
  ] as const;
  const musicBeeCopy = pickLanguage(lang, {
    en: {
      eyebrow: 'Separate local-library snapshot',
      title: 'Your MusicBee library is connected',
      body: musicBeeSnapshot
        ? `${fmtNum(musicBeeSnapshot.track_count)} tracks across ${fmtNum(musicBeeSnapshot.artist_count)} artists are available for discovery.`
        : '',
      tracks: 'Library tracks',
      artists: 'Library artists',
      albums: 'Albums',
      aggregatePlays: 'MusicBee Play Count',
      playedTracks: 'Tracks with a play count',
      ratedTracks: 'Rated tracks',
      latest: 'Latest recorded play',
      noLatest: 'No last-play date in the XML',
      notAvailable: 'Not included in this XML',
      boundary: 'These are MusicBee library counters—not timestamped listening events. They are never added to Spotify, Last.fm, sessions or the source chart above.',
      simpleBoundary: 'MusicBee stays in its own library view, so Nova does not count the same listening activity twice.',
      technical: 'Technical limits',
      limitations: {
        aggregate_counts_not_timeline: 'Aggregate Play Count cannot reconstruct every historical listening timestamp.',
        separate_source_totals: 'MusicBee counters remain separate from timestamped Spotify, Last.fm and other service totals.',
        paths_and_ids_discarded: 'File locations, persistent IDs and library identifiers were discarded during import.',
      },
    },
    es: {
      eyebrow: 'Foto separada de biblioteca local',
      title: 'Tu biblioteca MusicBee está conectada',
      body: musicBeeSnapshot
        ? `${fmtNum(musicBeeSnapshot.track_count)} canciones de ${fmtNum(musicBeeSnapshot.artist_count)} artistas están disponibles para descubrir.`
        : '',
      tracks: 'Canciones en biblioteca',
      artists: 'Artistas en biblioteca',
      albums: 'Álbumes',
      aggregatePlays: 'Play Count de MusicBee',
      playedTracks: 'Canciones con reproducciones',
      ratedTracks: 'Canciones valoradas',
      latest: 'Última reproducción registrada',
      noLatest: 'El XML no incluye una última fecha',
      notAvailable: 'No está incluido en este XML',
      boundary: 'Son contadores de la biblioteca MusicBee, no eventos con timestamp. Nunca se suman a Spotify, Last.fm, sesiones ni al gráfico de fuentes de arriba.',
      simpleBoundary: 'MusicBee queda en su propia vista de biblioteca para que Nova no cuente dos veces la misma actividad musical.',
      technical: 'Límites técnicos',
      limitations: {
        aggregate_counts_not_timeline: 'El Play Count agregado no puede reconstruir cada timestamp histórico de escucha.',
        separate_source_totals: 'Los contadores de MusicBee quedan separados de los totales con timestamp de Spotify, Last.fm y otros servicios.',
        paths_and_ids_discarded: 'Las rutas de archivos, IDs persistentes e identificadores de biblioteca se descartaron al importar.',
      },
    },
    he: {
      eyebrow: 'תמונת מצב נפרדת של הספרייה המקומית',
      title: 'ספריית MusicBee שלך מחוברת',
      body: musicBeeSnapshot
        ? `${fmtNum(musicBeeSnapshot.track_count)} שירים של ${fmtNum(musicBeeSnapshot.artist_count)} אמנים זמינים לגילוי.`
        : '',
      tracks: 'שירים בספרייה',
      artists: 'אמנים בספרייה',
      albums: 'אלבומים',
      aggregatePlays: 'מונה ההשמעות של MusicBee',
      playedTracks: 'שירים עם מונה השמעות',
      ratedTracks: 'שירים שקיבלו דירוג',
      latest: 'ההשמעה האחרונה שנרשמה',
      noLatest: 'אין ב-XML תאריך השמעה אחרון',
      notAvailable: 'לא נכלל בקובץ ה-XML הזה',
      boundary: 'אלה מונים של ספריית MusicBee, לא אירועי האזנה עם חותמת זמן. הם לעולם אינם מתווספים ל-Spotify, ל-Last.fm, לסשנים או לתרשים המקורות למעלה.',
      simpleBoundary: 'MusicBee נשאר בתצוגת ספרייה נפרדת, כדי ש-Nova לא תספור את אותה פעילות מוזיקלית פעמיים.',
      technical: 'מגבלות טכניות',
      limitations: {
        aggregate_counts_not_timeline: 'מונה השמעות מצטבר אינו יכול לשחזר כל חותמת זמן היסטורית של האזנה.',
        separate_source_totals: 'מוני MusicBee נשארים נפרדים מסיכומי Spotify, Last.fm ושירותים אחרים המבוססים על חותמות זמן.',
        paths_and_ids_discarded: 'נתיבי קבצים, מזהים קבועים ומזהי ספרייה הוסרו בזמן הייבוא.',
      },
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
  const available = (plays: number, value: string) => plays ? value : copy.unavailable;
  const capabilityRows = [
    {
      metric: copy.timestamp,
      lastfm: available(source.lastfm_plays, copy.direct),
      spotify: available(source.spotify_plays, copy.direct),
      youtube: available(source.youtube_plays, copy.direct),
      apple_music: available(source.apple_music_plays, copy.direct),
      listenbrainz: available(source.listenbrainz_plays, copy.direct),
    },
    {
      metric: copy.album,
      lastfm: available(source.lastfm_plays, copy.direct),
      spotify: available(source.spotify_plays, copy.direct),
      youtube: available(source.youtube_plays, copy.unavailable),
      apple_music: available(source.apple_music_plays, copy.conditional),
      listenbrainz: available(source.listenbrainz_plays, copy.conditional),
    },
    {
      metric: copy.skips,
      lastfm: copy.unavailable,
      spotify: available(source.spotify_plays, copy.conditional),
      youtube: copy.unavailable,
      apple_music: copy.unavailable,
      listenbrainz: copy.unavailable,
    },
    {
      metric: copy.device,
      lastfm: copy.unavailable,
      spotify: available(source.spotify_plays, copy.conditional),
      youtube: copy.unavailable,
      apple_music: copy.unavailable,
      listenbrainz: copy.unavailable,
    },
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

      <section
        data-testid="source-ecosystem"
        className="glass-panel rounded-3xl border border-white/10 p-5 md:p-6"
      >
        <div className="mb-5">
          <h3 className="type-section type-strong">
            {isDeepDive ? copy.ecosystemTitle : copy.friendlyEcosystemTitle}
          </h3>
          <p className="type-caption type-muted mt-1 max-w-4xl">
            {isDeepDive ? copy.ecosystemSubtitle : copy.friendlyEcosystemSubtitle}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {sourceProviders.map(provider => {
            const share = sourceTelemetry.segments.find(segment => segment.id === provider.id)?.sharePct ?? 0;
            const present = provider.plays > 0;
            return (
              <article
                key={provider.id}
                data-testid={`source-provider-${provider.id}`}
                className="min-w-0 rounded-2xl border bg-black/15 p-4"
                style={{ borderColor: `${provider.color}${present ? '45' : '20'}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border bg-black/20" style={{ borderColor: `${provider.color}40` }}>
                    <BrandIcon name={provider.brand} size={19} />
                  </span>
                  <span className="text-[9px] font-mono font-black uppercase tracking-wider" style={{ color: present ? provider.color : '#6b7280' }}>
                    {present ? copy.imported : copy.notImported}
                  </span>
                </div>
                <h4 className="mt-3 truncate text-sm font-black text-white">{provider.label}</h4>
                <p className="mt-1 font-mono text-xl font-black" style={{ color: present ? provider.color : '#6b7280' }}>
                  {present ? fmtNum(provider.plays) : '—'}
                </p>
                {isDeepDive ? (
                  <>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5" aria-hidden="true">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${share}%`, backgroundColor: provider.color }}
                      />
                    </div>
                    <p className="mt-2 text-[10px] font-mono text-gray-500">
                      {`${share.toLocaleString(locale, { maximumFractionDigits: 1 })}% ${copy.rawShare}`}
                    </p>
                  </>
                ) : null}
              </article>
            );
          })}
        </div>
        <p
          data-testid="source-friendly-summary"
          className="mt-4 rounded-2xl border border-white/8 bg-white/[0.035] p-4 text-sm leading-relaxed text-gray-300"
        >
          {copy.friendlyReconciliationSummary}
        </p>
      </section>

      {musicBeeSnapshot ? (
        <section
          data-testid="musicbee-library-layer"
          className="glass-panel rounded-3xl border border-[#f2a900]/25 p-5 md:p-6"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-[10px] font-mono font-black uppercase tracking-[0.18em] text-[#f2a900]">
                <BrandIcon name="musicbee" size={17} />
                {musicBeeCopy.eyebrow}
              </p>
              <h3 className="type-section type-strong mt-2">{musicBeeCopy.title}</h3>
              <p className="type-body type-muted mt-2">{musicBeeCopy.body}</p>
            </div>
            <div className="grid w-full grid-cols-3 gap-2 lg:max-w-xl">
              {[
                [musicBeeCopy.tracks, musicBeeSnapshot.track_count],
                [musicBeeCopy.artists, musicBeeSnapshot.artist_count],
                [musicBeeCopy.albums, musicBeeSnapshot.album_count],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border border-white/8 bg-black/15 p-3">
                  <p className="font-mono text-lg font-black text-[#f2a900]">{fmtNum(Number(value))}</p>
                  <p className="mt-1 text-[10px] leading-tight text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 rounded-2xl border border-[#f2a900]/15 bg-[#f2a900]/5 p-4 text-sm leading-relaxed text-gray-300">
            {isDeepDive ? musicBeeCopy.boundary : musicBeeCopy.simpleBoundary}
          </p>
          {isDeepDive ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <dl className="grid grid-cols-2 gap-2">
                {[
                  [
                    musicBeeCopy.aggregatePlays,
                    musicBeeSnapshot.capabilities.aggregate_play_counts
                      ? fmtNum(musicBeeSnapshot.total_play_count)
                      : musicBeeCopy.notAvailable,
                  ],
                  [
                    musicBeeCopy.playedTracks,
                    musicBeeSnapshot.capabilities.aggregate_play_counts
                      ? fmtNum(musicBeeSnapshot.played_track_count)
                      : musicBeeCopy.notAvailable,
                  ],
                  [musicBeeCopy.ratedTracks, fmtNum(musicBeeSnapshot.rated_track_count)],
                  [
                    musicBeeCopy.latest,
                    musicBeeSnapshot.capabilities.last_played
                      ? musicBeeSnapshot.latest_played_at
                        ? new Date(musicBeeSnapshot.latest_played_at).toLocaleDateString(locale)
                        : musicBeeCopy.noLatest
                      : musicBeeCopy.notAvailable,
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/8 bg-black/10 p-3">
                    <dt className="text-[10px] text-gray-500">{label}</dt>
                    <dd className="mt-1 font-mono text-sm font-bold text-gray-200">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-300">
                  {musicBeeCopy.technical}
                </h4>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-gray-400">
                  {musicBeeSnapshot.limitations.map(limitation => (
                    <li key={limitation} className="flex gap-2">
                      <span aria-hidden="true" className="text-[#f2a900]">•</span>
                      <span>{musicBeeCopy.limitations[limitation]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Hero comparison banner */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-cyan-500/20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-[#e8334a]/5 to-transparent" />
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#1DB954]/5 to-transparent" />
        </div>

        <div className="relative z-10 mb-6">
          <h3 className="type-section type-strong">
            {isDeepDive ? copy.pairLensTitle : copy.friendlyPairLensTitle}
          </h3>
          <p className="type-caption type-muted mt-1 max-w-4xl">
            {isDeepDive ? copy.pairLensSubtitle : copy.friendlyPairLensSubtitle}
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Last.fm side */}
          <div className="text-center md:text-left space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#e8334a]/10 border border-[#e8334a]/30">
              <BrandIcon name="lastfm" size={15} />
              <span className="text-[#e8334a] font-mono text-xs font-bold">LAST.FM</span>
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
              <BrandIcon name="spotify" size={15} />
              <span className="text-[#1DB954] font-mono text-xs font-bold">SPOTIFY</span>
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

      {isDeepDive ? (
        <>
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
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-white/5 font-mono uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-4 py-3">{copy.metric}</th>
                  {sourceProviders.map(provider => (
                    <th key={provider.id} className="px-4 py-3" style={{ color: provider.color }}>
                      <span className="inline-flex items-center gap-1.5">
                        <BrandIcon name={provider.brand} size={13} />
                        {provider.label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {capabilityRows.map((row) => (
                  <tr key={row.metric} className="border-t border-white/5">
                    <th className="px-4 py-3 font-medium text-gray-300">{row.metric}</th>
                    {sourceProviders.map(provider => (
                      <td key={provider.id} className="px-4 py-3 font-mono text-gray-400">
                        {row[provider.id]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-gray-500">
            <GitMerge className="mt-0.5 h-4 w-4 shrink-0 text-cyberCyan" />
            {pickLanguage(lang, {
              en: 'This is a parser/format guide, not a field-presence receipt or a platform quality ranking.',
              es: 'Es una guía del parser y del formato, no un recibo de campos presentes ni un ranking de calidad entre plataformas.',
              he: 'זהו מדריך לפורמט ולמנתח, לא אישור אילו שדות היו בקובץ ולא דירוג איכות של הפלטפורמות.',
            })}
          </p>
        </div>
          </div>
        </>
      ) : null}

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
