import React from 'react';
import GenreIcon from './GenreIcon';

interface GenreArtProps {
  genre: string;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

interface GenrePalette {
  from: string;
  via: string;
  to: string;
  pattern: 'bolt' | 'wave' | 'mist' | 'grid' | 'crack' | 'noise' | 'fractal' | 'tape' | 'drip' | 'orbit' | 'shield' | 'mic' | 'horns' | 'strings' | 'rainbow' | 'dots';
}

/**
 * Two-tone-per-genre gradient palettes, hand-picked to evoke each genre's
 * mood (e.g. Synthwave's magenta/cyan sunset, Death Metal's blood/black).
 * Fully offline - no external image sourcing, generated once here.
 */
const PALETTES: Record<string, GenrePalette> = {
  'Metalcore':              { from: '#7c2d12', via: '#ea580c', to: '#fbbf24', pattern: 'bolt' },
  'Post-Hardcore':          { from: '#083344', via: '#0891b2', to: '#67e8f9', pattern: 'wave' },
  'Post-Metal / Blackgaze': { from: '#1e1b4b', via: '#4338ca', to: '#a5b4fc', pattern: 'mist' },
  'Synthwave / Darksynth':  { from: '#2e1065', via: '#c026d3', to: '#22d3ee', pattern: 'grid' },
  'Pop Punk / Emo':         { from: '#500724', via: '#db2777', to: '#f9a8d4', pattern: 'crack' },
  'Emo Rap / Trap':         { from: '#1e1b2e', via: '#6d28d9', to: '#c4b5fd', pattern: 'noise' },
  'Hard Rock':              { from: '#450a0a', via: '#dc2626', to: '#fbbf24', pattern: 'bolt' },
  'Progressive Metal':      { from: '#0c4a6e', via: '#0e7490', to: '#5eead4', pattern: 'fractal' },
  'Ambient / Lo-Fi':        { from: '#312e81', via: '#7c3aed', to: '#ddd6fe', pattern: 'tape' },
  'Death Metal':            { from: '#000000', via: '#7f1d1d', to: '#ef4444', pattern: 'drip' },
  'Pop / Indie':            { from: '#831843', via: '#f472b6', to: '#fde68a', pattern: 'orbit' },
  'Israeli Rock':           { from: '#1e3a8a', via: '#2563eb', to: '#bfdbfe', pattern: 'shield' },
  'Hip-Hop / Rap':          { from: '#000000', via: '#92400e', to: '#fbbf24', pattern: 'mic' },
  'Heavy Metal':            { from: '#18181b', via: '#52525b', to: '#d4d4d8', pattern: 'horns' },
  'Alternative Rock':       { from: '#052e16', via: '#15803d', to: '#86efac', pattern: 'strings' },
  'Alternative':            { from: '#4c1d95', via: '#be185d', to: '#fbbf24', pattern: 'rainbow' },
  'Unclassified':           { from: '#1f2937', via: '#4b5563', to: '#9ca3af', pattern: 'dots' },
};

function patternFor(pattern: GenrePalette['pattern']) {
  switch (pattern) {
    case 'bolt':
      return <path d="M-10 40h60M-10 60h60M-10 80h60" stroke="white" strokeOpacity={0.12} strokeWidth={3} transform="rotate(-15 50 50)" />;
    case 'wave':
      return <path d="M-10 50c15-20 25 20 40 0s25 20 40 0" fill="none" stroke="white" strokeOpacity={0.15} strokeWidth={3} />;
    case 'mist':
      return <><circle cx="30" cy="70" r="22" fill="white" fillOpacity={0.08} /><circle cx="70" cy="35" r="16" fill="white" fillOpacity={0.08} /></>;
    case 'grid':
      return (
        <g stroke="white" strokeOpacity={0.15}>
          <path d="M0 70 L100 70 M0 80 L100 80 M0 90 L100 90" />
          <path d="M50 70 L10 100 M50 70 L90 100 M50 70 L30 100 M50 70 L70 100" />
        </g>
      );
    case 'crack':
      return <path d="M50 5 L45 35 L60 45 L40 65 L55 95" fill="none" stroke="white" strokeOpacity={0.18} strokeWidth={2.5} />;
    case 'noise':
      return <g fill="white" fillOpacity={0.14}>{Array.from({ length: 14 }).map((_, i) => (
        <circle key={i} cx={(i * 37) % 100} cy={(i * 53) % 100} r={1.5 + (i % 3)} />
      ))}</g>;
    case 'fractal':
      return <path d="M50 10 L65 40 L50 50 L35 40zM10 60 L40 50 L50 65 L20 75zM90 60 L60 50 L50 65 L80 75zM50 90 L35 60 L50 50 L65 60z" fill="white" fillOpacity={0.1} />;
    case 'tape':
      return <><rect x="15" y="40" width="70" height="30" rx="6" fill="white" fillOpacity={0.08} /><circle cx="35" cy="55" r="9" fill="none" stroke="white" strokeOpacity={0.2} strokeWidth={2} /><circle cx="65" cy="55" r="9" fill="none" stroke="white" strokeOpacity={0.2} strokeWidth={2} /></>;
    case 'drip':
      return <g fill="white" fillOpacity={0.13}>
        <path d="M30 0 q4 20 0 30 q-6 6 0 12 q6 -6 0 -12 q-4 -10 0 -30" />
        <path d="M60 0 q4 30 0 45 q-6 8 0 15 q6 -7 0 -15 q-4 -15 0 -45" />
      </g>;
    case 'orbit':
      return <><circle cx="50" cy="50" r="34" fill="none" stroke="white" strokeOpacity={0.15} strokeWidth={2} /><circle cx="84" cy="50" r="4" fill="white" fillOpacity={0.3} /></>;
    case 'shield':
      return <path d="M50 8 L82 22 V52 C82 74 68 90 50 96 C32 90 18 74 18 52 V22 Z" fill="none" stroke="white" strokeOpacity={0.14} strokeWidth={2.5} />;
    case 'mic':
      return <><circle cx="50" cy="50" r="30" fill="none" stroke="white" strokeOpacity={0.12} strokeWidth={2} /><circle cx="50" cy="50" r="18" fill="none" stroke="white" strokeOpacity={0.16} strokeWidth={2} /></>;
    case 'horns':
      return <path d="M20 90 C10 60 20 20 35 10 M80 90 C90 60 80 20 65 10" fill="none" stroke="white" strokeOpacity={0.15} strokeWidth={3} />;
    case 'strings':
      return <g stroke="white" strokeOpacity={0.14} strokeWidth={1.5}>
        <path d="M10 20 L90 30" /><path d="M10 40 L90 50" /><path d="M10 60 L90 70" /><path d="M10 80 L90 90" />
      </g>;
    case 'rainbow':
      return <g fill="none" stroke="white" strokeOpacity={0.13} strokeWidth={3}>
        <path d="M0 80a50 50 0 0 1 100 0" /><path d="M15 85a35 35 0 0 1 70 0" />
      </g>;
    case 'dots':
    default:
      return <g fill="white" fillOpacity={0.12}>{Array.from({ length: 9 }).map((_, i) => (
        <circle key={i} cx={20 + (i % 3) * 30} cy={20 + Math.floor(i / 3) * 30} r={4} />
      ))}</g>;
  }
}

/**
 * A small illustrated "cover art" tile per genre: a hand-picked two-tone
 * gradient plus a decorative abstract pattern and the genre's line icon on
 * top. Distinct from GenreIcon (a plain flat icon) - this is meant to read
 * as a genuine picture/badge, e.g. for genre headers or treemap legends.
 */
export default function GenreArt({ genre, size = 64, showLabel = false, className = '' }: GenreArtProps) {
  const palette = PALETTES[genre] ?? PALETTES['Unclassified'];
  const gradId = `genre-grad-${genre.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <div
        className="relative rounded-2xl overflow-hidden shrink-0 flex items-center justify-center shadow-lg"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox="0 0 100 100" className="absolute inset-0">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={palette.from} />
              <stop offset="55%" stopColor={palette.via} />
              <stop offset="100%" stopColor={palette.to} />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill={`url(#${gradId})`} />
          {patternFor(palette.pattern)}
        </svg>
        <GenreIcon genre={genre} size={size * 0.42} className="relative z-10 text-white drop-shadow-lg" />
      </div>
      {showLabel && (
        <span className="text-[10px] font-mono font-bold text-gray-300 text-center leading-tight max-w-[90px] truncate">
          {genre}
        </span>
      )}
    </div>
  );
}
