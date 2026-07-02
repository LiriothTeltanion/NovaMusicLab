import React, { useState } from 'react';
import { Disc3, Music } from 'lucide-react';
import albumImages from '../data/album_images.json';
import trackImages from '../data/track_images.json';

type ArtMap = Record<string, { thumb: string; source: string }>;
const ALBUMS = albumImages as ArtMap;
const TRACKS = trackImages as ArtMap;

interface CoverArtProps {
  artist: string;
  title: string;
  kind: 'album' | 'track';
  size?: number;
  className?: string;
}

const HUES = [188, 330, 271, 152, 38, 199, 0, 258];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Square cover art for albums and tracks. Real artwork comes from the
 * one-time dev-side iTunes Search extraction baked into album_images.json /
 * track_images.json (official covers, 600px). Tracks without their own hit
 * fall back to the same-artist album cover when the key matches, then to a
 * deterministic gradient tile with a disc/note icon - so every row has a
 * consistent visual even for unmatched underground releases.
 */
export default function CoverArt({ artist, title, kind, size = 44, className = '' }: CoverArtProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const key = `${artist.toLowerCase()}|||${title.toLowerCase()}`;
  const entry = kind === 'album'
    ? ALBUMS[key]
    : TRACKS[key] ?? ALBUMS[key];

  if (entry && !imgFailed) {
    return (
      <img
        src={entry.thumb}
        alt={`${title} — ${artist}`}
        loading="lazy"
        width={size}
        height={size}
        onLoad={() => setLoaded(true)}
        onError={() => setImgFailed(true)}
        className={`object-cover shrink-0 rounded-lg transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        style={{ width: size, height: size, border: '1px solid rgba(128,128,128,0.25)' }}
      />
    );
  }

  const hue = HUES[hashString(artist + title) % HUES.length];
  const Icon = kind === 'album' ? Disc3 : Music;
  return (
    <div
      role="img"
      aria-label={`${title} — ${artist}`}
      className={`shrink-0 rounded-lg flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue}, 70%, 22%), hsl(${(hue + 40) % 360}, 65%, 38%))`,
        border: '1px solid rgba(128,128,128,0.25)',
      }}
    >
      <Icon className="text-white/70" style={{ width: size * 0.45, height: size * 0.45 }} />
    </div>
  );
}
