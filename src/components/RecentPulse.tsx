import React, { useCallback, useLayoutEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Crown, Fingerprint, Sparkles, Repeat, History, Zap, Music, RefreshCw } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import { useExperienceDepth } from '../context/ExperienceContext';
import ArtistAvatar from './ArtistAvatar';
import BrandIcon from './BrandIcon';
import MethodologyPanel from './MethodologyPanel';
import SectionNarrative from './SectionNarrative';
import pulseData from '../data/recent_pulse.json';
import { useImageLoadTimeout } from '../hooks/useImageLoadTimeout';
import { localeFor, pickLanguage } from '../utils/i18n';
import { optimizeRemoteImageUrl } from '../utils/remoteImage';
import {
  resolveWeeklyPulseSummary,
  type PulseSnapshot,
  type WeeklyPulseLimitation,
  type WeeklyPulseSummary,
} from '../utils/recentPulseSnapshot';

interface RecentPulseProps {
  data: MusicDnaData;
  isPersonalArchive?: boolean;
  snapshot?: PulseSnapshot;
}

const flagshipPulse = pulseData as PulseSnapshot;

const REFRESH_PULSE_COPY = {
  en: {
    snapshot: 'Snapshot saved',
    refresh: 'Refresh Pulse',
    boundary: 'No live sync is active. Import a newer listening export to refresh this Pulse.',
  },
  es: {
    snapshot: 'Instantánea guardada',
    refresh: 'Actualizar Pulso',
    boundary: 'No hay sincronización en vivo. Importa un export de escucha más reciente para actualizar este Pulso.',
  },
  he: {
    snapshot: 'תמונת מצב שמורה',
    refresh: 'רענון הדופק',
    boundary: 'אין סנכרון חי. כדי לרענן את הדופק, יש לייבא ייצוא האזנה חדש יותר.',
  },
} as const;

const VISITOR_PULSE_COPY = {
  en: {
    title: 'Current snapshot unavailable for this archive',
    body: 'Current Pulse is a dated local Spotify snapshot that belongs only to the flagship exhibition. Nova never relabels it as a visitor’s present listening.',
    next: 'Import a compatible recent listening export when you want this archive to receive its own current-vs-history comparison.',
  },
  es: {
    title: 'La instantánea actual no está disponible para este archivo',
    body: 'Pulso Actual es una instantánea local fechada de Spotify que pertenece únicamente a la exposición insignia. Nova nunca la presenta como la escucha presente de un visitante.',
    next: 'Importa un export reciente compatible cuando quieras crear una comparación propia entre presente e historial.',
  },
  he: {
    title: 'תמונת המצב הנוכחית אינה זמינה לארכיון הזה',
    body: 'הדופק הנוכחי הוא תמונת מצב מקומית ומתוארכת של Spotify ששייכת רק לתערוכת הדגל. Nova לעולם לא מציגה אותה כהאזנה הנוכחית של מבקר.',
    next: 'כדי ליצור השוואה אישית בין ההווה להיסטוריה, יש לייבא ייצוא האזנה עדכני ותואם.',
  },
} as const;

const WEEKLY_PULSE_COPY = {
  en: {
    eyebrow: 'Saved weekly view',
    title: 'Your week on Last.fm',
    dateRange: (from: string, to: string) => `${from} to ${to}`,
    scrobbles: 'Listens',
    artists: 'Artists',
    tracks: 'Tracks',
    albums: 'Albums',
    unavailable: 'Not available',
    fingerprint: 'Week fingerprint',
    fingerprintBody: (artistCount: string, listenCount: string) =>
      `${artistCount} artists across ${listenCount} listens in this saved week.`,
    leadArtist: 'Leading artist',
    leadTrack: 'Leading track',
    topArtists: 'Top artists',
    topTracks: 'Top tracks',
    noRanking: 'No ranked names were included in this snapshot.',
    guidedNote: 'Read this as one recent chapter. It can show what was active that week, but it does not replace your complete listening history.',
    simpleBoundary: 'This is a saved weekly summary, not a live account connection or a complete history.',
    technicalTitle: 'Source and limitations',
    sourceLabel: 'Source contract',
    sourceApi: 'Saved official Last.fm API summary',
    sourceExport: 'User-provided Last.fm export',
    capturedLabel: 'Captured',
    periodLabel: 'Covered period',
    countsLabel: 'Count semantics',
    countsValue: 'Direct values saved in the weekly snapshot; no totals are inferred from the rankings.',
    limitationsLabel: 'Known limitations',
    limitationCopy: {
      point_in_time_capture: 'The values can change after the capture date.',
      official_api_snapshot: 'This is a saved official API summary, not a live connection or raw listening events.',
      not_complete_history: 'This week is not evidence of the complete account history.',
      album_count_unavailable: 'The source did not provide a dependable album total.',
      rankings_may_change: 'Rankings may differ when Last.fm refreshes its reporting window.',
    },
  },
  es: {
    eyebrow: 'Vista semanal guardada',
    title: 'Tu semana en Last.fm',
    dateRange: (from: string, to: string) => `Del ${from} al ${to}`,
    scrobbles: 'Escuchas',
    artists: 'Artistas',
    tracks: 'Canciones',
    albums: 'Álbumes',
    unavailable: 'No disponible',
    fingerprint: 'Huella de la semana',
    fingerprintBody: (artistCount: string, listenCount: string) =>
      `${artistCount} artistas en ${listenCount} escuchas durante esta semana guardada.`,
    leadArtist: 'Artista principal',
    leadTrack: 'Canción principal',
    topArtists: 'Artistas principales',
    topTracks: 'Canciones principales',
    noRanking: 'Esta instantánea no incluyó nombres clasificados.',
    guidedNote: 'Léelo como un capítulo reciente. Puede mostrar qué estuvo activo esa semana, pero no sustituye tu historial completo.',
    simpleBoundary: 'Es un resumen semanal guardado, no una conexión viva con la cuenta ni un historial completo.',
    technicalTitle: 'Fuente y limitaciones',
    sourceLabel: 'Contrato de fuente',
    sourceApi: 'Resumen guardado de la API oficial de Last.fm',
    sourceExport: 'Export de Last.fm aportado por el usuario',
    capturedLabel: 'Capturado',
    periodLabel: 'Periodo cubierto',
    countsLabel: 'Significado de los conteos',
    countsValue: 'Valores directos guardados en el resumen semanal; los totales no se infieren desde los rankings.',
    limitationsLabel: 'Limitaciones conocidas',
    limitationCopy: {
      point_in_time_capture: 'Los valores pueden cambiar después de la fecha de captura.',
      official_api_snapshot: 'Es un resumen guardado de la API oficial, no una conexión viva ni eventos de escucha sin procesar.',
      not_complete_history: 'Esta semana no demuestra el historial completo de la cuenta.',
      album_count_unavailable: 'La fuente no proporcionó un total de álbumes confiable.',
      rankings_may_change: 'Los rankings pueden cambiar cuando Last.fm actualiza su periodo de reporte.',
    },
  },
  he: {
    eyebrow: 'תצוגה שבועית שמורה',
    title: 'השבוע שלך ב־Last.fm',
    dateRange: (from: string, to: string) => `${from} עד ${to}`,
    scrobbles: 'האזנות',
    artists: 'אמנים',
    tracks: 'שירים',
    albums: 'אלבומים',
    unavailable: 'לא זמין',
    fingerprint: 'טביעת האצבע של השבוע',
    fingerprintBody: (artistCount: string, listenCount: string) =>
      `${artistCount} אמנים לאורך ${listenCount} האזנות בשבוע השמור הזה.`,
    leadArtist: 'אמן מוביל',
    leadTrack: 'שיר מוביל',
    topArtists: 'אמנים מובילים',
    topTracks: 'שירים מובילים',
    noRanking: 'תמונת המצב לא כללה שמות מדורגים.',
    guidedNote: 'כדאי לקרוא זאת כפרק עדכני אחד. הוא מראה מה היה פעיל באותו שבוע, אך אינו מחליף את היסטוריית ההאזנה המלאה.',
    simpleBoundary: 'זהו סיכום שבועי שמור, לא חיבור חי לחשבון ולא היסטוריה מלאה.',
    technicalTitle: 'מקור ומגבלות',
    sourceLabel: 'חוזה מקור',
    sourceApi: 'סיכום שמור מה־API הרשמי של Last.fm',
    sourceExport: 'ייצוא Last.fm שסיפק המשתמש',
    capturedLabel: 'נשמר בתאריך',
    periodLabel: 'התקופה המכוסה',
    countsLabel: 'משמעות הספירות',
    countsValue: 'ערכים ישירים שנשמרו בסיכום השבועי; הסכומים אינם מוסקים מתוך הדירוגים.',
    limitationsLabel: 'מגבלות ידועות',
    limitationCopy: {
      point_in_time_capture: 'הערכים עשויים להשתנות לאחר תאריך השמירה.',
      official_api_snapshot: 'זהו סיכום שמור מה־API הרשמי, לא חיבור חי ולא אירועי האזנה גולמיים.',
      not_complete_history: 'השבוע הזה אינו מעיד על היסטוריית החשבון המלאה.',
      album_count_unavailable: 'המקור לא סיפק מספר אלבומים מהימן.',
      rankings_may_change: 'הדירוגים עשויים להשתנות כש־Last.fm מרעננת את חלון הדיווח.',
    },
  },
} as const;

/* ── framer-motion variants ── */
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
};

/* Artist photo from the pulse snapshot, with ArtistAvatar fallback on load error */
function PulsePhoto({ name, image, size }: { name: string; image: string; size: number }) {
  const { tc } = useApp();
  const [failed, setFailed] = useState(false);
  const [useOriginal, setUseOriginal] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const optimizedImage = optimizeRemoteImageUrl(image, size);
  const activeImage = useOriginal ? image : optimizedImage;

  useLayoutEffect(() => {
    setFailed(false);
    setUseOriginal(false);
    setLoaded(false);
  }, [image, optimizedImage]);

  const advanceImageFallback = useCallback(() => {
    setLoaded(false);
    if (!useOriginal && optimizedImage !== image) {
      setUseOriginal(true);
      return;
    }
    setFailed(true);
  }, [image, optimizedImage, useOriginal]);

  useImageLoadTimeout(
    Boolean(image && !failed && !loaded),
    `${name}:${activeImage}`,
    advanceImageFallback,
  );

  if (failed || !image) {
    return <ArtistAvatar name={name} size={size} />;
  }

  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-full ${loaded ? '' : 'art-loading'}`}
      style={{ width: size, height: size, border: `1px solid ${tc.c1}30` }}
    >
      <img
        src={activeImage}
        alt={name}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        width={size}
        height={size}
        onLoad={() => setLoaded(true)}
        onError={advanceImageFallback}
        className={`rounded-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ width: size, height: size }}
      />
    </span>
  );
}

/* Album art with a neutral music-note tile fallback on load error */
function AlbumArt({ title, image, size, rounded = 'rounded-xl' }: { title: string; image: string; size: number; rounded?: string }) {
  const { tc } = useApp();
  const [failed, setFailed] = useState(false);
  const [useOriginal, setUseOriginal] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const optimizedImage = optimizeRemoteImageUrl(image, size);
  const activeImage = useOriginal ? image : optimizedImage;

  useLayoutEffect(() => {
    setFailed(false);
    setUseOriginal(false);
    setLoaded(false);
  }, [image, optimizedImage]);

  const advanceImageFallback = useCallback(() => {
    setLoaded(false);
    if (!useOriginal && optimizedImage !== image) {
      setUseOriginal(true);
      return;
    }
    setFailed(true);
  }, [image, optimizedImage, useOriginal]);

  useImageLoadTimeout(
    Boolean(image && !failed && !loaded),
    `${title}:${activeImage}`,
    advanceImageFallback,
  );

  if (failed || !image) {
    return (
      <div
        role="img"
        aria-label={title}
        className={`${rounded} flex items-center justify-center shrink-0`}
        style={{ width: size, height: size, backgroundColor: `${tc.c2}15`, border: `1px solid ${tc.c2}30` }}
      >
        <Music className="w-1/2 h-1/2" style={{ color: tc.c2 }} />
      </div>
    );
  }

  return (
    <span
      className={`${rounded} inline-flex shrink-0 overflow-hidden ${loaded ? '' : 'art-loading'}`}
      style={{ width: size, height: size, border: `1px solid ${tc.c1}20` }}
    >
      <img
        src={activeImage}
        alt={title}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        width={size}
        height={size}
        onLoad={() => setLoaded(true)}
        onError={advanceImageFallback}
        className={`${rounded} object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ width: size, height: size }}
      />
    </span>
  );
}

function WeeklyPulsePanel({
  summary,
  formatDate,
  formatNumber,
}: {
  summary: WeeklyPulseSummary;
  formatDate: (date: string) => string;
  formatNumber: (value: number) => string;
}) {
  const { tc, lang } = useApp();
  const experienceDepth = useExperienceDepth();
  const copy = WEEKLY_PULSE_COPY[lang];
  const leadArtist = summary.top_artists[0] ?? null;
  const leadTrack = summary.top_tracks[0] ?? null;
  const sourceName = summary.source === 'lastfm_api'
    ? copy.sourceApi
    : copy.sourceExport;
  const metrics = [
    { label: copy.scrobbles, value: formatNumber(summary.counts.scrobbles) },
    { label: copy.artists, value: formatNumber(summary.counts.artists) },
    { label: copy.tracks, value: formatNumber(summary.counts.tracks) },
    {
      label: copy.albums,
      value: summary.counts.albums === null
        ? copy.unavailable
        : formatNumber(summary.counts.albums),
    },
  ];

  const rankingCount = (count: number | undefined) => count === undefined
    ? null
    : `${formatNumber(count)} ${copy.scrobbles.toLocaleLowerCase(localeFor(lang))}`;

  return (
    <section
      className="glass-panel space-y-6 rounded-3xl border p-5 sm:p-6"
      style={{ borderColor: `${tc.c3}30` }}
      data-testid="weekly-pulse-summary"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="type-label" style={{ color: tc.c3 }}>{copy.eyebrow}</p>
          <h2 className="text-xl font-black text-white sm:text-2xl">{copy.title}</h2>
          <p className="flex items-center gap-2 text-xs text-gray-400">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
            {copy.dateRange(
              formatDate(summary.period_start),
              formatDate(summary.period_end),
            )}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d51007]/30 bg-[#d51007]/10 px-3 py-1.5 text-[10px] font-bold text-[#ff8c85]">
          <BrandIcon name="lastfm" size={14} />
          Last.fm
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={copy.eyebrow}>
        {metrics.map(metric => (
          <div key={metric.label} className="rounded-2xl border border-white/5 bg-black/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{metric.label}</p>
            <p className="mt-1 font-mono text-xl font-black text-white">{metric.value}</p>
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl border p-4"
        style={{ borderColor: `${tc.c2}24`, backgroundColor: `${tc.c2}08` }}
        data-testid="weekly-pulse-fingerprint"
      >
        <div className="mb-3 flex items-center gap-2">
          <Fingerprint className="h-4 w-4" style={{ color: tc.c2 }} aria-hidden="true" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">{copy.fingerprint}</h3>
        </div>
        <p className="text-sm leading-relaxed text-gray-300">
          {copy.fingerprintBody(
            formatNumber(summary.counts.artists),
            formatNumber(summary.counts.scrobbles),
          )}
        </p>
        {(leadArtist || leadTrack) ? (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {leadArtist ? (
              <div className="border-s-2 ps-3" style={{ borderColor: tc.c1 }}>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{copy.leadArtist}</dt>
                <dd className="mt-1 text-sm font-bold text-white"><bdi>{leadArtist.name}</bdi></dd>
              </div>
            ) : null}
            {leadTrack ? (
              <div className="border-s-2 ps-3" style={{ borderColor: tc.c3 }}>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{copy.leadTrack}</dt>
                <dd className="mt-1 text-sm font-bold text-white">
                  <bdi>{leadTrack.title}</bdi>
                  <span className="text-gray-500"> · </span>
                  <bdi>{leadTrack.artist}</bdi>
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-3 text-xs text-gray-500">{copy.noRanking}</p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-black/10 p-4">
          <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-white">{copy.topArtists}</h3>
          {summary.top_artists.length ? (
            <ol className="space-y-2" data-testid="weekly-pulse-top-artists">
              {summary.top_artists.slice(0, 5).map((artist, index) => (
                <li
                  key={artist.name}
                  className="flex min-w-0 items-baseline gap-3 text-sm"
                >
                  <span className="w-5 shrink-0 font-mono text-[10px] text-gray-600">{index + 1}</span>
                  <bdi className="min-w-0 flex-1 truncate font-bold text-gray-200">{artist.name}</bdi>
                  {rankingCount(artist.scrobbles) ? (
                    <span className="shrink-0 text-[10px] text-gray-500">{rankingCount(artist.scrobbles)}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-gray-500">{copy.noRanking}</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/5 bg-black/10 p-4">
          <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-white">{copy.topTracks}</h3>
          {summary.top_tracks.length ? (
            <ol className="space-y-2" data-testid="weekly-pulse-top-tracks">
              {summary.top_tracks.slice(0, 5).map((track, index) => (
                <li
                  key={`${track.artist}\u0000${track.title}`}
                  className="flex min-w-0 items-baseline gap-3 text-sm"
                >
                  <span className="w-5 shrink-0 font-mono text-[10px] text-gray-600">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-gray-200">
                    <bdi className="font-bold">{track.title}</bdi>
                    <span className="text-gray-500"> · </span>
                    <bdi>{track.artist}</bdi>
                  </span>
                  {rankingCount(track.scrobbles) ? (
                    <span className="shrink-0 text-[10px] text-gray-500">{rankingCount(track.scrobbles)}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-gray-500">{copy.noRanking}</p>
          )}
        </div>
      </div>

      {experienceDepth === 'guided' ? (
        <p
          className="rounded-2xl border px-4 py-3 text-sm leading-relaxed text-gray-300"
          style={{ borderColor: `${tc.c1}20`, backgroundColor: `${tc.c1}08` }}
          data-testid="weekly-pulse-guidance"
        >
          {copy.guidedNote}
        </p>
      ) : null}

      {experienceDepth !== 'deep-dive' ? (
        <p className="text-xs leading-relaxed text-gray-500">{copy.simpleBoundary}</p>
      ) : (
        <div
          className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4"
          data-testid="weekly-pulse-provenance"
        >
          <h3 className="text-xs font-black uppercase tracking-wider text-white">{copy.technicalTitle}</h3>
          <dl className="grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="font-bold uppercase tracking-wider text-gray-500">{copy.sourceLabel}</dt>
              <dd className="mt-1 text-gray-300">{sourceName}</dd>
              <dd className="mt-1 font-mono text-[10px] text-gray-600">{summary.source}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-gray-500">{copy.capturedLabel}</dt>
              <dd className="mt-1 text-gray-300">{formatDate(summary.captured_at)}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-gray-500">{copy.periodLabel}</dt>
              <dd className="mt-1 text-gray-300">
                {copy.dateRange(formatDate(summary.period_start), formatDate(summary.period_end))}
              </dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-gray-500">{copy.countsLabel}</dt>
              <dd className="mt-1 leading-relaxed text-gray-300">{copy.countsValue}</dd>
            </div>
          </dl>
          {summary.limitations.length ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{copy.limitationsLabel}</p>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed text-gray-400">
                {summary.limitations.map((limitation: WeeklyPulseLimitation) => (
                  <li key={limitation} className="flex gap-2">
                    <span aria-hidden="true" style={{ color: tc.c3 }}>•</span>
                    <span>{copy.limitationCopy[limitation]}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

export default function RecentPulse({
  data,
  isPersonalArchive = false,
  snapshot = flagshipPulse,
}: RecentPulseProps) {
  const { tc, t, lang, setActiveTab, setSelectedArtistName, setSelectedTrackKey, setTopSubTab } = useApp();
  const fmtNum = (n: number) => Math.round(n).toLocaleString(localeFor(lang));
  const pulse = snapshot;
  const weeklySummary = resolveWeeklyPulseSummary(pulse);
  const refreshCopy = REFRESH_PULSE_COPY[lang];
  const sourceSignals = pickLanguage(lang, {
    en: {
      label: 'Listening sources represented here',
      spotify: 'Dated snapshot',
      lastfm: 'Historical context',
      lastfmWeekly: 'Saved week',
      youtube: 'Archive source',
    },
    es: {
      label: 'Fuentes de escucha representadas aquí',
      spotify: 'Instantánea fechada',
      lastfm: 'Contexto histórico',
      lastfmWeekly: 'Semana guardada',
      youtube: 'Fuente del archivo',
    },
    he: {
      label: 'מקורות ההאזנה המיוצגים כאן',
      spotify: 'תמונת מצב מתוארכת',
      lastfm: 'הקשר היסטורי',
      lastfmWeekly: 'שבוע שמור',
      youtube: 'מקור בארכיון',
    },
  });

  if (isPersonalArchive) {
    const copy = VISITOR_PULSE_COPY[lang];
    return (
      <section
        className="glass-panel space-y-4 rounded-3xl border border-white/10 p-6 sm:p-8"
        data-testid="visitor-pulse-unavailable"
      >
        <p className="type-label" style={{ color: tc.c3 }}>📡 {copy.title}</p>
        <p className="max-w-3xl text-sm leading-relaxed text-gray-300">{copy.body}</p>
        <p className="max-w-3xl text-xs leading-relaxed text-gray-500">{copy.next}</p>
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs font-black"
          style={{ borderColor: `${tc.c1}50`, color: tc.c1, backgroundColor: `${tc.c1}10` }}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {refreshCopy.refresh}
        </button>
      </section>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(localeFor(lang), { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  /* Archive lookup: anywhere in the historic top-100 counts as "already archived" */
  const findInArchive = (name: string) =>
    data.top_artists.find(a => a.name.toLowerCase() === name.toLowerCase());

  const verdicts = pulse.top_artists.map(artist => {
    const archived = findInArchive(artist.name);
    return { ...artist, archived };
  });
  const newBloodCount = verdicts.filter(v => !v.archived).length;
  const matchedCount = verdicts.length - newBloodCount;
  const matchPct = verdicts.length > 0 ? Math.round((matchedCount / verdicts.length) * 100) : 0;
  const snapshotAgeDays = (() => {
    const synced = new Date(`${pulse.synced_at}T00:00:00`);
    if (isNaN(synced.getTime())) return 0;
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.max(0, Math.floor((todayMidnight.getTime() - synced.getTime()) / 86_400_000));
  })();

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <span
            className="inline-flex flex-wrap items-center gap-x-2 rounded-full border px-3 py-1 font-mono text-[10px] font-black uppercase tracking-wider"
            style={{ color: tc.c1, borderColor: `${tc.c1}40`, backgroundColor: `${tc.c1}10` }}
          >
            <span>{refreshCopy.snapshot}</span>
            <time dateTime={pulse.synced_at} dir="ltr">{pulse.synced_at}</time>
          </span>
          <p className="max-w-2xl text-xs leading-relaxed text-gray-500">{refreshCopy.boundary}</p>
        </div>
        <button
          type="button"
          data-testid="recent-pulse-refresh"
          onClick={() => setActiveTab('upload')}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs font-black"
          style={{ borderColor: `${tc.c1}50`, color: tc.c1, backgroundColor: `${tc.c1}10` }}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {refreshCopy.refresh}
        </button>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed font-sans max-w-2xl">
        {t.pulse.subtitle}
      </p>
      <div
        className="flex flex-wrap gap-2"
        role="list"
        aria-label={sourceSignals.label}
      >
        <span role="listitem" className="inline-flex items-center gap-2 rounded-full border border-[#1DB954]/30 bg-[#1DB954]/10 px-3 py-1.5 text-[10px] font-bold text-[#7ee2a3]">
          <BrandIcon name="spotify" size={14} />
          Spotify · {sourceSignals.spotify}
        </span>
        {(data.source_summary?.lastfm_plays ?? 0) > 0 || weeklySummary ? (
          <span role="listitem" className="inline-flex items-center gap-2 rounded-full border border-[#d51007]/30 bg-[#d51007]/10 px-3 py-1.5 text-[10px] font-bold text-[#ff8c85]">
            <BrandIcon name="lastfm" size={14} />
            Last.fm · {weeklySummary ? sourceSignals.lastfmWeekly : sourceSignals.lastfm}
          </span>
        ) : null}
        {(data.source_summary?.youtube_plays ?? 0) > 0 ? (
          <span role="listitem" className="inline-flex items-center gap-2 rounded-full border border-[#FF0000]/25 bg-[#FF0000]/10 px-3 py-1.5 text-[10px] font-bold text-[#ff9a9a]">
            <BrandIcon name="youtube" size={14} />
            YouTube · {sourceSignals.youtube}
          </span>
        ) : null}
      </div>

      {weeklySummary ? (
        <WeeklyPulsePanel
          summary={weeklySummary}
          formatDate={formatDate}
          formatNumber={fmtNum}
        />
      ) : null}

      {/* ── Section 1: Top artists now ── */}
      <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}>
        <div className="flex items-center space-x-3 mb-5">
          <Crown className="w-5 h-5" style={{ color: tc.c1 }} />
          <h3 className="text-base font-bold font-mono uppercase tracking-wider text-white">
            {t.pulse.topArtistsNow}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {verdicts.map((artist, idx) => {
            const accent = artist.archived ? tc.c1 : tc.c2;
            return (
              <motion.div
                key={`${artist.name}-${idx}`}
                variants={itemVariants}
                className="glass-panel p-5 rounded-3xl flex flex-col items-center text-center space-y-3 hover:scale-[1.03] transition-transform cursor-pointer hover:border-white/20"
                role="button"
                tabIndex={0}
                aria-label={artist.name}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedArtistName(artist.name); setTopSubTab('artists'); setActiveTab('top'); } }}
                onClick={() => {
                  setSelectedArtistName(artist.name);
                  setTopSubTab('artists');
                  setActiveTab('top');
                }}
              >
                <PulsePhoto name={artist.name} image={artist.image} size={72} />
                <p className="text-sm font-bold text-white truncate w-full">{artist.name}</p>
                <span
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] font-black uppercase tracking-wider border"
                  style={{ color: accent, borderColor: `${accent}40`, backgroundColor: `${accent}12` }}
                >
                  {artist.archived
                    ? <Crown className="w-3 h-3" />
                    : <Sparkles className="w-3 h-3" />}
                  {artist.archived ? t.pulse.stillReigning : t.pulse.newBlood}
                </span>
                {artist.archived && (
                  <p className="text-[10px] font-mono text-gray-400">
                    {t.pulse.historicPlays(fmtNum(artist.archived.plays))}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Section 2: Tracks on repeat now ── */}
      <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}>
        <div className="flex items-center space-x-3 mb-5">
          <Repeat className="w-5 h-5" style={{ color: tc.c2 }} />
          <h3 className="text-base font-bold font-mono uppercase tracking-wider text-white">
            {t.pulse.tracksOnRepeat}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pulse.top_tracks.map((track, idx) => (
            <motion.div
              key={`${track.title}-${idx}`}
              variants={itemVariants}
              className="glass-panel p-4 rounded-3xl flex items-center space-x-4 hover:scale-[1.02] transition-transform cursor-pointer hover:border-white/20"
              role="button"
              tabIndex={0}
              aria-label={`${track.title} — ${track.artist}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedArtistName(track.artist); setSelectedTrackKey(`${track.artist.toLowerCase()}|||${track.title.toLowerCase()}`); setTopSubTab('tracks'); setActiveTab('top'); } }}
              onClick={() => {
                setSelectedArtistName(track.artist);
                setSelectedTrackKey(`${track.artist.toLowerCase()}|||${track.title.toLowerCase()}`);
                setTopSubTab('tracks');
                setActiveTab('top');
              }}
            >
              <AlbumArt title={track.title} image={track.image} size={56} rounded="rounded-2xl" />
              <div className="truncate">
                <p className="text-sm font-bold text-white truncate">{track.title}</p>
                <p className="text-xs text-gray-400 truncate">{track.artist}</p>
              </div>
              <div className="ml-auto shrink-0">
                <Repeat className="w-4 h-4 opacity-60" style={{ color: tc.c2 }} />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Section 3: Recently played ── */}
      <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}>
        <div className="flex items-center space-x-3 mb-5">
          <History className="w-5 h-5" style={{ color: tc.c3 }} />
          <h3 className="text-base font-bold font-mono uppercase tracking-wider text-white">
            {t.pulse.recentlyPlayed}
          </h3>
        </div>

        <div className="glass-panel p-4 rounded-3xl divide-y divide-white/5">
          {pulse.recent_tracks.map((track, idx) => (
            <motion.div
              key={`${track.title}-${idx}`}
              variants={itemVariants}
              className="flex items-center space-x-3 py-3 first:pt-1 last:pb-1 cursor-pointer hover:bg-white/[0.02] rounded-xl px-2 transition-all"
              role="button"
              tabIndex={0}
              aria-label={`${track.title} — ${track.artist}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedArtistName(track.artist); setSelectedTrackKey(`${track.artist.toLowerCase()}|||${track.title.toLowerCase()}`); setTopSubTab('tracks'); setActiveTab('top'); } }}
              onClick={() => {
                setSelectedArtistName(track.artist);
                setSelectedTrackKey(`${track.artist.toLowerCase()}|||${track.title.toLowerCase()}`);
                setTopSubTab('tracks');
                setActiveTab('top');
              }}
            >
              <AlbumArt title={track.title} image={track.image} size={36} rounded="rounded-lg" />
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{track.title}</p>
                <p className="text-[10px] text-gray-400 truncate">{track.artist}</p>
              </div>
              <span
                className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: `${tc.c3}90` }}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Closing insight panel ── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass-panel p-6 rounded-3xl border-l-4"
        style={{ borderLeftColor: tc.c2 }}
      >
        <div className="flex items-center space-x-3 mb-3">
          <Zap className="w-5 h-5" style={{ color: tc.c2 }} />
          <h3 className="text-base font-bold font-mono uppercase tracking-wider text-white">
            {t.pulse.insightTitle}
          </h3>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed font-sans">
          {t.pulse.insightBody(newBloodCount)}
        </p>
      </motion.div>

      <SectionNarrative content={t.deepNarratives.pulse} accent="c3" />

      <MethodologyPanel
        eyebrow={t.pulse.methodEyebrow}
        title={t.pulse.methodTitle}
        subtitle={t.pulse.methodSubtitle}
        accent="c3"
        stats={[
          {
            label: t.dataQuality.sourceTypeLabel,
            value: t.pulse.sourceValue,
          },
          {
            label: t.pulse.snapshotAgeLabel,
            value: t.pulse.snapshotAgeValue(snapshotAgeDays),
          },
          {
            label: t.pulse.archiveMatchLabel,
            value: t.pulse.archiveMatchValue(matchedCount, verdicts.length, matchPct),
          },
          {
            label: t.pulse.confidenceLabel,
            value: t.pulse.confidenceValue,
          },
        ]}
        points={t.pulse.methodPoints}
      />

      {/* ── Footer disclaimer ── */}
      <p className="text-[10px] font-mono text-gray-500 leading-relaxed max-w-3xl">
        {t.pulse.disclaimer}
      </p>
    </div>
  );
}
