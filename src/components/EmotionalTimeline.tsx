import React, { useMemo, useState } from 'react';
import { Hourglass, Waves, BookOpen } from 'lucide-react';
import { MusicDnaData, TopArtist } from '../types';
import { useApp } from '../context/AppContext';
import {
  buildArtistMoodProfile,
  EMOTIONAL_MOOD_TAXONOMY,
  type EmotionalMoodKey,
} from '../engines/emotionalEngine';
import ArtistAvatar from './ArtistAvatar';
import MoodBadge, { MOOD_ICONS } from './MoodBadge';
import { directionFor, localeFor } from '../utils/i18n';

interface EmotionalTimelineProps {
  data: MusicDnaData;
}

/**
 * Year-by-year emotional climate: each year is tinted with the mood the
 * engine assigns to that year's dominant artist. yearly_eras only records one
 * top artist per year, so this is an honest single-signal reading — a mood
 * river, not a fake per-play distribution.
 */
export default function EmotionalTimeline({ data }: EmotionalTimelineProps) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const { tc, t, lang } = useApp();
  const copy = t.emotionalTimeline;

  const yearMoods = useMemo(() => {
    const artistIndex = new Map(data.top_artists.map(a => [a.name.toLowerCase(), a]));
    return [...data.yearly_eras]
      .sort((a, b) => a.year - b.year)
      .map(era => {
        const known = artistIndex.get(era.top_artist.toLowerCase());
        const artist: TopArtist = known ?? { name: era.top_artist, plays: era.plays, genre: '', country: '' };
        const profile = buildArtistMoodProfile(artist);
        return { era, profile, mood: EMOTIONAL_MOOD_TAXONOMY[profile.moodKey] };
      });
  }, [data.yearly_eras, data.top_artists]);

  const riverGradient = useMemo(() => {
    if (!yearMoods.length) return 'transparent';
    const stops = yearMoods.map((ym, i) => {
      const pct = yearMoods.length === 1 ? 50 : (i / (yearMoods.length - 1)) * 100;
      return `${ym.mood.color} ${pct.toFixed(1)}%`;
    });
    return `linear-gradient(90deg, ${stops.join(', ')})`;
  }, [yearMoods]);

  const summary = useMemo(() => {
    const counts = new Map<EmotionalMoodKey, number>();
    let transitions = 0;
    yearMoods.forEach((ym, i) => {
      counts.set(ym.profile.moodKey, (counts.get(ym.profile.moodKey) ?? 0) + 1);
      if (i > 0 && yearMoods[i - 1].profile.moodKey !== ym.profile.moodKey) transitions += 1;
    });
    const moodsPresent = [...counts.entries()]
      .map(([key, years]) => ({ mood: EMOTIONAL_MOOD_TAXONOMY[key], years }))
      .sort((a, b) => b.years - a.years);
    return { moodsPresent, dominant: moodsPresent[0], transitions };
  }, [yearMoods]);

  if (!yearMoods.length) return null;

  const formatNum = (value: number) => value.toLocaleString(localeFor(lang));
  const firstYear = yearMoods[0].era.year;
  const lastYear = yearMoods[yearMoods.length - 1].era.year;
  const selected = yearMoods.find(item => item.era.year === selectedYear) ?? yearMoods[yearMoods.length - 1];

  return (
    <section data-testid="emotional-timeline" className="glass-panel min-w-0 overflow-hidden rounded-3xl border border-white/10 p-5 md:p-6 space-y-6" dir={directionFor(lang)}>
      <div>
        <p className="text-[10px] font-mono font-black uppercase tracking-[0.22em]" style={{ color: tc.c2 }}>
          {copy.eyebrow}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <Hourglass className="w-5 h-5" style={{ color: tc.c2 }} />
          <h3 className="text-lg font-black text-white uppercase tracking-wider font-mono">
            {copy.title}
          </h3>
        </div>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-gray-400">{copy.intro}</p>
      </div>

      {/* Mood river */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Waves className="w-4 h-4" style={{ color: tc.c1 }} />
          <span className="text-[10px] font-mono font-black uppercase tracking-widest" style={{ color: tc.c1 }}>
            {copy.riverLabel}
          </span>
        </div>
        <div
          className="h-14 rounded-2xl border border-white/10"
          style={{ background: riverGradient, boxShadow: `0 0 32px ${summary.dominant.mood.color}30 inset, 0 0 24px ${summary.dominant.mood.color}18` }}
        />
        <div className="mt-1.5 flex justify-between px-1 text-[9px] font-mono font-bold text-gray-500" dir="ltr">
          <span>{firstYear}</span>
          <span>{lastYear}</span>
        </div>
      </div>

      {/* Compact year nodes: the selected year owns the single detailed card. */}
      <div
        data-testid="emotional-timeline-track"
        className="grid grid-cols-[repeat(auto-fit,minmax(4.5rem,1fr))] gap-2"
        role="group"
        aria-label={copy.title}
        dir="ltr"
      >
        {yearMoods.map(({ era, mood, profile }) => (
          <button
            key={era.year}
            type="button"
            data-year={era.year}
            aria-pressed={selected.era.year === era.year}
            aria-label={`${era.year} · ${era.top_artist} · ${mood.shortLabel[lang]}`}
            onClick={() => setSelectedYear(era.year)}
            className="nova-on-dark flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center transition-colors"
            style={{
              color: selected.era.year === era.year ? mood.color : '#94a3b8',
              borderColor: `${mood.color}${selected.era.year === era.year ? '70' : '28'}`,
              backgroundColor: selected.era.year === era.year ? `${mood.color}16` : 'rgba(255,255,255,0.025)',
              boxShadow: selected.era.year === era.year ? `0 0 18px ${mood.color}20` : undefined,
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: mood.color }} aria-hidden="true" />
            <span className="text-xs font-black font-mono">{era.year}</span>
            <span className="sr-only">{profile.moodKey}</span>
          </button>
        ))}
      </div>

      <article
        data-testid="emotional-timeline-detail"
        data-selected-year={selected.era.year}
        className="rounded-2xl border bg-black/20 p-4"
        style={{ borderColor: `${selected.mood.color}35`, boxShadow: `0 0 24px ${selected.mood.color}10 inset` }}
        aria-live="polite"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <ArtistAvatar name={selected.era.top_artist} size={42} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xl font-black font-mono" style={{ color: selected.mood.color }}>{selected.era.year}</span>
                <MoodBadge moodKey={selected.profile.moodKey} size="sm" />
              </div>
              <p className="mt-1 break-words text-sm font-black text-white"><bdi dir="auto">{selected.era.era_label}</bdi></p>
            </div>
          </div>
          <div className="min-w-0 sm:text-end">
            <p className="text-[9px] font-mono uppercase tracking-widest text-gray-500">{copy.yearArtistLabel}</p>
            <p className="mt-1 break-words text-xs font-bold text-white"><bdi dir="auto">{selected.era.top_artist}</bdi></p>
            <p className="mt-1 text-[10px] font-mono text-gray-500">{copy.playsLabel(formatNum(selected.era.plays))}</p>
          </div>
        </div>
      </article>

      {/* Journey reading */}
      <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4" style={{ color: tc.c3 }} />
          <h4 className="text-[11px] font-mono uppercase tracking-widest font-black" style={{ color: tc.c3 }}>
            {copy.summaryTitle}
          </h4>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {summary.moodsPresent.map(({ mood, years }) => {
            const Icon = MOOD_ICONS[mood.icon];
            return (
              <span
                key={mood.key}
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono font-black"
                style={{ color: mood.color, borderColor: `${mood.color}35`, backgroundColor: `${mood.color}10` }}
              >
                <Icon className="w-3 h-3" />
                {mood.shortLabel[lang]} · {years}
              </span>
            );
          })}
        </div>
        <div className="space-y-1.5 text-xs text-gray-400 leading-relaxed">
          <p>{copy.dominantMoodLine(summary.dominant.mood.shortLabel[lang], summary.dominant.years)}</p>
          <p>{copy.transitionsLine(summary.transitions)}</p>
          <p>{copy.spanLine(firstYear, lastYear)}</p>
        </div>
      </div>
    </section>
  );
}
