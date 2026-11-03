import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Map, Repeat, Sparkles } from 'lucide-react';

import { playMuseumSound } from '../audio/sonicFeedback';
import { useApp } from '../context/AppContext';
import type { MusicDnaData } from '../types';
import { directionFor, localeFor, pickLanguage, type Lang } from '../utils/i18n';
import {
  calendarDayOf,
  firstListensOnThisDay,
  formatCalendarDay,
  obsessionsOnThisDay,
  playsOnThisDayByYear,
  shiftCalendarDay,
  upcomingFirstListens,
  type CalendarDay,
} from '../utils/onThisDay';
import ArtistAvatar from './ArtistAvatar';
import MethodologyPanel from './MethodologyPanel';
import Surface from './Surface';

interface OnThisDayProps {
  data: MusicDnaData;
  /** Injectable clock for tests; defaults to the visitor's current local day. */
  now?: Date;
}

type Evidence = 'observed' | 'derived' | 'unavailable';

interface RoomCopy {
  eyebrow: string;
  intro: string;
  previousDay: string;
  nextDay: string;
  today: string;
  showingDay: (date: string) => string;
  evidence: Record<Evidence, string>;
  yearsTitle: string;
  yearsBody: string;
  playsUnit: string;
  silentDay: string;
  totalAcrossYears: (plays: string, years: number) => string;
  loudestYear: (year: number) => string;
  yearsUnavailable: string;
  firstTitle: string;
  firstBody: string;
  firstPlayedIn: (year: number) => string;
  yearsAgo: (years: number) => string;
  playsSince: (plays: string) => string;
  archiveStartNote: string;
  openArtist: (name: string) => string;
  noFirstToday: string;
  upcomingTitle: string;
  inDays: (days: number) => string;
  firstUnavailable: string;
  firstUnavailableBody: string;
  loopsTitle: string;
  loopsBody: string;
  loopCount: (count: number) => string;
  noLoops: string;
  method: {
    eyebrow: string;
    title: string;
    subtitle: string;
    observedPeriod: string;
    firstListenNames: string;
    points: ReadonlyArray<{ title: string; tag: string; body: string }>;
  };
}

const ROOM_COPY: Record<Lang, RoomCopy> = {
  es: {
    eyebrow: 'En un día como hoy',
    intro: 'Cada año tiene su versión de esta fecha. Esto es lo que el archivo escuchó en ella.',
    previousDay: 'Día anterior',
    nextDay: 'Día siguiente',
    today: 'Hoy',
    showingDay: date => `Mostrando el ${date}`,
    evidence: { observed: 'Observado', derived: 'Derivado', unavailable: 'No disponible' },
    yearsTitle: 'Esta fecha, año por año',
    yearsBody: 'Reproducciones registradas en este día del calendario en cada año observado. Un año fuera del periodo del archivo se omite; no cuenta como cero.',
    playsUnit: 'reproducciones',
    silentDay: 'en silencio',
    totalAcrossYears: (plays, years) => `${plays} reproducciones en ${years} ${years === 1 ? 'año' : 'años'}`,
    loudestYear: year => `Año más intenso: ${year}`,
    yearsUnavailable: 'Este archivo no tiene reproducciones por día, así que esta fecha no se puede leer año por año.',
    firstTitle: 'Primeras escuchas en este día',
    firstBody: 'Artistas cuya primera reproducción contada en este archivo cae en esta fecha.',
    firstPlayedIn: year => `Primera vez en ${year}`,
    yearsAgo: years => (years <= 0 ? 'este año' : years === 1 ? 'hace 1 año' : `hace ${years} años`),
    playsSince: plays => `${plays} reproducciones desde entonces`,
    archiveStartNote: 'Dentro del primer mes del archivo: la escucha pudo empezar antes.',
    openArtist: name => `Abrir a ${name} en el Atlas`,
    noFirstToday: 'Ninguna primera escucha de este archivo cae en esta fecha.',
    upcomingTitle: 'Próximamente esta semana',
    inDays: days => (days === 1 ? 'mañana' : `en ${days} días`),
    firstUnavailable: 'Las fechas de primera escucha todavía no forman parte de este archivo.',
    firstUnavailableBody: 'Los museos que importas en este navegador las calculan localmente. La exposición pública las mostrará cuando su instantánea se recompile y se revisen sus fechas exactas.',
    loopsTitle: 'Picos de repetición en este día',
    loopsBody: 'Loops de un solo día del top 50 curado del archivo que cayeron en esta fecha.',
    loopCount: count => `${count}× en un día`,
    noLoops: 'Ninguno de los picos de repetición curados cae en esta fecha.',
    method: {
      eyebrow: 'Método',
      title: 'Cómo se lee este día',
      subtitle: 'Tres capas, cada una con su propia clase de evidencia.',
      observedPeriod: 'Periodo observado',
      firstListenNames: 'Artistas con primera escucha',
      points: [
        { title: 'Reproducciones por año', tag: 'Observado', body: 'Contadas desde las reproducciones por día, en el calendario local con el que se compiló el archivo.' },
        { title: 'Primeras escuchas', tag: 'Derivado', body: 'La primera reproducción contada por nombre exacto de artista. No ve la escucha anterior al inicio del archivo y no fusiona variantes del nombre.' },
        { title: 'Picos de repetición', tag: 'Observado', body: 'Solo se revisan los 50 loops de un día curados del archivo, así que una fecha tranquila puede tener loops más pequeños.' },
      ],
    },
  },
  en: {
    eyebrow: 'On this day',
    intro: 'Every year has a version of this date. Here is what the archive heard on it.',
    previousDay: 'Previous day',
    nextDay: 'Next day',
    today: 'Today',
    showingDay: date => `Showing ${date}`,
    evidence: { observed: 'Observed', derived: 'Derived', unavailable: 'Unavailable' },
    yearsTitle: 'This date, year by year',
    yearsBody: 'Plays recorded on this calendar day in every observed year. A year outside the archive period is left out, not counted as zero.',
    playsUnit: 'plays',
    silentDay: 'silent',
    totalAcrossYears: (plays, years) => `${plays} plays across ${years} ${years === 1 ? 'year' : 'years'}`,
    loudestYear: year => `Loudest year: ${year}`,
    yearsUnavailable: 'This archive has no day-level plays, so this date cannot be read year by year.',
    firstTitle: 'First listens on this day',
    firstBody: 'Artists whose earliest counted play in this archive falls on this date.',
    firstPlayedIn: year => `First played in ${year}`,
    yearsAgo: years => (years <= 0 ? 'this year' : years === 1 ? '1 year ago' : `${years} years ago`),
    playsSince: plays => `${plays} plays since`,
    archiveStartNote: 'Within the archive’s first month: listening may have started earlier.',
    openArtist: name => `Open ${name} in the Atlas`,
    noFirstToday: 'No first listen in this archive falls on this date.',
    upcomingTitle: 'Coming up this week',
    inDays: days => (days === 1 ? 'tomorrow' : `in ${days} days`),
    firstUnavailable: 'First-listen dates are not part of this archive yet.',
    firstUnavailableBody: 'Museums you import in this browser compute them locally. The public exhibition will show them once its snapshot is recompiled and its exact dates are reviewed.',
    loopsTitle: 'Repeat peaks on this day',
    loopsBody: 'Single-day loops from the archive’s curated top 50 that landed on this date.',
    loopCount: count => `${count}× in one day`,
    noLoops: 'None of the curated repeat peaks fall on this date.',
    method: {
      eyebrow: 'Method',
      title: 'How this day is read',
      subtitle: 'Three layers, each with its own evidence class.',
      observedPeriod: 'Observed period',
      firstListenNames: 'Artists with a first listen',
      points: [
        { title: 'Plays per year', tag: 'Observed', body: 'Counted from day-level plays in the local calendar the archive was compiled in.' },
        { title: 'First listens', tag: 'Derived', body: 'The earliest counted play per exact artist name. It cannot see listening before the archive began, and name variants are not merged.' },
        { title: 'Repeat peaks', tag: 'Observed', body: 'Only the archive’s curated top 50 single-day loops are checked, so a quiet date can still hold smaller loops.' },
      ],
    },
  },
  he: {
    eyebrow: 'ביום זה',
    intro: 'לכל שנה יש גרסה משלה לתאריך הזה. זה מה שהארכיון שמע בו.',
    previousDay: 'היום הקודם',
    nextDay: 'היום הבא',
    today: 'היום',
    showingDay: date => `מוצג: ${date}`,
    evidence: { observed: 'נצפה', derived: 'נגזר', unavailable: 'לא זמין' },
    yearsTitle: 'התאריך הזה, שנה אחר שנה',
    yearsBody: 'השמעות שנרשמו ביום הזה בלוח השנה בכל שנה נצפית. שנה שמחוץ לתקופת הארכיון אינה מוצגת, ואינה נספרת כאפס.',
    playsUnit: 'השמעות',
    silentDay: 'שקט',
    totalAcrossYears: (plays, years) => `${plays} השמעות לאורך ${years === 1 ? 'שנה אחת' : years === 2 ? 'שנתיים' : `${years} שנים`}`,
    loudestYear: year => `השנה העמוסה ביותר: ${year}`,
    yearsUnavailable: 'בארכיון הזה אין השמעות ברמת היום, ולכן אי אפשר לקרוא את התאריך הזה שנה אחר שנה.',
    firstTitle: 'האזנות ראשונות ביום זה',
    firstBody: 'אמנים שההשמעה הראשונה שלהם שנספרה בארכיון הזה חלה בתאריך הזה.',
    firstPlayedIn: year => `הושמע לראשונה ב־${year}`,
    yearsAgo: years => (years <= 0 ? 'השנה' : years === 1 ? 'לפני שנה' : years === 2 ? 'לפני שנתיים' : `לפני ${years} שנים`),
    playsSince: plays => `${plays} השמעות מאז`,
    archiveStartNote: 'בחודש הראשון של הארכיון: ייתכן שההאזנה התחילה קודם.',
    openArtist: name => `פתיחת ${name} באטלס`,
    noFirstToday: 'אף האזנה ראשונה בארכיון הזה לא חלה בתאריך הזה.',
    upcomingTitle: 'בקרוב השבוע',
    inDays: days => (days === 1 ? 'מחר' : days === 2 ? 'בעוד יומיים' : `בעוד ${days} ימים`),
    firstUnavailable: 'תאריכי ההאזנה הראשונה עדיין אינם חלק מהארכיון הזה.',
    firstUnavailableBody: 'מוזיאונים שמייבאים בדפדפן הזה מחשבים אותם באופן מקומי. התערוכה הציבורית תציג אותם אחרי שתמונת המצב שלה תקומפל מחדש והתאריכים המדויקים ייבדקו.',
    loopsTitle: 'שיאי חזרה ביום זה',
    loopsBody: 'לופים של יום אחד מתוך 50 המובילים שנבחרו בארכיון, שחלו בתאריך הזה.',
    loopCount: count => `${count}× ביום אחד`,
    noLoops: 'אף אחד משיאי החזרה שנבחרו לא חל בתאריך הזה.',
    method: {
      eyebrow: 'שיטה',
      title: 'איך היום הזה נקרא',
      subtitle: 'שלוש שכבות, ולכל אחת סוג ראיות משלה.',
      observedPeriod: 'התקופה הנצפית',
      firstListenNames: 'אמנים עם האזנה ראשונה',
      points: [
        { title: 'השמעות לפי שנה', tag: 'נצפה', body: 'נספרות מההשמעות ברמת היום, לפי לוח השנה המקומי שבו הארכיון קומפל.' },
        { title: 'האזנות ראשונות', tag: 'נגזר', body: 'ההשמעה הראשונה שנספרה לכל שם אמן מדויק. היא אינה רואה האזנה שקדמה לתחילת הארכיון, וגרסאות שונות של שם אינן מאוחדות.' },
        { title: 'שיאי חזרה', tag: 'נצפה', body: 'נבדקים רק 50 הלופים של יום אחד שנבחרו בארכיון, ולכן גם בתאריך שקט עשויים להיות לופים קטנים יותר.' },
      ],
    },
  },
};

// Hue lives only in the border and the dot; the label keeps the remapped gray
// ink so the badge clears AA contrast in light themes too.
const EVIDENCE_CLASSES: Record<Evidence, { border: string; dot: string }> = {
  observed: { border: 'border-emerald-400/40', dot: 'bg-emerald-400' },
  derived: { border: 'border-sky-400/40', dot: 'bg-sky-400' },
  unavailable: { border: 'border-white/10', dot: 'bg-gray-500' },
};

function EvidenceBadge({ kind, label }: { kind: Evidence; label: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-gray-200 ${EVIDENCE_CLASSES[kind].border}`}
      data-evidence={kind}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${EVIDENCE_CLASSES[kind].dot}`} />
      {label}
    </span>
  );
}

export default function OnThisDay({ data, now }: OnThisDayProps) {
  const { lang, setActiveTab, setSelectedArtistName } = useApp();
  const copy = pickLanguage(lang, ROOM_COPY);
  const locale = localeFor(lang);
  const formatNumber = (value: number) => Math.round(value).toLocaleString(locale);

  // Read the clock once per mount so a re-render never moves "today".
  const [clock] = useState(() => now ?? new Date());
  const today = useMemo(() => calendarDayOf(clock), [clock]);
  const referenceYear = clock.getFullYear();
  const [selectedDay, setSelectedDay] = useState<CalendarDay>(today);
  const isToday = selectedDay.month === today.month && selectedDay.day === today.day;

  const observedFrom = data.snapshot_freshness?.observedFrom ?? null;
  const observedThrough = data.snapshot_freshness?.observedThrough ?? null;
  const hasFirstListens = Array.isArray(data.artist_first_listens);

  const years = useMemo(
    () => playsOnThisDayByYear(data.daily_plays, selectedDay, observedFrom, observedThrough),
    [data.daily_plays, selectedDay, observedFrom, observedThrough],
  );
  const firstListens = useMemo(
    () => firstListensOnThisDay(data.artist_first_listens, selectedDay, observedFrom),
    [data.artist_first_listens, selectedDay, observedFrom],
  );
  const upcoming = useMemo(
    () => (firstListens.length === 0 ? upcomingFirstListens(data.artist_first_listens, selectedDay, observedFrom) : []),
    [firstListens.length, data.artist_first_listens, selectedDay, observedFrom],
  );
  const loops = useMemo(() => obsessionsOnThisDay(data.obsessions, selectedDay), [data.obsessions, selectedDay]);

  const totalPlays = years.reduce((sum, row) => sum + row.plays, 0);
  const maxPlays = years.reduce((max, row) => Math.max(max, row.plays), 0);
  const loudest = maxPlays > 0 ? years.find(row => row.plays === maxPlays) : undefined;
  const dayLabel = formatCalendarDay(selectedDay, locale);

  const step = (delta: number) => {
    playMuseumSound('navigate');
    setSelectedDay(current => shiftCalendarDay(current, delta));
  };

  const openArtist = (name: string) => {
    playMuseumSound('open');
    setSelectedArtistName(name);
    setActiveTab('artist');
  };

  return (
    <div className="space-y-8 animate-fade-in" dir={directionFor(lang)} data-testid="on-this-day-room">
      <Surface
        as="section"
        variant="featured"
        className="relative isolate overflow-hidden rounded-[2rem] p-5 sm:p-7"
        aria-labelledby="on-this-day-title"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="type-kicker type-muted inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-sky-400" aria-hidden="true" />
              {copy.eyebrow}
            </p>
            <h2 id="on-this-day-title" className="mt-3 text-4xl font-black leading-none tracking-[-0.04em] text-white sm:text-5xl">
              {dayLabel}
            </h2>
            <p className="type-body type-muted mt-4">{copy.intro}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={copy.eyebrow}>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={copy.previousDay}
              className="nova-surface--interactive inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-black text-white"
            >
              <ChevronLeft className="nova-mirror-rtl h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDay(today)}
              disabled={isToday}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-sky-400/40 bg-sky-400/10 px-4 text-sm font-black text-white disabled:cursor-default"
            >
              {copy.today}
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={copy.nextDay}
              className="nova-surface--interactive inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-black text-white"
            >
              <ChevronRight className="nova-mirror-rtl h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">{copy.showingDay(dayLabel)}</p>
      </Surface>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Surface as="section" className="rounded-3xl p-4 sm:p-6" aria-labelledby="on-this-day-years-title" data-testid="on-this-day-years">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 id="on-this-day-years-title" className="type-section type-strong">{copy.yearsTitle}</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-400">{copy.yearsBody}</p>
            </div>
            <EvidenceBadge kind={years.length ? 'observed' : 'unavailable'} label={copy.evidence[years.length ? 'observed' : 'unavailable']} />
          </div>

          {years.length === 0 ? (
            <p className="rounded-2xl border border-white/10 p-4 text-sm text-gray-300" role="status">{copy.yearsUnavailable}</p>
          ) : (
            <>
              <p className="mb-4 text-sm font-bold text-gray-200">
                {copy.totalAcrossYears(formatNumber(totalPlays), years.length)}
                {loudest ? <span className="text-gray-400"> · {copy.loudestYear(loudest.year)}</span> : null}
              </p>
              <ol className="space-y-2">
                {[...years].reverse().map(row => (
                  <li key={row.year} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                    <span className="nova-number-ltr font-mono font-black text-white" dir="ltr">{row.year}</span>
                    <span aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-white/5">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-sky-400 to-fuchsia-400 rtl:bg-gradient-to-l"
                        style={{ width: maxPlays > 0 ? `${Math.max(row.plays > 0 ? 4 : 0, (row.plays / maxPlays) * 100)}%` : '0%' }}
                      />
                    </span>
                    <span className="font-mono text-xs text-gray-300">
                      {row.plays > 0
                        ? <><bdi dir="ltr" className="nova-number-ltr">{formatNumber(row.plays)}</bdi> {copy.playsUnit}</>
                        : copy.silentDay}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Surface>

        <Surface as="section" className="rounded-3xl p-4 sm:p-6" aria-labelledby="on-this-day-first-title" data-testid="on-this-day-first-listens">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 id="on-this-day-first-title" className="type-section type-strong">{copy.firstTitle}</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-400">{copy.firstBody}</p>
            </div>
            <EvidenceBadge kind={hasFirstListens ? 'derived' : 'unavailable'} label={copy.evidence[hasFirstListens ? 'derived' : 'unavailable']} />
          </div>

          {!hasFirstListens ? (
            <div className="rounded-2xl border border-white/10 p-4" role="status">
              <p className="text-sm font-bold text-gray-200">{copy.firstUnavailable}</p>
              <p className="mt-2 text-xs leading-relaxed text-gray-400">{copy.firstUnavailableBody}</p>
            </div>
          ) : firstListens.length > 0 ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {firstListens.map(entry => (
                <li key={entry.name}>
                  <button
                    type="button"
                    onClick={() => openArtist(entry.name)}
                    aria-label={copy.openArtist(entry.name)}
                    className="nova-surface--interactive flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-start"
                  >
                    <ArtistAvatar name={entry.name} size={44} tooltip={false} decorative />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-white"><bdi dir="auto">{entry.name}</bdi></span>
                      <span className="mt-1 block text-xs text-gray-300">
                        {copy.firstPlayedIn(entry.year)} · {copy.yearsAgo(referenceYear - entry.year)}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-400">{copy.playsSince(formatNumber(entry.plays))}</span>
                      {entry.nearArchiveStart ? (
                        <span className="mt-1 block text-[11px] text-gray-300">
                          <span aria-hidden="true" className="me-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 align-middle" />
                          {copy.archiveStartNote}
                        </span>
                      ) : null}
                    </span>
                    <Map className="h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div>
              <p className="rounded-2xl border border-white/10 p-4 text-sm text-gray-300" role="status">{copy.noFirstToday}</p>
              {upcoming.length > 0 ? (
                <div className="mt-4">
                  <p className="type-kicker type-muted inline-flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                    {copy.upcomingTitle}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {upcoming.map(entry => (
                      <li key={`${entry.name}-${entry.first_date}`}>
                        <button
                          type="button"
                          onClick={() => openArtist(entry.name)}
                          aria-label={copy.openArtist(entry.name)}
                          className="nova-surface--interactive flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-start text-sm"
                        >
                          <span className="min-w-0 truncate font-bold text-white"><bdi dir="auto">{entry.name}</bdi></span>
                          <span className="shrink-0 text-xs text-gray-300">
                            {copy.inDays(entry.daysAhead)} · <bdi dir="ltr" className="nova-number-ltr">{entry.year}</bdi>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </Surface>
      </div>

      <Surface as="section" className="rounded-3xl p-4 sm:p-6" aria-labelledby="on-this-day-loops-title" data-testid="on-this-day-loops">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 id="on-this-day-loops-title" className="type-section type-strong inline-flex items-center gap-2">
              <Repeat className="h-4 w-4 text-fuchsia-300" aria-hidden="true" />
              {copy.loopsTitle}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-gray-400">{copy.loopsBody}</p>
          </div>
          <EvidenceBadge kind="observed" label={copy.evidence.observed} />
        </div>
        {loops.length === 0 ? (
          <p className="text-sm text-gray-300" role="status">{copy.noLoops}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {loops.map(loop => (
              <li key={`${loop.artist}-${loop.track}-${loop.date}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="truncate text-sm font-black text-white"><bdi dir="auto">{loop.track}</bdi></p>
                <p className="mt-1 truncate text-xs text-gray-300"><bdi dir="auto">{loop.artist}</bdi></p>
                <p className="mt-2 font-mono text-xs text-gray-300">
                  <bdi dir="ltr" className="nova-number-ltr">{loop.date.slice(0, 4)}</bdi> · {copy.loopCount(loop.count)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      <MethodologyPanel
        eyebrow={copy.method.eyebrow}
        title={copy.method.title}
        subtitle={copy.method.subtitle}
        accent="c2"
        stats={[
          {
            label: copy.method.observedPeriod,
            value: observedFrom && observedThrough ? `${observedFrom} — ${observedThrough}` : copy.evidence.unavailable,
          },
          {
            label: copy.method.firstListenNames,
            value: hasFirstListens ? formatNumber(data.artist_first_listens?.length ?? 0) : copy.evidence.unavailable,
          },
        ]}
        points={copy.method.points}
      />
    </div>
  );
}
