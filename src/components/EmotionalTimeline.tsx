import React, { useMemo } from 'react';
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

  const formatNum = (value: number) => value.toLocaleString(lang === 'en' ? 'en-US' : 'es-ES');
  const firstYear = yearMoods[0].era.year;
  const lastYear = yearMoods[yearMoods.length - 1].era.year;

  return (
    <section className="glass-panel p-5 md:p-6 rounded-3xl border border-white/10 space-y-6">
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
        <div className="mt-1.5 flex justify-between px-1">
          {yearMoods.map(ym => (
            <span key={ym.era.year} className="text-[9px] font-mono font-bold text-gray-500">
              {ym.era.year}
            </span>
          ))}
        </div>
      </div>

      {/* Year cards */}
      <div className="grid grid-flow-col auto-cols-[minmax(200px,1fr)] gap-3 overflow-x-auto pb-2">
        {yearMoods.map(({ era, mood, profile }) => (
          <article
            key={era.year}
            className="rounded-2xl border bg-white/[0.035] p-4 transition-transform hover:scale-[1.02]"
            style={{ borderColor: `${mood.color}30`, boxShadow: `0 0 18px ${mood.color}12` }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xl font-black font-mono" style={{ color: mood.color }}>{era.year}</span>
              <MoodBadge moodKey={profile.moodKey} size="sm" />
            </div>
            <p className="mt-2 text-[11px] font-bold text-white leading-snug">{era.era_label}</p>
            <div className="mt-3 flex items-center gap-2">
              <ArtistAvatar name={era.top_artist} size={30} />
              <div className="min-w-0">
                <p className="text-[9px] font-mono uppercase tracking-widest text-gray-500">{copy.yearArtistLabel}</p>
                <p className="truncate text-xs font-bold text-white">{era.top_artist}</p>
              </div>
            </div>
            <p className="mt-2 text-[10px] font-mono text-gray-500">{copy.playsLabel(formatNum(era.plays))}</p>
          </article>
        ))}
      </div>

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
