import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, Loader2, Trash2, Upload, Users, Heart, Activity, Sparkles,
} from 'lucide-react';
import type { ArtistGenreCatalogEntry, MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import { parseMusicSources, ParseError } from '../utils/parser';
import { parseExport } from '../utils/datasetStorage';
import { expandZipArchives } from '../utils/zipArchive';
import { compareArtistOverlap, compareCoreMetrics, compareMoodProfiles, type CoreMetricKey } from '../utils/museumCompare';
import ArtistAvatar from './ArtistAvatar';
import MoodBadge from './MoodBadge';
import { directionFor, localeFor, pickLanguage } from '../utils/i18n';

interface MuseumComparatorProps {
  data: MusicDnaData;
  isPersonalArchive?: boolean;
  loadFlagshipCatalog?: () => Promise<ArtistGenreCatalogEntry[]>;
  loadFlagshipDataset?: () => Promise<MusicDnaData>;
  primaryLabel: string;
}

const METRIC_HERO_KEYS: Record<CoreMetricKey, 'scrobbles' | 'artists' | 'tracks' | 'hours' | 'days'> = {
  total_plays: 'scrobbles',
  unique_artists: 'artists',
  unique_tracks: 'tracks',
  listening_hours: 'hours',
  active_days: 'days',
};
const bidiIsolate = (value: string) => `\u2068${value}\u2069`;

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('read-error'));
    reader.readAsText(file);
  });
}

export default function MuseumComparator({
  data,
  isPersonalArchive = false,
  loadFlagshipCatalog,
  loadFlagshipDataset,
  primaryLabel,
}: MuseumComparatorProps) {
  const { t, tc, lang } = useApp();
  const locale = localeFor(lang);
  const fmtNum = (n: number) => Math.round(n).toLocaleString(locale);
  // Keep this room-specific copy with the lazy-loaded comparator instead of
  // charging every first visit for text that is only needed in this room.
  const copy = useMemo(() => pickLanguage(lang, {
    en: {
      intro: 'Upload a second listening history (yours or someone else\'s) and put both museums face to face: artist-name overlap, dominant moods and side-by-side metrics. Everything compares locally; the second file never replaces your active museum.',
      primaryMuseumLabel: 'Museum A · Your active museum',
      secondaryMuseumLabel: 'Museum B',
      secondaryPlaceholderTitle: 'Upload a second museum',
      secondaryPlaceholderBody: 'Drop a Nova backup, a Last.fm/Apple Music CSV, or a Spotify/YouTube/ListenBrainz JSON to compare against your active museum.',
      browseButton: 'Browse files',
      clearSecondaryButton: 'Remove museum B',
      processing: 'Processing the second museum...',
      topArtistLabel: 'Anchor artist',
      totalPlaysLabel: 'Total plays',
      overlapTitle: 'Artist-name overlap',
      overlapBody: (pct: number, shared: number) => `${pct}% overlap: ${shared} normalized keys appear in both museums.`,
      sharedArtistsLabel: 'Shared artist names',
      onlyInA: (label: string, count: number) => `Only in ${label}: ${count} names`,
      onlyInB: (label: string, count: number) => `Only in ${label}: ${count} names`,
      noOverlapArtists: 'No artist name appears in both museums yet.',
      metricsTitle: 'Side-by-Side Metrics',
      metricsHint: 'The percentage shows how much Museum B changes relative to Museum A for each metric.',
      moodTitle: 'Moods Face to Face',
      moodSameNarrative: (mood: string) => `Both museums share the same dominant emotional climate: ${mood}.`,
      moodDiffNarrative: (moodA: string, moodB: string) => `The museums diverge: A vibrates in ${moodA}, while B vibrates in ${moodB}.`,
    },
    es: {
      intro: 'Sube un segundo historial de escucha (tuyo o de otra persona) y enfrenta ambos museos: coincidencia de nombres de artista, moods dominantes y métricas lado a lado. Todo se compara localmente; el segundo archivo nunca reemplaza tu museo activo.',
      primaryMuseumLabel: 'Museo A · Tu museo activo',
      secondaryMuseumLabel: 'Museo B',
      secondaryPlaceholderTitle: 'Sube un segundo museo',
      secondaryPlaceholderBody: 'Arrastra un backup de Nova, un CSV de Last.fm/Apple Music o un JSON de Spotify/YouTube/ListenBrainz para comparar contra tu museo activo.',
      browseButton: 'Examinar archivos',
      clearSecondaryButton: 'Quitar museo B',
      processing: 'Procesando el segundo museo...',
      topArtistLabel: 'Artista ancla',
      totalPlaysLabel: 'Plays totales',
      overlapTitle: 'Coincidencia de nombres de artista',
      overlapBody: (pct: number, shared: number) => `${pct}% de coincidencia: ${shared} claves normalizadas aparecen en ambos museos.`,
      sharedArtistsLabel: 'Nombres compartidos',
      onlyInA: (label: string, count: number) => `Solo en ${label}: ${count} nombres`,
      onlyInB: (label: string, count: number) => `Solo en ${label}: ${count} nombres`,
      noOverlapArtists: 'Ningún nombre de artista se repite entre ambos museos todavía.',
      metricsTitle: 'Métricas Lado a Lado',
      metricsHint: 'El porcentaje muestra cuánto cambia el Museo B respecto al Museo A en cada métrica.',
      moodTitle: 'Moods Enfrentados',
      moodSameNarrative: (mood: string) => `Ambos museos comparten el mismo clima emocional dominante: ${mood}.`,
      moodDiffNarrative: (moodA: string, moodB: string) => `Los museos divergen: el A vibra en ${moodA}, mientras el B vibra en ${moodB}.`,
    },
    he: {
      intro: 'העלה היסטוריית האזנה שנייה — שלך או של אדם אחר — והשווה בין שני המוזיאונים: חפיפת שמות אמנים, מצבי רוח דומיננטיים ומדדים זה לצד זה. ההשוואה כולה מקומית; הקובץ השני לעולם אינו מחליף את המוזיאון הפעיל שלך.',
      primaryMuseumLabel: 'מוזיאון א׳ · המוזיאון הפעיל שלך',
      secondaryMuseumLabel: 'מוזיאון ב׳',
      secondaryPlaceholderTitle: 'העלה מוזיאון שני',
      secondaryPlaceholderBody: 'שחרר גיבוי של Nova, קובץ CSV של Last.fm או Apple Music, או קובץ JSON של Spotify, YouTube או ListenBrainz כדי להשוות מול המוזיאון הפעיל שלך.',
      browseButton: 'עיין בקבצים',
      clearSecondaryButton: 'הסר את מוזיאון ב׳',
      processing: 'מעבד את המוזיאון השני...',
      topArtistLabel: 'אמן עוגן',
      totalPlaysLabel: 'סך ההשמעות',
      overlapTitle: 'חפיפת שמות אמנים',
      overlapBody: (pct: number, shared: number) => `${pct}% חפיפה: ${shared} מפתחות מנורמלים מופיעים בשני המוזיאונים.`,
      sharedArtistsLabel: 'שמות אמנים משותפים',
      onlyInA: (label: string, count: number) => `רק אצל ${label}: ${count} שמות`,
      onlyInB: (label: string, count: number) => `רק אצל ${label}: ${count} שמות`,
      noOverlapArtists: 'עדיין אין שם אמן שמופיע בשני המוזיאונים.',
      metricsTitle: 'מדדים זה לצד זה',
      metricsHint: 'האחוז מראה עד כמה מוזיאון ב׳ שונה ממוזיאון א׳ בכל מדד.',
      moodTitle: 'השוואת מצבי רוח',
      moodSameNarrative: (mood: string) => `שני המוזיאונים חולקים את אותו אקלים רגשי דומיננטי: ${mood}.`,
      moodDiffNarrative: (moodA: string, moodB: string) => `המוזיאונים מתפצלים: האקלים של מוזיאון א׳ הוא ${moodA}, ואילו האקלים של מוזיאון ב׳ הוא ${moodB}.`,
    },
  }), [lang]);
  const visitorCopy = useMemo(() => pickLanguage(lang, {
    en: {
      flagshipLabel: "Kevin's public flagship",
      loadingFlagship: "Opening Kevin's public museum for comparison…",
      loadFlagship: "Compare with Kevin's public museum",
      flagshipReady: 'Public reference',
      flagshipError: "Kevin's public museum could not be loaded. Your private archive is unchanged.",
      fullScope: (artistsA: string, artistsB: string) =>
        `Complete catalog coverage · ${artistsA} vs ${artistsB} normalized artist-name keys`,
      partialScope: (comparedA: string, archiveA: string, comparedB: string, archiveB: string) =>
        `Visible scope only · ${comparedA}/${archiveA} vs ${comparedB}/${archiveB} artist-name entries. The percentage does not describe the complete archives.`,
    },
    es: {
      flagshipLabel: 'Museo público de Kevin',
      loadingFlagship: 'Abriendo el museo público de Kevin para comparar…',
      loadFlagship: 'Comparar con el museo público de Kevin',
      flagshipReady: 'Referencia pública',
      flagshipError: 'No se pudo cargar el museo público de Kevin. Tu archivo privado no cambió.',
      fullScope: (artistsA: string, artistsB: string) =>
        `Cobertura completa · ${artistsA} vs ${artistsB} claves normalizadas de nombres de artista`,
      partialScope: (comparedA: string, archiveA: string, comparedB: string, archiveB: string) =>
        `Alcance visible solamente · ${comparedA}/${archiveA} vs ${comparedB}/${archiveB} entradas de nombres de artista. El porcentaje no describe los archivos completos.`,
    },
    he: {
      flagshipLabel: 'המוזיאון הציבורי של Kevin',
      loadingFlagship: 'פותחים את המוזיאון הציבורי של Kevin לצורך השוואה…',
      loadFlagship: 'השוואה למוזיאון הציבורי של Kevin',
      flagshipReady: 'נקודת ייחוס ציבורית',
      flagshipError: 'לא ניתן היה לטעון את המוזיאון הציבורי של Kevin. הארכיון הפרטי שלך לא השתנה.',
      fullScope: (artistsA: string, artistsB: string) =>
        `כיסוי קטלוג מלא · ${artistsA} מול ${artistsB} מפתחות מנורמלים של שמות אמנים`,
      partialScope: (comparedA: string, archiveA: string, comparedB: string, archiveB: string) =>
        `טווח גלוי בלבד · ${comparedA}/${archiveA} מול ${comparedB}/${archiveB} רשומות שמות אמנים. האחוז אינו מתאר את הארכיונים המלאים.`,
    },
  }), [lang]);

  const [secondary, setSecondary] = useState<MusicDnaData | null>(null);
  const [secondaryLabel, setSecondaryLabel] = useState('');
  const [secondaryOrigin, setSecondaryOrigin] = useState<'flagship' | 'upload' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [primaryFlagshipCatalog, setPrimaryFlagshipCatalog] = useState<ArtistGenreCatalogEntry[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const operationIdRef = useRef(0);
  const autoLoadedArchiveRef = useRef<MusicDnaData | null>(null);

  const primaryComparisonData = useMemo(
    () => primaryFlagshipCatalog
      ? { ...data, artist_genre_catalog: primaryFlagshipCatalog }
      : data,
    [data, primaryFlagshipCatalog],
  );
  const overlap = useMemo(
    () => (secondary ? compareArtistOverlap(primaryComparisonData, secondary) : null),
    [primaryComparisonData, secondary],
  );
  const metrics = useMemo(() => (secondary ? compareCoreMetrics(data, secondary) : null), [data, secondary]);
  const moods = useMemo(() => (secondary ? compareMoodProfiles(data, secondary) : null), [data, secondary]);

  const loadFlagshipComparison = useCallback(async () => {
    if (!loadFlagshipDataset) return;
    const operationId = ++operationIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const flagship = await loadFlagshipDataset();
      let catalog: ArtistGenreCatalogEntry[] | null = null;
      if (loadFlagshipCatalog) {
        try {
          catalog = await loadFlagshipCatalog();
        } catch {
          // The public top-list remains a valid partial comparison if the
          // optional full catalog chunk cannot be loaded.
        }
      }
      if (operationId !== operationIdRef.current) return;
      setSecondary(catalog?.length ? { ...flagship, artist_genre_catalog: catalog } : flagship);
      setSecondaryLabel(visitorCopy.flagshipLabel);
      setSecondaryOrigin('flagship');
    } catch {
      if (operationId !== operationIdRef.current) return;
      setError(visitorCopy.flagshipError);
    } finally {
      if (operationId === operationIdRef.current) setLoading(false);
    }
  }, [
    loadFlagshipCatalog,
    loadFlagshipDataset,
    visitorCopy.flagshipError,
    visitorCopy.flagshipLabel,
  ]);

  useEffect(() => {
    if (
      !isPersonalArchive
      || !loadFlagshipDataset
      || autoLoadedArchiveRef.current === data
    ) return;
    autoLoadedArchiveRef.current = data;
    void loadFlagshipComparison();
  }, [data, isPersonalArchive, loadFlagshipDataset, loadFlagshipComparison]);

  useEffect(() => () => {
      operationIdRef.current += 1;
  }, []);

  useEffect(() => {
    if (isPersonalArchive || !loadFlagshipCatalog) {
      setPrimaryFlagshipCatalog(null);
      return;
    }
    let active = true;
    void loadFlagshipCatalog()
      .then(catalog => {
        if (active) setPrimaryFlagshipCatalog(catalog);
      })
      .catch(() => {
        if (active) setPrimaryFlagshipCatalog(null);
      });
    return () => {
      active = false;
    };
  }, [isPersonalArchive, loadFlagshipCatalog]);

  const processFiles = async (incoming: File[]) => {
    const operationId = ++operationIdRef.current;
    setLoading(true);
    setError(null);
    try {
      // Comparing against a friend's museum has to accept the same Spotify .zip
      // the importer does, otherwise the feature is only usable by whoever
      // already unzipped their export by hand.
      const { files } = await expandZipArchives(incoming);
      const csvFiles = files.filter(f => f.name.toLowerCase().endsWith('.csv'));
      const jsonFiles = files.filter(f => f.name.toLowerCase().endsWith('.json'));
      const htmlFiles = files.filter(f => /\.html?$/i.test(f.name));

      if (!csvFiles.length && !jsonFiles.length && !htmlFiles.length) {
        throw new Error(t.uploader.noFilesError);
      }

      const [csvTexts, jsonTexts, htmlTexts] = await Promise.all([
        Promise.all(csvFiles.map(readFileAsText)),
        Promise.all(jsonFiles.map(readFileAsText)),
        Promise.all(htmlFiles.map(readFileAsText)),
      ]);

      for (const text of jsonTexts) {
        if (!text.slice(0, 300).includes('"nova_music_export"')) continue;
        const exported = parseExport(JSON.parse(text));
        if (exported) {
          if (operationId !== operationIdRef.current) return;
          setSecondary(exported.data);
          setSecondaryLabel(exported.source_label || copy.secondaryMuseumLabel);
          setSecondaryOrigin('upload');
          setLoading(false);
          return;
        }
      }

      const parsed = parseMusicSources({ csvTexts, spotifyJsonTexts: jsonTexts, youtubeHtmlTexts: htmlTexts });
      const source = parsed.source_summary;
      const label = [
        source?.lastfm_plays ? `${source.lastfm_plays}× Last.fm` : null,
        source?.apple_music_plays ? `${source.apple_music_plays}× Apple Music` : null,
        source?.spotify_plays ? `${source.spotify_plays}× Spotify` : null,
        source?.youtube_plays ? `${source.youtube_plays}× YouTube` : null,
        source?.listenbrainz_plays ? `${source.listenbrainz_plays}× ListenBrainz` : null,
      ].filter(Boolean).join(' + ') || copy.secondaryMuseumLabel;

      if (operationId !== operationIdRef.current) return;
      setSecondary(parsed);
      setSecondaryLabel(label);
      setSecondaryOrigin('upload');
    } catch (err: unknown) {
      if (operationId !== operationIdRef.current) return;
      if (err instanceof ParseError) {
        setError(err.code === 'INVALID_JSON' ? t.uploader.invalidJsonError : t.uploader.noValidRowsError);
      } else {
        setError(err instanceof Error && err.message ? err.message : t.uploader.processingError);
      }
    } finally {
      if (operationId === operationIdRef.current) setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) await processFiles(Array.from(e.dataTransfer.files));
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) await processFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const clearSecondary = () => {
    operationIdRef.current += 1;
    setSecondary(null);
    setSecondaryLabel('');
    setSecondaryOrigin(null);
    setError(null);
    setLoading(false);
  };

  const sourceTypeLabel = (museum: MusicDnaData) =>
    t.dataQuality.sourceTypes[museum.source_summary?.source_type ?? 'unknown'];

  return (
    <div className="space-y-8 animate-fade-in" dir={directionFor(lang)}>
      <p className="max-w-3xl text-sm leading-relaxed text-gray-400">{copy.intro}</p>

      {isPersonalArchive && !secondary && !loading && loadFlagshipDataset && (
        <button
          type="button"
          onClick={() => void loadFlagshipComparison()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs font-black transition hover:-translate-y-0.5"
          style={{ borderColor: `${tc.c3}45`, color: tc.c3, backgroundColor: `${tc.c3}10` }}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {visitorCopy.loadFlagship}
        </button>
      )}

      {/* Museum header cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="glass-panel rounded-3xl border p-5" style={{ borderColor: `${tc.c1}35` }}>
          <p className="text-[10px] font-mono font-black uppercase tracking-[0.22em]" style={{ color: tc.c1 }}>
            {copy.primaryMuseumLabel}
          </p>
          <h3 className="mt-1 truncate text-lg font-black text-white"><bdi dir="auto">{primaryLabel}</bdi></h3>
          <p className="mt-1 text-xs font-mono text-gray-500">{sourceTypeLabel(data)}</p>
          <div className="mt-4 flex items-center gap-3">
            <ArtistAvatar name={data.top_artists[0]?.name ?? '?'} size={40} tooltip={false} />
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">{copy.topArtistLabel}</p>
              <p className="truncate text-sm font-bold text-white"><bdi dir="auto">{data.top_artists[0]?.name ?? '—'}</bdi></p>
            </div>
          </div>
          <p className="mt-3 text-2xl font-black font-mono" style={{ color: tc.c1 }}>
            {fmtNum(data.core_metrics.total_plays)}
            <span className="ms-2 text-xs font-normal text-gray-500">{copy.totalPlaysLabel}</span>
          </p>
        </article>

        {secondary ? (
          <article className="glass-panel rounded-3xl border p-5" style={{ borderColor: `${tc.c2}35` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-mono font-black uppercase tracking-[0.22em]" style={{ color: tc.c2 }}>
                  {copy.secondaryMuseumLabel}
                </p>
                <h3 className="mt-1 truncate text-lg font-black text-white"><bdi dir="auto">{secondaryLabel}</bdi></h3>
                <p className="mt-1 text-xs font-mono text-gray-500">{sourceTypeLabel(secondary)}</p>
                {secondaryOrigin === 'flagship' && (
                  <span className="mt-2 inline-flex rounded-full border border-violet-400/25 bg-violet-400/10 px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-wider text-violet-200">
                    {visitorCopy.flagshipReady}
                  </span>
                )}
              </div>
              <button
                onClick={clearSecondary}
                aria-label={copy.clearSecondaryButton}
                title={copy.clearSecondaryButton}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-950/15 text-red-300 transition-transform hover:scale-110"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <ArtistAvatar name={secondary.top_artists[0]?.name ?? '?'} size={40} tooltip={false} />
              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">{copy.topArtistLabel}</p>
                <p className="truncate text-sm font-bold text-white"><bdi dir="auto">{secondary.top_artists[0]?.name ?? '—'}</bdi></p>
              </div>
            </div>
            <p className="mt-3 text-2xl font-black font-mono" style={{ color: tc.c2 }}>
              {fmtNum(secondary.core_metrics.total_plays)}
              <span className="ms-2 text-xs font-normal text-gray-500">{copy.totalPlaysLabel}</span>
            </p>
          </article>
        ) : (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label={copy.secondaryPlaceholderTitle}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            className={`glass-panel flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
              dragActive ? 'border-cyberCyan bg-cyan-950/20 scale-[1.01]' : 'border-white/15 hover:border-white/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.html,.htm,.zip"
              onChange={handleChange}
              className="hidden"
            />
            <div className="rounded-2xl border p-3" style={{ borderColor: `${tc.c2}35`, backgroundColor: `${tc.c2}12` }}>
              <Upload className="h-6 w-6" style={{ color: tc.c2 }} />
            </div>
            <h3 className="text-sm font-black text-white">{copy.secondaryPlaceholderTitle}</h3>
            <p className="max-w-xs text-xs leading-relaxed text-gray-400">{copy.secondaryPlaceholderBody}</p>
            <span className="rounded-full border px-4 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider"
              style={{ color: tc.c2, borderColor: `${tc.c2}45`, backgroundColor: `${tc.c2}12` }}>
              {copy.browseButton}
            </span>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-cyan-500/20 p-4 glass-panel">
          <Loader2 className="h-5 w-5 animate-spin text-cyberCyan" />
          <span className="font-mono text-sm text-gray-300">
            {isPersonalArchive && !secondary ? visitorCopy.loadingFlagship : copy.processing}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-950/20 p-4 text-red-300 animate-fade-in">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {secondary && overlap && metrics && moods && (
        <>
          {/* Artist overlap */}
          <section className="glass-panel space-y-4 rounded-3xl border border-white/10 p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" style={{ color: tc.c3 }} />
              <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">{copy.overlapTitle}</h3>
            </div>
            <p
              className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 font-mono text-[10px] font-bold leading-relaxed text-gray-400"
              data-comparison-scope={overlap.scopeA.complete && overlap.scopeB.complete ? 'complete' : 'partial'}
            >
              {overlap.scopeA.complete && overlap.scopeB.complete
                ? visitorCopy.fullScope(
                    fmtNum(overlap.scopeA.comparedArtists),
                    fmtNum(overlap.scopeB.comparedArtists),
                  )
                : visitorCopy.partialScope(
                    fmtNum(overlap.scopeA.comparedArtists),
                    fmtNum(overlap.scopeA.archiveArtists),
                    fmtNum(overlap.scopeB.comparedArtists),
                    fmtNum(overlap.scopeB.archiveArtists),
                  )}
            </p>
            <p className="text-sm text-gray-300">{copy.overlapBody(overlap.overlapPct, overlap.sharedCount)}</p>
            <div className="flex flex-wrap gap-3 text-xs font-mono text-gray-400">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {copy.onlyInA(bidiIsolate(primaryLabel), overlap.onlyA.length)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {copy.onlyInB(bidiIsolate(secondaryLabel), overlap.onlyB.length)}
              </span>
            </div>
            {overlap.shared.length ? (
              <div>
                <p className="mb-2 text-[10px] font-mono font-black uppercase tracking-widest text-gray-500">
                  {copy.sharedArtistsLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {overlap.shared.map(artist => (
                    <span key={artist.name} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] py-1 ps-1 pe-3">
                      <ArtistAvatar name={artist.name} size={24} tooltip={false} />
                      <bdi dir="auto" className="text-xs font-bold text-white">{artist.name}</bdi>
                      <span className="font-mono text-[10px] text-gray-500">
                        {fmtNum(artist.playsA)} / {fmtNum(artist.playsB)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">{copy.noOverlapArtists}</p>
            )}
          </section>

          {/* Mood face-off */}
          <section className="glass-panel space-y-4 rounded-3xl border border-white/10 p-6">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5" style={{ color: tc.c2 }} />
              <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">{copy.moodTitle}</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-gray-500"><bdi dir="auto">{primaryLabel}</bdi></p>
                <MoodBadge moodKey={moods.profileA.dominantMood.key} />
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-gray-500"><bdi dir="auto">{secondaryLabel}</bdi></p>
                <MoodBadge moodKey={moods.profileB.dominantMood.key} />
              </div>
            </div>
            <p className="text-sm text-gray-300">
              {moods.sameDominantMood
                ? copy.moodSameNarrative(moods.profileA.dominantMood.shortLabel[lang])
                : copy.moodDiffNarrative(moods.profileA.dominantMood.shortLabel[lang], moods.profileB.dominantMood.shortLabel[lang])}
            </p>
          </section>

          {/* Metrics side by side */}
          <section className="glass-panel space-y-4 rounded-3xl border border-white/10 p-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" style={{ color: tc.c4 }} />
              <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">{copy.metricsTitle}</h3>
            </div>
            <p className="text-xs text-gray-500">{copy.metricsHint}</p>
            <div className="space-y-3">
              {metrics.map(metric => {
                const total = metric.a + metric.b;
                const pctA = total > 0 ? (metric.a / total) * 100 : 50;
                const diffColor = metric.diffPct === null ? '#6b7280' : metric.diffPct >= 0 ? '#22c55e' : '#ef4444';
                return (
                  <div key={metric.key}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                      <span className="font-mono font-bold uppercase tracking-wider text-gray-400">
                        {t.hero[METRIC_HERO_KEYS[metric.key]]}
                      </span>
                      <span className="font-mono font-black" style={{ color: diffColor }}>
                        {metric.diffPct === null ? '—' : `${metric.diffPct > 0 ? '+' : ''}${metric.diffPct}%`}
                      </span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-white/8">
                      <div className="h-full" style={{ width: `${pctA}%`, backgroundColor: tc.c1 }} />
                      <div className="h-full" style={{ width: `${100 - pctA}%`, backgroundColor: tc.c2 }} />
                    </div>
                    <div className="mt-1 flex justify-between font-mono text-[10px] text-gray-500">
                      <span>{fmtNum(metric.a)}</span>
                      <span>{fmtNum(metric.b)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
