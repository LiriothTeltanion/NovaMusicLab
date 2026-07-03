import React from 'react';
import { Moon, Flame, Sun, Activity, Heart, Shield, Orbit, Sparkles, type LucideIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EMOTIONAL_MOOD_TAXONOMY, type EmotionalMoodKey } from '../engines/emotionalEngine';

/**
 * Single source of truth for mood-icon rendering across the app
 * (Emotional Map, Top Histórico dossiers, and any future mood surface).
 * Keys match EmotionalMoodTaxonomyItem['icon'] exactly.
 */
export const MOOD_ICONS: Record<string, LucideIcon> = {
  moon: Moon,
  flame: Flame,
  sun: Sun,
  activity: Activity,
  heart: Heart,
  shield: Shield,
  orbit: Orbit,
  sparkles: Sparkles,
};

interface MoodBadgeProps {
  moodKey: EmotionalMoodKey;
  /** 0-100; renders a confidence percentage when provided. */
  confidence?: number;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Bilingual mood identity pill driven by the emotional engine taxonomy:
 * mood icon + short label (+ optional confidence %), tinted with the
 * mood's canonical color so the same emotion always looks the same
 * everywhere in the app.
 */
export default function MoodBadge({ moodKey, confidence, size = 'md', className = '' }: MoodBadgeProps) {
  const { lang } = useApp();
  const mood = EMOTIONAL_MOOD_TAXONOMY[moodKey];
  if (!mood) return null;
  const Icon = MOOD_ICONS[mood.icon] ?? Sparkles;
  const compact = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono font-black uppercase tracking-widest ${compact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'} ${className}`}
      style={{
        color: mood.color,
        backgroundColor: `${mood.color}16`,
        border: `1px solid ${mood.color}40`,
        boxShadow: `0 0 12px ${mood.color}22`,
      }}
      title={mood.description[lang]}
    >
      <Icon style={{ width: compact ? 11 : 13, height: compact ? 11 : 13 }} />
      {mood.shortLabel[lang]}
      {typeof confidence === 'number' && (
        <span className="opacity-75 font-bold">{Math.round(confidence)}%</span>
      )}
    </span>
  );
}
