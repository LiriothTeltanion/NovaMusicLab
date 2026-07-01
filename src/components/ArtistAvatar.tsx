import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import artistImages from '../data/artist_images.json';

type ArtistImages = Record<string, { thumb: string; source: string }>;
const IMAGES = artistImages as ArtistImages;

interface ArtistAvatarProps {
  name: string;
  size?: number;
  className?: string;
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
 * Shows a real artist photo (sourced once from Wikimedia Commons for the
 * curated known-artist list) or a deterministic colored-initials avatar as
 * a fallback - for artists outside the curated list, or if the image
 * fails to load at runtime. No network calls happen if the artist isn't
 * in the curated map; the <img> tag itself is a standard remote image
 * load, not an API call, and never touches the user's listening data.
 */
export default function ArtistAvatar({ name, size = 40, className = '' }: ArtistAvatarProps) {
  const { tc } = useApp();
  const [imgFailed, setImgFailed] = useState(false);
  const entry = IMAGES[name.trim().toLowerCase()];
  const showImage = entry && !imgFailed;

  if (showImage) {
    return (
      <img
        src={entry.thumb}
        alt={name}
        loading="lazy"
        width={size}
        height={size}
        onError={() => setImgFailed(true)}
        className={`rounded-full object-cover shrink-0 ${className}`}
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
}
