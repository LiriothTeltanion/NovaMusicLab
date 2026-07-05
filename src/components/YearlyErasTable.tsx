import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Table2 } from 'lucide-react';
import { YearlyEra } from '../types';
import { useApp } from '../context/AppContext';
import ArtistAvatar from './ArtistAvatar';
import { buildArtistMoodProfile, EMOTIONAL_MOOD_TAXONOMY } from '../engines/emotionalEngine';

type SortKey = 'year' | 'plays' | 'unique_artists' | 'unique_tracks' | 'diversity_index';

interface YearlyErasTableProps {
  eras: YearlyEra[];
  selectedYear?: number;
  onSelectYear?: (year: number) => void;
}

/**
 * Interactive yearly-eras table: every column sorts on click, numeric cells
 * carry inline proportion bars, column maxima glow in the theme accent, and
 * clicking a row feeds that year into the monthly-breakdown chart above it.
 */
export default function YearlyErasTable({ eras, selectedYear, onSelectYear }: YearlyErasTableProps) {
  const { tc, t, lang } = useApp();
  const copy = t.statsDeepDive;
  const [sortKey, setSortKey] = useState<SortKey>('year');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  const fmt = (n: number) => Math.round(n).toLocaleString(locale);

  const moodColors = useMemo(() => {
    const map = new Map<string, string>();
    eras.forEach(era => {
      if (!map.has(era.top_artist)) {
        const profile = buildArtistMoodProfile({ name: era.top_artist, plays: era.plays, genre: '', country: '' });
        map.set(era.top_artist, EMOTIONAL_MOOD_TAXONOMY[profile.moodKey].color);
      }
    });
    return map;
  }, [eras]);

  const maxima = useMemo(() => ({
    year: Math.max(...eras.map(e => e.year), 0),
    plays: Math.max(...eras.map(e => e.plays), 0),
    unique_artists: Math.max(...eras.map(e => e.unique_artists), 0),
    unique_tracks: Math.max(...eras.map(e => e.unique_tracks), 0),
    diversity_index: Math.max(...eras.map(e => e.diversity_index), 0),
  }), [eras]);

  const sorted = useMemo(() => {
    const arr = [...eras].sort((a, b) => a[sortKey] - b[sortKey]);
    return sortDir === 'asc' ? arr : arr.reverse();
  }, [eras, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'year' ? 'asc' : 'desc');
    }
  };

  const numericColumns: Array<{ key: SortKey; label: string }> = [
    { key: 'year', label: copy.erasTableYear },
    { key: 'plays', label: copy.erasTablePlays },
    { key: 'unique_artists', label: copy.erasTableArtists },
    { key: 'unique_tracks', label: copy.erasTableTracks },
    { key: 'diversity_index', label: copy.erasTableDiversity },
  ];

  if (!eras.length) return null;

  return (
    <div className="glass-panel p-6 rounded-3xl">
      <div className="flex items-center gap-3 mb-1">
        <Table2 className="w-5 h-5" style={{ color: tc.c1 }} />
        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest">
          {copy.erasTableTitle}
        </h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">{copy.erasTableHint}</p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate" style={{ borderSpacing: '0 6px' }}>
          <thead>
            <tr>
              {numericColumns.map(col => {
                const active = sortKey === col.key;
                const Arrow = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th key={col.key} className="px-3 pb-1 text-left" aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button
                      onClick={() => toggleSort(col.key)}
                      aria-label={copy.erasTableSortAria(col.label)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-mono font-black uppercase tracking-widest transition-colors hover:text-white"
                      style={{ color: active ? tc.c1 : '#6b7280' }}
                    >
                      {col.label}
                      <Arrow className="h-3 w-3" style={{ opacity: active ? 1 : 0.45 }} />
                    </button>
                  </th>
                );
              })}
              <th className="px-3 pb-1 text-left">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-gray-500">
                  {copy.erasTableTopArtist}
                </span>
              </th>
              <th className="px-3 pb-1 text-left">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-gray-500">
                  {copy.erasTableDaypart}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(era => {
              const isSelected = era.year === selectedYear;
              const moodColor = moodColors.get(era.top_artist) ?? tc.c1;
              const playsPct = maxima.plays ? (era.plays / maxima.plays) * 100 : 0;
              return (
                <tr
                  key={era.year}
                  onClick={() => onSelectYear?.(era.year)}
                  aria-label={copy.erasTableRowAria(era.year)}
                  className={`group ${onSelectYear ? 'cursor-pointer' : ''}`}
                >
                  <td className="rounded-l-xl border-y border-l px-3 py-2.5 transition-colors"
                    style={{
                      borderColor: isSelected ? `${tc.c1}45` : 'rgba(255,255,255,0.06)',
                      backgroundColor: isSelected ? `${tc.c1}10` : 'rgba(255,255,255,0.02)',
                    }}>
                    <span className="font-mono text-sm font-black" style={{ color: isSelected ? tc.c1 : '#fff' }}>
                      {era.year}
                    </span>
                  </td>
                  <td className="border-y px-3 py-2.5"
                    style={{
                      borderColor: isSelected ? `${tc.c1}45` : 'rgba(255,255,255,0.06)',
                      backgroundColor: isSelected ? `${tc.c1}10` : 'rgba(255,255,255,0.02)',
                    }}>
                    <div className="min-w-[120px]">
                      <span className="font-mono text-xs font-bold"
                        style={{ color: era.plays === maxima.plays ? tc.c1 : '#e5e7eb' }}>
                        {fmt(era.plays)}
                      </span>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/8">
                        <div className="h-full rounded-full"
                          style={{ width: `${playsPct}%`, background: `linear-gradient(90deg, ${tc.c1}70, ${tc.c1})` }} />
                      </div>
                    </div>
                  </td>
                  {(['unique_artists', 'unique_tracks', 'diversity_index'] as const).map(key => (
                    <td key={key} className="border-y px-3 py-2.5"
                      style={{
                        borderColor: isSelected ? `${tc.c1}45` : 'rgba(255,255,255,0.06)',
                        backgroundColor: isSelected ? `${tc.c1}10` : 'rgba(255,255,255,0.02)',
                      }}>
                      <span className="font-mono text-xs font-bold"
                        style={{ color: era[key] === maxima[key] ? tc.c1 : '#9ca3af' }}>
                        {key === 'diversity_index' ? era[key].toFixed(1) : fmt(era[key])}
                      </span>
                    </td>
                  ))}
                  <td className="border-y px-3 py-2.5"
                    style={{
                      borderColor: isSelected ? `${tc.c1}45` : 'rgba(255,255,255,0.06)',
                      backgroundColor: isSelected ? `${tc.c1}10` : 'rgba(255,255,255,0.02)',
                    }}>
                    <span className="flex items-center gap-2 min-w-0">
                      <ArtistAvatar name={era.top_artist} size={24} tooltip={false} />
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: moodColor, boxShadow: `0 0 6px ${moodColor}` }} />
                      <span className="truncate text-xs font-bold text-white max-w-[160px]">{era.top_artist}</span>
                    </span>
                  </td>
                  <td className="rounded-r-xl border-y border-r px-3 py-2.5"
                    style={{
                      borderColor: isSelected ? `${tc.c1}45` : 'rgba(255,255,255,0.06)',
                      backgroundColor: isSelected ? `${tc.c1}10` : 'rgba(255,255,255,0.02)',
                    }}>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-gray-400">
                      {era.dominant_daypart}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
