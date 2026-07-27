import React, { useState, useSyncExternalStore } from 'react';
import { Disc3, Music } from 'lucide-react';
import { artMapsVersion, ensureArtMaps, lookupArt, subscribeArtMaps } from './artMaps';
import { hashSeed } from '../utils/seededRandom';

interface CoverArtProps {
  artist: string;
  title: string;
  kind: 'album' | 'track';
  size?: number;
  className?: string;
  overrideSrc?: string;
}

const HUES = [188, 330, 271, 152, 38, 199, 0, 258];

/**
 * Square cover art for albums and tracks. Real artwork comes from the dev-side
 * harvest baked into album_images.json / track_images.json (iTunes, Deezer and
 * Cover Art Archive). Tracks without their own hit fall back to the same-artist
 * album cover when the key matches, then to a deterministic gradient tile with a
 * disc/note icon - so every row has a consistent visual even for unmatched
 * underground releases.
 *
 * The lookup tables load lazily (see ./artMaps), so the first paint may show the
 * gradient tile and swap to the real cover a moment later. That keeps the maps
 * out of the landing-shell bundle, which they would otherwise blow as the
 * catalogue grows.
 */
export default function CoverArt({ artist, title, kind, size = 44, className = '', overrideSrc }: CoverArtProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  ensureArtMaps();
  // Re-renders every cover together the moment the maps land.
  useSyncExternalStore(subscribeArtMaps, artMapsVersion, artMapsVersion);
  // NFC-normalize: bundled JSON keys are NFC; uploaded names can arrive NFD.
  const key = `${artist.normalize('NFC').trim().toLowerCase()}|||${title.normalize('NFC').trim().toLowerCase()}`;
  const entry = overrideSrc ? { thumb: overrideSrc } : lookupArt(kind, key);

  if (entry && !imgFailed) {
    return (
      <span
        className={`relative inline-flex rounded-lg overflow-hidden shrink-0 ${loaded ? '' : 'art-loading'}`}
        style={{ width: size, height: size }}
      >
        <img
          src={entry.thumb}
          alt={`${title} — ${artist}`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          width={size}
          height={size}
          onLoad={() => setLoaded(true)}
          onError={() => setImgFailed(true)}
          className={`object-cover shrink-0 rounded-lg transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          style={{
            width: size,
            height: size,
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 10px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
        />
      </span>
    );
  }

  const hue = HUES[hashSeed(artist + title) % HUES.length];
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
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 10px 24px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.18)',
      }}
    >
      <Icon className="text-white/70" style={{ width: size * 0.45, height: size * 0.45 }} />
    </div>
  );
}
