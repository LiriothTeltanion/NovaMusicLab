import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import { randomFromString } from '../utils/seededRandom';
import { deriveDatasetTemporalTrust, isDateObserved } from '../utils/dataTrust';
import { localeFor, pickLanguage, type Lang } from '../utils/i18n';

interface DailyHeatmapProps {
  data: MusicDnaData;
}

interface HoverState {
  dateStr: string;
  plays: number;
  x: number;
  y: number;
}

interface DailyHeatmapCopy {
  title: string;
  subtitle: string;
  ytd: string;
  observedThrough: (date: string) => string;
  previousYear: string;
  nextYear: string;
  gridAria: (year: number) => string;
  notObserved: string;
  instructions: string;
  previousDay: string;
  nextDay: string;
  chooseDate: string;
  playUnit: (plays: number) => string;
  seededEstimate: string;
  directData: string;
  less: string;
  more: string;
  monthLabels: string[];
  weekdayLabels: string[];
}

const DAILY_HEATMAP_COPY: Record<Lang, DailyHeatmapCopy> = {
  es: {
    title: 'Mapa de Actividad Diaria',
    subtitle: 'Visualiza la densidad de escucha a lo largo de 365 días',
    ytd: '⏳ YTD',
    observedThrough: date => `observado hasta ${date}`,
    previousYear: 'Año anterior',
    nextYear: 'Año siguiente',
    gridAria: year => `Actividad diaria de escucha de ${year}`,
    notObserved: 'No observado',
    instructions: 'Usa Flecha izquierda y derecha para moverte por semana, Flecha arriba y abajo para moverte por día, e Inicio o Fin para saltar al comienzo o final del año.',
    previousDay: 'Día anterior',
    nextDay: 'Día siguiente',
    chooseDate: 'Elegir una fecha',
    playUnit: plays => plays === 1 ? 'escucha' : 'escuchas',
    seededEstimate: 'Mostrando estimaciones calculadas',
    directData: 'Scrobbles directos de la base de datos',
    less: 'Menos',
    more: 'Más',
    monthLabels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    weekdayLabels: ['Lun', '', 'Mié', '', 'Vie', '', 'Dom'],
  },
  en: {
    title: 'Interactive Daily Heatmap',
    subtitle: 'Visualize listening density across 365 days',
    ytd: '⏳ YTD',
    observedThrough: date => `observed through ${date}`,
    previousYear: 'Previous year',
    nextYear: 'Next year',
    gridAria: year => `Daily listening activity for ${year}`,
    notObserved: 'Not observed',
    instructions: 'Use Left and Right Arrow to move by week, Up and Down Arrow to move by day, and Home or End to jump to the start or end of the year.',
    previousDay: 'Previous day',
    nextDay: 'Next day',
    chooseDate: 'Choose a date',
    playUnit: plays => plays === 1 ? 'play' : 'plays',
    seededEstimate: 'Displaying seeded estimates',
    directData: 'Direct database scrobbles',
    less: 'Less',
    more: 'More',
    monthLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdayLabels: ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'],
  },
  he: {
    title: 'מפת חום יומית אינטראקטיבית',
    subtitle: 'צפה בצפיפות ההאזנה לאורך 365 ימים',
    ytd: '⏳ מתחילת השנה',
    observedThrough: date => `נצפה עד ${date}`,
    previousYear: 'השנה הקודמת',
    nextYear: 'השנה הבאה',
    gridAria: year => `פעילות האזנה יומית בשנת ${year}`,
    notObserved: 'לא נצפה',
    instructions: 'השתמש בחצים שמאלה וימינה כדי לנוע שבוע בכל פעם, בחצים למעלה ולמטה כדי לנוע יום בכל פעם, ובמקשי Home או End כדי לקפוץ לתחילת השנה או לסופה.',
    previousDay: 'היום הקודם',
    nextDay: 'היום הבא',
    chooseDate: 'בחר תאריך',
    playUnit: plays => plays === 1 ? 'השמעה' : 'השמעות',
    seededEstimate: 'מוצגות הערכות מחושבות',
    directData: 'נתוני השמעות ישירים ממסד הנתונים',
    less: 'פחות',
    more: 'יותר',
    monthLabels: ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'],
    weekdayLabels: ['ב׳', '', 'ד׳', '', 'ו׳', '', 'א׳'],
  },
};

function localDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export default function DailyHeatmap({ data }: DailyHeatmapProps) {
  const { lang, tc } = useApp();
  const locale = localeFor(lang);
  const copy = pickLanguage(lang, DAILY_HEATMAP_COPY);
  const temporalTrust = useMemo(() => deriveDatasetTemporalTrust(data), [data]);

  // Get list of years with activity based on monthly_activity or eras
  const availableYears = useMemo(() => {
    if (data.yearly_eras?.length) {
      return data.yearly_eras.map(e => e.year).sort((a, b) => b - a);
    }
    // Fallback if eras are missing
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => currentYear - i);
  }, [data.yearly_eras]);

  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0] || new Date().getFullYear());
  const [hoveredCell, setHoveredCell] = useState<HoverState | null>(null);
  const [activeDateStr, setActiveDateStr] = useState(`${availableYears[0] || new Date().getFullYear()}-01-01`);
  const heatmapId = useId().replace(/:/g, '');
  const gridRef = useRef<HTMLDivElement>(null);
  const tooltipBoundaryRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());

  // Compute or fallback daily plays for the selected year
  const dailyPlaysForYear = useMemo(() => {
    const yearPlays = data.daily_plays || {};
    const yearEntries = Object.entries(yearPlays)
      .filter(([dateKey]) => dateKey.startsWith(`${selectedYear}-`));
    const hasRealDataForYear = yearEntries.length > 0;
    
    if (hasRealDataForYear) {
      return Object.fromEntries(yearEntries);
    }

    // Fallback: Generate realistic seeded daily plays using monthly activity and records
    const generated: Record<string, number> = {};
    const maxDayPlays = data.records?.max_day_plays || 180;
    
    // Find monthly counts for the selected year
    const monthlyMap = new Map<number, number>();
    if (data.monthly_activity) {
      data.monthly_activity.forEach(act => {
        if (act.year === selectedYear) {
          monthlyMap.set(act.month, act.plays);
        }
      });
    }

    // Default average plays if monthly stats are missing
    const defaultYearlyPlays = data.yearly_eras?.find(e => e.year === selectedYear)?.plays || 4000;
    const defaultMonthlyPlays = defaultYearlyPlays / 12;

    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = localDateKey(d);
      if (!isDateObserved(dateStr, temporalTrust)) continue;
      const month = d.getMonth();
      const dayOfWeek = d.getDay();
      
      const monthPlays = monthlyMap.has(month) ? (monthlyMap.get(month) || 0) : defaultMonthlyPlays;
      const avgDaily = monthPlays / 30;

      // Seeded random based on the date key to keep layout perfectly stable
      const rand = randomFromString(dateStr);
      let plays = Math.round(avgDaily * (0.25 + rand() * 1.5));
      
      // Give weekends a nice active bump
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        plays = Math.round(plays * 1.25);
      }

      // Add occasional obsession spike days (0.5% chance)
      if (rand() < 0.005) {
        plays = Math.round(plays * 3.5);
      }

      // Random offline zero days (12% chance)
      if (rand() < 0.12 || plays < 1) {
        plays = 0;
      }

      // Cap at maximum day record
      generated[dateStr] = Math.min(plays, maxDayPlays);
    }

    return generated;
  }, [data.daily_plays, data.monthly_activity, data.records, data.yearly_eras, selectedYear, temporalTrust]);

  // Construct weeks matrix (53 columns x 7 days) starting from Monday
  const gridData = useMemo(() => {
    const columns: Array<Array<{ date: Date; dateStr: string; plays: number; observed: boolean }>> = [];
    
    const yearStart = new Date(selectedYear, 0, 1);
    // Find the Monday of the starting week (might be in previous year)
    const dayOffset = yearStart.getDay() === 0 ? 6 : yearStart.getDay() - 1;
    const current = new Date(selectedYear, 0, 1 - dayOffset);

    // Render 53 weeks to cover the calendar year
    for (let w = 0; w < 53; w++) {
      const week: Array<{ date: Date; dateStr: string; plays: number; observed: boolean }> = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = localDateKey(current);
        // Only include if date falls in selected year (or we render empty cells for padding)
        const isCurrentYear = current.getFullYear() === selectedYear;
        const observed = isCurrentYear && isDateObserved(dateStr, temporalTrust);
        const plays = observed ? (dailyPlaysForYear[dateStr] ?? 0) : 0;

        week.push({
          date: new Date(current),
          dateStr,
          plays,
          observed,
        });
        current.setDate(current.getDate() + 1);
      }
      columns.push(week);
    }
    return columns;
  }, [selectedYear, dailyPlaysForYear, temporalTrust]);

  const maxYearPlays = useMemo(() => {
    return Math.max(...Object.values(dailyPlaysForYear), 1);
  }, [dailyPlaysForYear]);

  const activeDays = useMemo(
    () => gridData
      .flat()
      .filter(cell => cell.date.getFullYear() === selectedYear && cell.observed)
      .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [gridData, selectedYear],
  );

  const activeDayIndex = Math.max(0, activeDays.findIndex(cell => cell.dateStr === activeDateStr));
  const activeDay = activeDays[activeDayIndex] ?? null;

  useEffect(() => {
    setActiveDateStr(activeDays[0]?.dateStr ?? '');
    setHoveredCell(null);
  }, [activeDays]);

  // Get color based on play density
  const getCellColor = (plays: number) => {
    if (plays === 0) return 'rgba(255, 255, 255, 0.03)';
    
    const pct = plays / maxYearPlays;
    if (pct < 0.15) return `${tc.c1}26`; // 15% opacity c1
    if (pct < 0.4) return `${tc.c1}55`;  // 35% opacity c1
    if (pct < 0.7) return `${tc.c1}90`;  // 70% opacity c1
    return tc.c1;                        // Full opacity
  };

  const formatDayLabel = (dateStr: string, plays: number) => {
    const formattedDate = new Date(`${dateStr}T00:00:00`).toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return `${formattedDate}: ${plays.toLocaleString(locale)} ${copy.playUnit(plays)}`;
  };

  const showCellDetails = (target: HTMLElement, dateStr: string, plays: number) => {
    const rect = target.getBoundingClientRect();
    const boundaryRect = tooltipBoundaryRef.current?.getBoundingClientRect();
    if (!boundaryRect) return;
    // Position tooltip above the cell
    setHoveredCell({
      dateStr,
      plays,
      x: rect.left - boundaryRect.left + rect.width / 2,
      y: rect.top - boundaryRect.top - 8,
    });
  };

  const selectDayAtIndex = (index: number, reveal = true) => {
    if (!activeDays.length) return;
    const nextIndex = Math.min(Math.max(index, 0), activeDays.length - 1);
    const nextDay = activeDays[nextIndex];
    setActiveDateStr(nextDay.dateStr);

    const target = cellRefs.current.get(nextDay.dateStr);
    if (!target) return;
    if (reveal && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };

  const handleGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    let nextIndex: number | null = null;
    switch (event.key) {
      case 'ArrowLeft':
        nextIndex = activeDayIndex - 7;
        break;
      case 'ArrowRight':
        nextIndex = activeDayIndex + 7;
        break;
      case 'ArrowUp':
        nextIndex = activeDayIndex - 1;
        break;
      case 'ArrowDown':
        nextIndex = activeDayIndex + 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = activeDays.length - 1;
        break;
      case 'Enter':
      case ' ':
        nextIndex = activeDayIndex;
        break;
      default:
        return;
    }

    event.preventDefault();
    selectDayAtIndex(nextIndex);
  };

  const shiftYear = (dir: 'prev' | 'next') => {
    const idx = availableYears.indexOf(selectedYear);
    if (dir === 'prev' && idx < availableYears.length - 1) {
      setSelectedYear(availableYears[idx + 1]);
    } else if (dir === 'next' && idx > 0) {
      setSelectedYear(availableYears[idx - 1]);
    }
  };

  const monthLabels = copy.monthLabels;
  const weekdayLabels = copy.weekdayLabels;
  const selectedYearMin = temporalTrust.dataMinDate?.startsWith(`${selectedYear}-`)
    ? temporalTrust.dataMinDate
    : `${selectedYear}-01-01`;
  const selectedYearMax = temporalTrust.dataMaxDate?.startsWith(`${selectedYear}-`)
    ? temporalTrust.dataMaxDate
    : `${selectedYear}-12-31`;
  const observedThrough = temporalTrust.dataMaxDate
    ? new Date(`${temporalTrust.dataMaxDate}T12:00:00Z`).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-cyberCyan/5 blur-[60px] rounded-full pointer-events-none" />
      
      {/* Header & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-cyberCyan" />
          <div>
            <h3 className="text-sm font-mono font-bold text-[var(--fg)] uppercase tracking-widest">
              {copy.title}
            </h3>
            <p className="mt-0.5 text-[10px] font-mono text-[var(--type-ink-muted)]">
              {copy.subtitle}
            </p>
            {selectedYear === temporalTrust.latestYear && observedThrough && (
              <p className="mt-1 text-[9px] font-mono font-bold text-amber-300">
                {temporalTrust.latestPeriodStatus === 'ytd' ? copy.ytd : '⚠'} ·{' '}
                {copy.observedThrough(observedThrough)} ·{' '}
                {temporalTrust.analysisTimeZone}
              </p>
            )}
          </div>
        </div>

        {/* Year Toggle */}
        <div className="nova-data-ltr z-10 flex w-fit items-center gap-2 self-start rounded-2xl border border-[color-mix(in_srgb,var(--fg)_10%,transparent)] bg-[var(--glass-bg)] p-1 sm:self-auto" dir="ltr">
          <button
            type="button"
            onClick={() => shiftYear('prev')}
            disabled={selectedYear === availableYears[availableYears.length - 1]}
            aria-label={copy.previousYear}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[var(--type-ink-muted)] transition-all hover:bg-[color-mix(in_srgb,var(--fg)_5%,transparent)] hover:text-[var(--fg)] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="nova-number-ltr min-w-[50px] px-3 text-center text-xs font-mono font-black text-[var(--fg)]" dir="ltr">
            {selectedYear}
          </span>
          <button
            type="button"
            onClick={() => shiftYear('next')}
            disabled={selectedYear === availableYears[0]}
            aria-label={copy.nextYear}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[var(--type-ink-muted)] transition-all hover:bg-[color-mix(in_srgb,var(--fg)_5%,transparent)] hover:text-[var(--fg)] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div ref={tooltipBoundaryRef} className="relative">
        {/* Scroll wrapper to prevent layout breaking on small devices */}
        <div className="nova-data-ltr w-full overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 pb-3" dir="ltr">
          <div className="flex gap-3 min-w-[760px] select-none font-mono">
            {/* Weekday Row Labels */}
            <div className="flex flex-col justify-between text-[9px] text-gray-500 pt-5 pb-1 select-none w-7 shrink-0 text-left">
              {weekdayLabels.map((label, idx) => (
                <span key={idx} className="flex h-3 items-center leading-none">
                  {label}
                </span>
              ))}
            </div>

            {/* Grid Columns */}
            <div className="flex-1 flex flex-col gap-1">
              {/* Month Header Indicators */}
              <div className="h-4 flex text-[9px] text-gray-500 relative select-none">
                {monthLabels.map((m, idx) => {
                  // Approximate offset column for each month
                  const colIdx = Math.round((idx * 53) / 12);
                  return (
                    <span key={m} className="absolute" style={{ left: `${(colIdx / 53) * 100}%` }}>
                      {m}
                    </span>
                  );
                })}
              </div>

              {/* Day cells matrix: one tab stop, arrow-key navigation. */}
              <div
                ref={gridRef}
                role="grid"
                tabIndex={0}
                aria-label={copy.gridAria(selectedYear)}
                aria-describedby={`${heatmapId}-instructions ${heatmapId}-summary`}
                aria-activedescendant={activeDay ? `${heatmapId}-${activeDay.dateStr}` : undefined}
                onBlur={() => setHoveredCell(null)}
                onKeyDown={handleGridKeyDown}
                className="nova-data-ltr flex flex-col gap-0.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950"
                dir="ltr"
                style={{ '--tw-ring-color': tc.c1 } as React.CSSProperties}
              >
                {Array.from({ length: 7 }, (_, dayIndex) => (
                  <div key={dayIndex} role="row" className="flex gap-0.5">
                    {gridData.map((week, weekIndex) => {
                      const cell = week[dayIndex];
                      const isTargetYear = cell.date.getFullYear() === selectedYear;
                      const isHighGlow = cell.observed && cell.plays > 0 && (cell.plays / maxYearPlays) > 0.78;
                      const isActive = cell.observed && cell.dateStr === activeDay?.dateStr;

                      if (!isTargetYear || !cell.observed) {
                        const unobservedLabel = !isTargetYear
                          ? undefined
                          : `${new Date(`${cell.dateStr}T12:00:00Z`).toLocaleDateString(locale)}: ${copy.notObserved}`;
                        return (
                          <span
                            key={weekIndex}
                            role="gridcell"
                            aria-disabled="true"
                            aria-label={unobservedLabel}
                            data-observed={isTargetYear ? 'false' : undefined}
                            className={`h-3 w-3 shrink-0 rounded-[2px] ${isTargetYear ? 'border border-dashed border-white/10 bg-white/[0.015]' : ''}`}
                          />
                        );
                      }

                      return (
                        <button
                          key={weekIndex}
                          ref={(node) => {
                            if (node) cellRefs.current.set(cell.dateStr, node);
                            else cellRefs.current.delete(cell.dateStr);
                          }}
                          id={`${heatmapId}-${cell.dateStr}`}
                          type="button"
                          role="gridcell"
                          tabIndex={-1}
                          aria-label={formatDayLabel(cell.dateStr, cell.plays)}
                          aria-selected={isActive}
                          onMouseEnter={(event) => showCellDetails(event.currentTarget, cell.dateStr, cell.plays)}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => {
                            gridRef.current?.focus({ preventScroll: true });
                            setActiveDateStr(cell.dateStr);
                            setHoveredCell(null);
                          }}
                          className={`h-3 w-3 shrink-0 cursor-crosshair rounded-[2px] p-0 transition-all hover:z-10 hover:scale-125 ${isActive ? 'z-10 scale-125 ring-2 ring-white ring-offset-1 ring-offset-slate-950' : ''}`}
                          style={{
                            backgroundColor: getCellColor(cell.plays),
                            boxShadow: isHighGlow ? `0 0 7px ${tc.c1}bb` : 'none',
                            border: isHighGlow ? '1px solid rgba(255,255,255,0.4)' : 'none',
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p id={`${heatmapId}-instructions`} className="sr-only">
          {copy.instructions}
        </p>

        {activeDay && (
          <div className="nova-data-ltr mt-3 flex items-center justify-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--fg)_8%,transparent)] bg-[var(--glass-bg)] p-2" dir="ltr">
            <button
              type="button"
              onClick={() => selectDayAtIndex(activeDayIndex - 1)}
              disabled={activeDayIndex === 0}
              aria-label={copy.previousDay}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--fg)_10%,transparent)] text-[var(--type-ink-muted)] transition-colors hover:border-[color-mix(in_srgb,var(--fg)_25%,transparent)] hover:text-[var(--fg)] disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1 text-center font-mono">
              <label htmlFor={`${heatmapId}-date-picker`} className="sr-only">
                {copy.chooseDate}
              </label>
              <input
                id={`${heatmapId}-date-picker`}
                type="date"
                dir="ltr"
                min={selectedYearMin}
                max={selectedYearMax}
                value={activeDay.dateStr}
                onChange={(event) => {
                  const nextIndex = activeDays.findIndex(day => day.dateStr === event.target.value);
                  if (nextIndex >= 0) selectDayAtIndex(nextIndex, false);
                }}
                className="min-h-11 w-full rounded-xl border border-white/10 bg-[var(--glass-bg)] px-2 text-center text-xs font-bold text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2"
                style={{
                  colorScheme: tc.mode === 'light' ? 'light' : 'dark',
                  '--tw-ring-color': tc.c1,
                } as React.CSSProperties}
              />
              <div
                id={`${heatmapId}-summary`}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="mt-1 text-[10px]"
                dir="auto"
                style={{ color: tc.c1 }}
              >
                <bdi dir="ltr" className="nova-number-ltr">{activeDay.plays.toLocaleString(locale)}</bdi>{' '}
                {copy.playUnit(activeDay.plays)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => selectDayAtIndex(activeDayIndex + 1)}
              disabled={activeDayIndex === activeDays.length - 1}
              aria-label={copy.nextDay}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--fg)_10%,transparent)] text-[var(--type-ink-muted)] transition-colors hover:border-[color-mix(in_srgb,var(--fg)_25%,transparent)] hover:text-[var(--fg)] disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Floating Tooltip Portal */}
        <AnimatePresence>
          {hoveredCell && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute pointer-events-none z-50 px-3 py-2 rounded-xl text-[10px] font-mono shadow-cyber border border-cyberCyan/30 bg-[#070e1c]"
              dir="auto"
              style={{
                left: hoveredCell.x,
                top: hoveredCell.y,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <p className="text-white font-bold">
                {new Date(`${hoveredCell.dateStr}T00:00:00`).toLocaleDateString(locale, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <p className="mt-0.5 text-cyberCyan font-bold">
                <bdi dir="ltr" className="nova-number-ltr">{hoveredCell.plays.toLocaleString(locale)}</bdi>{' '}
                <span className="text-gray-400 font-normal">
                  {copy.playUnit(hoveredCell.plays)}
                </span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Legend */}
      <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>
            {!data.daily_plays ? copy.seededEstimate : copy.directData}
          </span>
        </div>
        <div className="nova-data-ltr flex items-center gap-1" dir="ltr">
          <span className="me-2 inline-flex items-center gap-1" dir="auto">
            <span className="h-2.5 w-2.5 rounded-[2px] border border-dashed border-white/15 bg-white/[0.015]" />
            {copy.notObserved}
          </span>
          <span dir="auto">{copy.less}</span>
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }} />
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: `${tc.c1}26` }} />
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: `${tc.c1}55` }} />
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: `${tc.c1}90` }} />
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: tc.c1 }} />
          <span dir="auto">{copy.more}</span>
        </div>
      </div>
    </div>
  );
}
