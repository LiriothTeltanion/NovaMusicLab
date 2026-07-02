import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import artistImages from '../data/artist_images.json';
import artistMeta from '../data/artist_meta.json';
import FlagArt from './FlagArt';

type ArtistImages = Record<string, { thumb: string; source: string }>;
type ArtistMeta = Record<string, { genre: string; country: string }>;
const IMAGES = artistImages as ArtistImages;
const META = artistMeta as ArtistMeta;

interface ArtistAvatarProps {
  name: string;
  size?: number;
  className?: string;
  /** Rich hover tooltip with genre/country/flag (default on; disable in dense exports). */
  tooltip?: boolean;
}

const PALETTE = ['#00f2fe', '#f72585', '#7209b7', '#10b981', '#f59e0b', '#06b6d4', '#ef4444', '#8b5cf6'];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Best-effort higher-resolution variant of a stored thumb URL.
 * - Wikimedia thumbnails are size-parameterized in the path (guaranteed).
 * - Spotify profile images have a 640px sibling under a different ID prefix
 *   (works for the common ab67616100005174 -> ab6761610000e5eb pair; if the
 *   sibling doesn't exist the <img> onError falls back to the standard URL).
 */
function hiResVariant(url: string): string | null {
  if (url.includes('/330px-')) return url.replace('/330px-', '/640px-');
  if (url.includes('ab67616100005174')) return url.replace('ab67616100005174', 'ab6761610000e5eb');
  return null;
}

/**
 * Shows a real artist photo (Wikimedia Commons or Spotify CDN, sourced once
 * at dev time) or a deterministic colored-initials avatar as fallback. Images
 * fade in on load; larger renders try a hi-res variant first and degrade
 * gracefully (hi-res -> standard -> initials) via onError stages.
 */
export default function ArtistAvatar({ name, size = 40, className = '', tooltip = true }: ArtistAvatarProps) {
  const { tc } = useApp();
  const key = name.trim().toLowerCase();
  const entry = IMAGES[key];
  const hiRes = entry && size >= 48 ? hiResVariant(entry.thumb) : null;
  const [stage, setStage] = useState<'hi' | 'std' | 'failed'>(hiRes ? 'hi' : 'std');
  const [loaded, setLoaded] = useState(false);
  const meta = META[key];

  const avatar = (() => {
    if (entry && stage !== 'failed') {
      const src = stage === 'hi' && hiRes ? hiRes : entry.thumb;
      return (
        <img
          src={src}
          alt={name}
          loading="lazy"
          width={size}
          height={size}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            setStage(s => (s === 'hi' ? 'std' : 'failed'));
          }}
          className={`rounded-full object-cover shrink-0 transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          style={{ width: size, height: size, border: `1px solid ${tc.c1}30` }}
        />
      );
    }
    const color = PALETTE[hashString(name) % PALETTE.length];
    return (
      <div
        role="img"
        aria-label={name}
        className={`rounded-full flex items-center justify-center font-mono font-black shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.38,
          backgroundColor: `${color}20`,
          color,
          border: `1px solid ${color}40`,
        }}
      >
        {initialsFor(name)}
      </div>
    );
  })();

  if (!tooltip) return avatar;

  return (
    <span className="relative inline-flex shrink-0 group/avatar" style={{ width: size, height: size }}>
      {avatar}
      <span
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/avatar:flex flex-col items-center gap-1 px-3 py-2 rounded-xl pointer-events-none z-50 whitespace-nowrap shadow-xl"
        style={{
          backgroundColor: 'rgba(7, 14, 28, 0.96)',
          border: `1px solid ${tc.c1}40`,
        }}
      >
        <span className="text-[11px] font-bold text-white font-mono">{name}</span>
        {meta && (
          <span className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
            <FlagArt country={meta.country} size={14} />
            {meta.country} · {meta.genre}
          </span>
        )}
      </span>
    </span>
  );
}
