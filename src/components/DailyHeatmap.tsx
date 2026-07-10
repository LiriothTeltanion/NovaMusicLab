import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import { randomFromString } from '../utils/seededRandom';

interface DailyHeatmapProps {
  data: MusicDnaData;
}

interface HoverState {
  dateStr: string;
  plays: number;
  x: number;
  y: number;
}

export default function DailyHeatmap({ data }: DailyHeatmapProps) {
  const { lang, tc } = useApp();
  const L = lang === 'en';
  const locale = L ? 'en-US' : 'es-ES';

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

  // Compute or fallback daily plays for the selected year
  const dailyPlaysForYear = useMemo(() => {
    const yearPlays = data.daily_plays || {};
    
    // Check if the dataset already contains daily_plays for the selected year
    const hasRealDataForYear = Object.keys(yearPlays).some(k => k.startsWith(`${selectedYear}-`));
    
    if (hasRealDataForYear) {
      return yearPlays;
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
      const dateStr = d.toISOString().split('T')[0];
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
  }, [data.daily_plays, data.monthly_activity, data.records, data.yearly_eras, selectedYear]);

  // Construct weeks matrix (53 columns x 7 days) starting from Monday
  const gridData = useMemo(() => {
    const columns: Array<Array<{ date: Date; dateStr: string; plays: number }>> = [];
    
    const yearStart = new Date(selectedYear, 0, 1);
    // Find the Monday of the starting week (might be in previous year)
    const dayOffset = yearStart.getDay() === 0 ? 6 : yearStart.getDay() - 1;
    const current = new Date(selectedYear, 0, 1 - dayOffset);

    // Render 53 weeks to cover the calendar year
    for (let w = 0; w < 53; w++) {
      const week: Array<{ date: Date; dateStr: string; plays: number }> = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = current.toISOString().split('T')[0];
        const plays = dailyPlaysForYear[dateStr] || 0;
        
        // Only include if date falls in selected year (or we render empty cells for padding)
        const isCurrentYear = current.getFullYear() === selectedYear;

        week.push({
          date: new Date(current),
          dateStr,
          plays: isCurrentYear ? plays : 0,
        });
        current.setDate(current.getDate() + 1);
      }
      columns.push(week);
    }
    return columns;
  }, [selectedYear, dailyPlaysForYear]);

  const maxYearPlays = useMemo(() => {
    return Math.max(...Object.values(dailyPlaysForYear), 1);
  }, [dailyPlaysForYear]);

  // Get color based on play density
  const getCellColor = (plays: number) => {
    if (plays === 0) return 'rgba(255, 255, 255, 0.03)';
    
    const pct = plays / maxYearPlays;
    if (pct < 0.15) return `${tc.c1}26`; // 15% opacity c1
    if (pct < 0.4) return `${tc.c1}55`;  // 35% opacity c1
    if (pct < 0.7) return `${tc.c1}90`;  // 70% opacity c1
    return tc.c1;                        // Full opacity
  };

  const handleCellHover = (e: React.MouseEvent, dateStr: string, plays: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Position tooltip above the cell
    setHoveredCell({
      dateStr,
      plays,
      x: rect.left + window.scrollX + rect.width / 2,
      y: rect.top + window.scrollY - 8,
    });
  };

  const shiftYear = (dir: 'prev' | 'next') => {
    const idx = availableYears.indexOf(selectedYear);
    if (dir === 'prev' && idx < availableYears.length - 1) {
      setSelectedYear(availableYears[idx + 1]);
    } else if (dir === 'next' && idx > 0) {
      setSelectedYear(availableYears[idx - 1]);
    }
  };

  const monthLabels = L
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const weekdayLabels = L
    ? ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']
    : ['Lun', '', 'Mié', '', 'Vie', '', 'Dom'];

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-cyberCyan/5 blur-[60px] rounded-full pointer-events-none" />
      
      {/* Header & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-cyberCyan" />
          <div>
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest">
              {L ? 'Interactive Daily Heatmap' : 'Mapa de Actividad Diaria'}
            </h3>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
              {L ? 'Visualize listening density across 365 days' : 'Visualiza la densidad de escucha a lo largo de 365 días'}
            </p>
          </div>
        </div>

        {/* Year Toggle */}
        <div className="flex items-center space-x-2 bg-black/40 border border-white/10 rounded-2xl p-1 w-fit self-start sm:self-auto z-10">
          <button
            onClick={() => shiftYear('prev')}
            disabled={selectedYear === availableYears[availableYears.length - 1]}
            aria-label={L ? 'Previous year' : 'Año anterior'}
            className="p-1.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-black text-white px-3 min-w-[50px] text-center">
            {selectedYear}
          </span>
          <button
            onClick={() => shiftYear('next')}
            disabled={selectedYear === availableYears[0]}
            aria-label={L ? 'Next year' : 'Año siguiente'}
            className="p-1.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="relative">
        {/* Scroll wrapper to prevent layout breaking on small devices */}
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 pb-3">
          <div className="flex gap-3 min-w-[760px] select-none font-mono">
            {/* Weekday Row Labels */}
            <div className="flex flex-col justify-between text-[9px] text-gray-500 pt-5 pb-1 select-none w-7 shrink-0 text-left">
              {weekdayLabels.map((label, idx) => (
                <span key={idx} className="h-2.5 flex items-center leading-none">
                  {label}
                </span>
              ))}
            </div>

            {/* Grid Columns */}
            <div className="flex-1 flex flex-col space-y-1">
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

              {/* Day cells matrix */}
              <div className="flex gap-1">
                {gridData.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-1 shrink-0">
                    {week.map((cell, dIdx) => {
                      const isTargetYear = cell.date.getFullYear() === selectedYear;
                      const isHighGlow = isTargetYear && cell.plays > 0 && (cell.plays / maxYearPlays) > 0.78;

                      return (
                        <div
                          key={dIdx}
                          onMouseEnter={(e) => isTargetYear && handleCellHover(e, cell.dateStr, cell.plays)}
                          onMouseLeave={() => setHoveredCell(null)}
                          className="w-2.5 h-2.5 rounded-[2px] transition-all cursor-crosshair hover:scale-125 hover:z-10"
                          style={{
                            backgroundColor: isTargetYear ? getCellColor(cell.plays) : 'transparent',
                            boxShadow: isHighGlow ? `0 0 7px ${tc.c1}bb` : 'none',
                            border: isHighGlow ? `1px solid rgba(255,255,255,0.4)` : 'none',
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

        {/* Floating Tooltip Portal */}
        <AnimatePresence>
          {hoveredCell && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute pointer-events-none z-50 px-3 py-2 rounded-xl text-[10px] font-mono shadow-cyber border border-cyberCyan/30 bg-[#070e1c]"
              style={{
                left: hoveredCell.x - window.scrollX,
                top: hoveredCell.y - window.scrollY,
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
                {hoveredCell.plays.toLocaleString(locale)}{' '}
                <span className="text-gray-400 font-normal">
                  {hoveredCell.plays === 1 ? (L ? 'play' : 'escucha') : (L ? 'plays' : 'escuchas')}
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
            {!data.daily_plays ? (L ? 'Displaying seeded estimates' : 'Mostrando estimación seeded') : (L ? 'Direct database scrobbles' : 'Scrobbles directos de base de datos')}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <span>{L ? 'Less' : 'Menos'}</span>
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }} />
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: `${tc.c1}26` }} />
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: `${tc.c1}55` }} />
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: `${tc.c1}90` }} />
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: tc.c1 }} />
          <span>{L ? 'More' : 'Más'}</span>
        </div>
      </div>
    </div>
  );
}
