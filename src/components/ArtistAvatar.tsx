import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import artistImages from '../data/artist_images.json';
import artistMeta from '../data/artist_meta.json';
import memberImages from '../data/member_images.json';
import memberEnrichment from '../data/member_enrichment.json';
import FlagArt from './FlagArt';
import { getArtistGallery, getDailyPhotoIndex } from '../utils/artistGallery';
import { hashSeed } from '../utils/seededRandom';

type ArtistImages = Record<string, { thumb: string; source: string }>;
type ArtistMeta = Record<string, { genre: string; country: string }>;
const IMAGES = artistImages as ArtistImages;
const META = artistMeta as ArtistMeta;
const MEMBER_IMAGES = memberImages as Record<string, string>;
const MEMBER_ENRICHMENT = memberEnrichment as Record<string, { photo?: string }>;

interface ArtistAvatarProps {
  name: string;
  size?: number;
  className?: string;
  /** Rich hover tooltip with genre/country/flag (default on; disable in dense exports). */
  tooltip?: boolean;
  overrideSrc?: string;
  /** Marks an above-the-fold portrait as an eager, high-priority image. */
  priority?: boolean;
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
export default function ArtistAvatar({
  name,
  size = 40,
  className = '',
  tooltip = true,
  overrideSrc,
  priority = false,
}: ArtistAvatarProps) {
  const { tc } = useApp();
  // NFC-normalize: bundled JSON keys are NFC, but names arriving from an
  // uploaded export can be NFD (macOS) - byte-different, visually identical.
  const key = name.normalize('NFC').trim().toLowerCase();
  const entry = IMAGES[key];
  // Photo of the day: rotate deterministically through the artist's gallery
  // (primary + Deezer + Wikimedia) so portraits change daily, never randomly.
  const gallery = getArtistGallery(key);
  const dailyUrl = gallery.length ? gallery[getDailyPhotoIndex(key, gallery.length)].url : undefined;
  const isDailyPrimary = !dailyUrl || dailyUrl === entry?.thumb;
  const hiRes = entry && isDailyPrimary && size >= 48 ? hiResVariant(entry.thumb) : null;
  // Fallback chain: hi-res primary → daily pick → primary thumb → initials.
  const [stage, setStage] = useState<'hi' | 'std' | 'alt' | 'failed'>(hiRes ? 'hi' : 'std');
  const [loaded, setLoaded] = useState(false);
  const meta = META[key];
  const memberPhoto = MEMBER_ENRICHMENT[key]?.photo || MEMBER_IMAGES[key];
  const hasPhoto = Boolean(overrideSrc || memberPhoto || entry || dailyUrl);

  const avatar = (() => {
    if (hasPhoto && stage !== 'failed') {
      const src = overrideSrc || memberPhoto || (stage === 'hi' && hiRes
        ? hiRes
        : stage === 'alt' && entry
          ? entry.thumb
          : dailyUrl ?? entry!.thumb);
      return (
        <span
          className={`relative inline-flex rounded-full overflow-hidden shrink-0 ${loaded ? '' : 'art-loading'}`}
          style={{ width: size, height: size }}
        >
          <img
            src={src}
            alt={name}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            width={size}
            height={size}
            onLoad={() => setLoaded(true)}
            onError={() => {
              setLoaded(false);
              setStage(s => {
                if (s === 'hi') return 'std';
                if (s === 'std' && !isDailyPrimary && entry) return 'alt';
                return 'failed';
              });
            }}
            className={`rounded-full object-cover shrink-0 transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
            style={{ width: size, height: size, border: `1px solid ${tc.c1}30` }}
          />
        </span>
      );
    }
    const h = hashSeed(name);
    const hue1 = h % 360;
    const hue2 = (h + 120) % 360;
    
    // Seeded random coordinates for geometric lines/rings to simulate a digital HUD/music record
    const shapeCount = 3 + (h % 3);
    const elements = [];
    for (let i = 0; i < shapeCount; i++) {
      const angle = (h + i * 45) % 360;
      const radius = 25 + ((h + i * 13) % 25);
      const strokeColor = `hsl(${(hue1 + i * 40) % 360}, 90%, 60%)`;
      elements.push({ angle, radius, strokeColor });
    }

    return (
      <div
        role="img"
        aria-label={name}
        className={`rounded-full overflow-hidden relative flex items-center justify-center font-mono font-black shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.35,
          background: `radial-gradient(circle at 35% 35%, hsl(${hue1}, 80%, 20%) 0%, #050b14 100%)`,
          border: `1px solid hsl(${hue1}, 80%, 45%)`,
          // hsl() takes alpha via slash syntax; a hex-style "30" suffix glued
          // onto hsl() is invalid CSS and the browser drops the whole shadow.
          boxShadow: `inset 0 0 10px hsl(${hue1} 80% 50% / 0.19)`,
        }}
      >
        {/* Generative vector cyber patterns */}
        <svg
          className="absolute inset-0 w-full h-full opacity-60 pointer-events-none"
          viewBox="0 0 100 100"
        >
          {elements.map((el, idx) => (
            <circle
              key={idx}
              cx="50"
              cy="50"
              r={el.radius}
              fill="none"
              stroke={el.strokeColor}
              strokeWidth={1.5}
              strokeOpacity={0.4}
              strokeDasharray={idx % 2 === 0 ? "5 5" : undefined}
              transform={`rotate(${el.angle} 50 50)`}
            />
          ))}
          {/* Glowing central target grid lines */}
          <line x1="50" y1="10" x2="50" y2="90" stroke={`hsl(${hue2}, 95%, 65%)`} strokeWidth={0.7} strokeOpacity={0.25} />
          <line x1="10" y1="50" x2="90" y2="50" stroke={`hsl(${hue2}, 95%, 65%)`} strokeWidth={0.7} strokeOpacity={0.25} />
        </svg>

        {/* Text Initials */}
        <span
          className="relative z-10 font-black text-white"
          style={{
            textShadow: `0 0 8px hsl(${hue1}, 95%, 65%)`,
          }}
        >
          {initialsFor(name)}
        </span>
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
