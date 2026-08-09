import { ArrowRight, CalendarDays, Clock, Flame, Headphones, Map, Music2, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { playMuseumSound } from '../audio/sonicFeedback';
import { useApp } from '../context/AppContext';
import type { MusicDnaData, Obsession } from '../types';
import { localeFor, pickLanguage } from '../utils/i18n';
import ArtistAvatar from './ArtistAvatar';
import CoverArt from './CoverArt';
import SectionNarrative from './SectionNarrative';

interface ObsessionDetectorProps {
  data: MusicDnaData;
}

interface ObsessionRoomCopy {
  spotlightEyebrow: string;
  playsOfOneTrack: string;
  onDate: string;
  openTrack: string;
  meetArtist: string;
  openTrackLabel: (track: string, artist: string) => string;
  openArtistLabel: (artist: string) => string;
  moreLoops: string;
  loopSignal: string;
  sessionSignal: string;
  distinctArtists: string;
  dominantTrack: string;
  noSessions: string;
}

const ROOM_COPY: Record<'es' | 'en' | 'he', ObsessionRoomCopy> = {
  es: {
    spotlightEyebrow: 'Pico de repetición · un solo día',
    playsOfOneTrack: 'reproducciones del mismo tema',
    onDate: 'el',
    openTrack: 'Abrir canción',
    meetArtist: 'Conocer al artista',
    openTrackLabel: (track, artist) => `Abrir ${track} de ${artist} en Canciones`,
    openArtistLabel: artist => `Abrir el territorio de ${artist} en el Atlas`,
    moreLoops: 'Más loops intensos',
    loopSignal: 'Loop',
    sessionSignal: 'Sesión',
    distinctArtists: 'Artistas distintos',
    dominantTrack: 'Tema dominante',
    noSessions: 'Este archivo todavía no contiene maratones de escucha detectables.',
  },
  en: {
    spotlightEyebrow: 'Replay peak · one day',
    playsOfOneTrack: 'plays of the same track',
    onDate: 'on',
    openTrack: 'Open track',
    meetArtist: 'Meet the artist',
    openTrackLabel: (track, artist) => `Open ${track} by ${artist} in Tracks`,
    openArtistLabel: artist => `Open ${artist}'s territory in the Atlas`,
    moreLoops: 'More intense loops',
    loopSignal: 'Loop',
    sessionSignal: 'Session',
    distinctArtists: 'Distinct artists',
    dominantTrack: 'Dominant track',
    noSessions: 'This archive does not contain a detectable listening marathon yet.',
  },
  he: {
    spotlightEyebrow: 'שיא החזרה · יום אחד',
    playsOfOneTrack: 'השמעות של אותו שיר',
    onDate: 'בתאריך',
    openTrack: 'פתיחת השיר',
    meetArtist: 'היכרות עם האמן',
    openTrackLabel: (track, artist) => `פתיחת ${track} מאת ${artist} בחדר השירים`,
    openArtistLabel: artist => `פתיחת המרחב של ${artist} באטלס`,
    moreLoops: 'עוד לופים אינטנסיביים',
    loopSignal: 'לופ',
    sessionSignal: 'סשן',
    distinctArtists: 'אמנים שונים',
    dominantTrack: 'השיר הדומיננטי',
    noSessions: 'בארכיון הזה עדיין אין מרתון האזנה שניתן לזהות.',
  },
};

const trackKey = (artist: string, title: string) => (
  `${artist.normalize('NFC').trim().toLowerCase()}|||${title.normalize('NFC').trim().toLowerCase()}`
);

function sortObsessions(obsessions: Obsession[]) {
  return obsessions
    .map((obsession, sourceIndex) => ({ obsession, sourceIndex }))
    .sort((left, right) => (
      right.obsession.count - left.obsession.count
      || left.sourceIndex - right.sourceIndex
    ))
    .map(({ obsession }) => obsession);
}

export default function ObsessionDetector({ data }: ObsessionDetectorProps) {
  const { t, lang, setActiveTab, setSelectedArtistName, setSelectedTrackKey, setTopSubTab } = useApp();
  const copy = pickLanguage(lang, ROOM_COPY);
  const obsessions = useMemo(() => sortObsessions(data.obsessions), [data.obsessions]);
  const spotlight = obsessions[0];
  const remainingObsessions = obsessions.slice(1);
  const locale = localeFor(lang);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    const rounded = Math.max(0, Math.round(minutes));
    if (rounded < 60) return `${rounded} min`;
    const hours = Math.floor(rounded / 60);
    const remainder = rounded % 60;
    return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
  };

  const openTrack = (obsession: Obsession) => {
    playMuseumSound('open');
    setSelectedArtistName(obsession.artist);
    setSelectedTrackKey(trackKey(obsession.artist, obsession.track));
    setTopSubTab('tracks');
    setActiveTab('top');
  };

  const openArtist = (artist: string) => {
    playMuseumSound('open');
    setSelectedArtistName(artist);
    setActiveTab('artist');
  };

  return (
    <div
      className="space-y-8 animate-fade-in"
      dir={lang === 'he' ? 'rtl' : 'ltr'}
      data-testid="obsession-room"
    >
      <SectionNarrative content={t.deepNarratives.obsessions} accent="c2" />

      {spotlight ? (
        <section
          className="nova-surface nova-surface--featured nova-on-dark relative isolate min-h-[25rem] overflow-hidden rounded-[2rem] border border-fuchsia-400/20 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.32)] sm:p-7 lg:min-h-[29rem] lg:p-10"
          aria-labelledby="obsession-spotlight-title"
          data-testid="obsession-spotlight"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -end-14 -top-12 opacity-55 blur-[0.2px] motion-safe:transition motion-safe:duration-700 lg:end-8 lg:top-1/2 lg:-translate-y-1/2"
          >
            <CoverArt artist={spotlight.artist} title={spotlight.track} kind="track" size={420} />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,18,0.98)_0%,rgba(5,12,24,0.94)_48%,rgba(5,12,24,0.42)_100%)] rtl:bg-[linear-gradient(270deg,rgba(3,7,18,0.98)_0%,rgba(5,12,24,0.94)_48%,rgba(5,12,24,0.42)_100%)]"
          />
          <div aria-hidden="true" className="pointer-events-none absolute -start-20 bottom-0 h-48 w-48 rounded-full bg-fuchsia-500/15 blur-3xl" />

          <div className="relative z-10 flex min-h-[21rem] max-w-2xl flex-col justify-end">
            <div className="mb-auto flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200">
                <Flame className="h-3.5 w-3.5 motion-safe:animate-pulse" aria-hidden="true" />
                {copy.spotlightEyebrow}
              </span>
              <span className="nova-number-ltr rounded-full border border-white/10 bg-black/35 px-3 py-1.5 font-mono text-xs font-black text-white" dir="ltr">
                {spotlight.count}×
              </span>
            </div>

            <div className="mt-16 flex items-center gap-3">
              <ArtistAvatar name={spotlight.artist} size={48} tooltip={false} priority decorative />
              <p className="text-sm font-bold text-gray-300"><bdi dir="auto">{spotlight.artist}</bdi></p>
            </div>
            <h3 id="obsession-spotlight-title" className="mt-3 max-w-[18ch] text-4xl font-black leading-[0.96] tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
              <bdi dir="auto">{spotlight.track}</bdi>
            </h3>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-300 sm:text-base">
              <span className="nova-number-ltr font-black text-fuchsia-200" dir="ltr">{spotlight.count}</span>{' '}
              {copy.playsOfOneTrack} {copy.onDate}{' '}
              <span className="nova-number-ltr font-semibold text-white" dir="ltr">{formatDate(spotlight.date)}</span>.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => openTrack(spotlight)}
                aria-label={copy.openTrackLabel(spotlight.track, spotlight.artist)}
                className="nova-surface--interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15 motion-reduce:transform-none"
              >
                <Music2 className="h-4 w-4" aria-hidden="true" />
                {copy.openTrack}
              </button>
              <button
                type="button"
                onClick={() => openArtist(spotlight.artist)}
                aria-label={copy.openArtistLabel(spotlight.artist)}
                className="nova-surface--interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/30 bg-fuchsia-300/10 px-5 text-sm font-black text-fuchsia-100 transition hover:bg-fuchsia-300/15 motion-reduce:transform-none"
              >
                <Map className="h-4 w-4" aria-hidden="true" />
                {copy.meetArtist}
                <ArrowRight className="nova-mirror-rtl h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      ) : (
        <div className="nova-surface nova-surface--analysis rounded-3xl p-8 text-center font-mono text-sm text-gray-400" role="status">
          <Flame className="mx-auto mb-3 h-6 w-6 text-fuchsia-300" aria-hidden="true" />
          {t.obsessionDetector.noHyperfixations}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        {remainingObsessions.length > 0 ? (
          <section className="nova-surface nova-surface--analysis rounded-3xl p-4 sm:p-6" aria-labelledby="obsession-grid-title">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="type-kicker text-fuchsia-300">{copy.moreLoops}</p>
                <h3 id="obsession-grid-title" className="mt-1 text-lg font-black text-white">{t.obsessionDetector.hyperfixationsTitle}</h3>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">{t.obsessionDetector.hyperfixationsDesc}</p>
              </div>
              <Headphones className="h-6 w-6 shrink-0 text-fuchsia-300" aria-hidden="true" />
            </div>

            <div className="grid max-h-[720px] grid-cols-1 gap-3 overflow-y-auto pe-2 sm:grid-cols-2">
              {remainingObsessions.map((obsession, index) => (
                <button
                  key={`${obsession.artist}-${obsession.track}-${obsession.date}-${index}`}
                  type="button"
                  onClick={() => openTrack(obsession)}
                  aria-label={copy.openTrackLabel(obsession.track, obsession.artist)}
                  className="group relative min-h-40 overflow-hidden rounded-2xl border border-cyan-300/10 bg-cyan-950/10 p-4 text-start transition hover:border-cyan-300/40 motion-safe:hover:-translate-y-0.5 motion-reduce:transform-none"
                >
                  <div aria-hidden="true" className="pointer-events-none absolute -end-6 -top-5 opacity-35 transition duration-500 group-hover:scale-105 group-hover:opacity-50 motion-reduce:transform-none">
                    <CoverArt artist={obsession.artist} title={obsession.track} kind="track" size={168} />
                  </div>
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#07111e]/95 via-[#07111e]/82 to-[#07111e]/35 rtl:bg-gradient-to-l" />
                  <div className="relative z-10 flex h-full min-w-0 flex-col items-start">
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200/75">
                        {copy.loopSignal} <span className="nova-number-ltr" dir="ltr">{String(index + 2).padStart(2, '0')}</span>
                      </span>
                      <span className="nova-number-ltr inline-flex items-center gap-1 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-2.5 py-1 font-mono text-xs font-black text-fuchsia-200" dir="ltr">
                        <Flame className="h-3 w-3" aria-hidden="true" />{obsession.count}×
                      </span>
                    </div>
                    <div className="mt-auto min-w-0 pe-12">
                      <h4 className="truncate text-sm font-black text-white"><bdi dir="auto">{obsession.track}</bdi></h4>
                      <p className="mt-1 truncate text-xs text-gray-300"><bdi dir="auto">{obsession.artist}</bdi></p>
                      <p className="nova-number-ltr mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] text-cyan-200/70" dir="ltr">
                        <CalendarDays className="h-3 w-3" aria-hidden="true" />{formatDate(obsession.date)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="nova-surface nova-surface--utility rounded-3xl p-4 sm:p-6" aria-labelledby="obsession-sessions-title">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 id="obsession-sessions-title" className="text-lg font-black text-white">{t.obsessionDetector.marathonsTitle}</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-400">{t.obsessionDetector.marathonsDesc}</p>
            </div>
            <Trophy className="h-6 w-6 shrink-0 text-cyan-300" aria-hidden="true" />
          </div>

          {data.sessions.length > 0 ? (
            <div className="max-h-[720px] space-y-3 overflow-y-auto pe-2">
              {data.sessions.map((session, index) => (
                <article
                  key={session.id}
                  className="relative overflow-hidden rounded-2xl border border-cyan-300/10 bg-cyan-950/10 p-4 transition hover:border-fuchsia-300/30"
                  aria-labelledby={`obsession-session-${session.id}`}
                >
                  <div aria-hidden="true" className="absolute inset-y-0 start-0 w-0.5 bg-gradient-to-b from-cyan-300 via-fuchsia-400 to-transparent" />
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-gray-500">
                        {copy.sessionSignal} <span className="nova-number-ltr" dir="ltr">{String(index + 1).padStart(2, '0')}</span>
                      </p>
                      <h4 id={`obsession-session-${session.id}`} className="nova-number-ltr mt-1 text-sm font-black text-white" dir="ltr">
                        {formatDate(session.start)} · {formatTime(session.start)}
                      </h4>
                    </div>
                    <span className="nova-number-ltr inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 font-mono text-xs font-black text-cyan-200" dir="ltr">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatDuration(session.duration_min)}
                    </span>
                  </div>

                  <div className="mt-4 flex min-w-0 items-center gap-2.5 rounded-xl border border-white/5 bg-black/20 p-2.5">
                    <ArtistAvatar name={session.top_artist} size={32} tooltip={false} decorative />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-fuchsia-200"><bdi dir="auto">{session.top_artist}</bdi></p>
                      <p className="mt-0.5 truncate text-[10px] text-gray-400">
                        {copy.dominantTrack}: <bdi dir="auto">{session.top_track}</bdi>
                      </p>
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-3 text-[10px]">
                    <div>
                      <dt className="font-mono text-gray-500">{t.obsessionDetector.volume}</dt>
                      <dd className="mt-0.5 font-black text-white">
                        <span className="nova-number-ltr" dir="ltr">{session.tracks_count.toLocaleString(locale)}</span>{' '}
                        {t.obsessionDetector.volumeUnit}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-gray-500">{copy.distinctArtists}</dt>
                      <dd className="nova-number-ltr mt-0.5 font-black text-cyan-200" dir="ltr">{session.unique_artists.toLocaleString(locale)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-7 text-center text-xs leading-relaxed text-gray-500" role="status">
              <Trophy className="mx-auto mb-3 h-5 w-5 text-cyan-300" aria-hidden="true" />
              {copy.noSessions}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
