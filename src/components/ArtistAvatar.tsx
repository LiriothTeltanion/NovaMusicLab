import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useImageLoadTimeout } from '../hooks/useImageLoadTimeout';
import openPrimaryImages from '../data/artist_open_primary_images.json';
import artistMeta from '../data/artist_meta.json';
import memberImages from '../data/member_images.json';
import memberEnrichment from '../data/member_enrichment.json';
import FlagArt from './FlagArt';
import {
  artistPhotoMapVersion,
  ensureArtistPhotoMap,
  lookupArtistPhoto,
  peekArtistPhoto,
  subscribeArtistPhotoMap,
} from './artistPhotoMap';
import { optimizeRemoteImageUrl } from '../utils/remoteImage';
import { hashSeed } from '../utils/seededRandom';

type ArtistMeta = Record<string, { genre: string; country: string }>;
const OPEN_PRIMARY_IMAGES = openPrimaryImages as Record<string, string>;
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
  /** Keeps an explicitly selected primary image from falling through to gallery providers. */
  fallbackToGallery?: boolean;
  /** Hides the portrait from assistive tech when adjacent text already names the artist. */
  decorative?: boolean;
}

export interface ArtistPrimaryImageCandidate {
  url: string;
  source: string;
}



function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Returns the stable primary portrait with its real provider label. Atlas uses
 * the unmodified URL so its own optimized -> original fallback remains intact.
 */
export function getArtistPrimaryImageCandidate(name: string): ArtistPrimaryImageCandidate | null {
  const key = name.normalize('NFC').trim().toLowerCase();
  // Curated first, matching what ArtistAvatar puts on screen, so an exported
  // poster shows the same face the visitor was looking at.
  const curated = OPEN_PRIMARY_IMAGES[key];
  if (curated) return { url: curated, source: 'wikimedia' };
  // Nothing bundled answers, so the long tail is worth fetching. This read is
  // synchronous and may miss on the first call; callers inside React pair it
  // with useArtistPhotoMap() to re-render once the index lands.
  ensureArtistPhotoMap();
  const indexed = peekArtistPhoto(key);
  return indexed ? { url: indexed.thumb, source: indexed.source } : null;
}

export function getArtistPrimaryImageUrl(name: string, size: number): string | null {
  const candidate = getArtistPrimaryImageCandidate(name);
  return candidate ? optimizeRemoteImageUrl(candidate.url, size) : null;
}

/**
 * Returns only rights-eligible open-knowledge primary portraits. The compact
 * runtime index is generated from the canonical knowledge manifest and only
 * includes declared or verified Wikimedia assets.
 */
export function getOpenKnowledgeArtistImageUrl(name: string, size: number): string | null {
  const key = name.normalize('NFC').trim().toLowerCase();
  const source = OPEN_PRIMARY_IMAGES[key];
  return source ? optimizeRemoteImageUrl(source, size) : null;
}

/**
 * Shows a real artist photo (Wikimedia Commons or Spotify CDN, sourced once
 * at dev time) or a deterministic colored-initials avatar as fallback.
 *
 * Compact avatars intentionally use the stable primary portrait. Daily gallery
 * rotation belongs to the explicit Atlas media stage; applying it to every
 * 20–92px avatar caused a burst of 800–1000px third-party requests in the
 * dashboard and made portraits appear unpredictably broken.
 */
export default function ArtistAvatar({
  name,
  size = 40,
  className = '',
  tooltip = true,
  overrideSrc,
  priority = false,
  fallbackToGallery = true,
  decorative = false,
}: ArtistAvatarProps) {
  const { tc } = useApp();
  // NFC-normalize: bundled JSON keys are NFC, but names arriving from an
  // uploaded export can be NFD (macOS) - byte-different, visually identical.
  const key = name.normalize('NFC').trim().toLowerCase();
  // Re-renders every avatar together the moment the wide map lands.
  React.useSyncExternalStore(subscribeArtistPhotoMap, artistPhotoMapVersion, artistPhotoMapVersion);
  const meta = META[key];
  const memberPhoto = MEMBER_ENRICHMENT[key]?.photo || MEMBER_IMAGES[key];
  // Bundled sources first: they paint a real face on the first frame instead of
  // fading one in. Reaching the wide index costs a ~150 KB gzip fetch, so it is
  // only worth starting once nothing bundled answers for this artist. The hero
  // hands both of its portraits an overrideSrc and the curated set covers most
  // of the top 100, so the landing screen never pays for the long tail.
  const bundledSrc = overrideSrc || memberPhoto || OPEN_PRIMARY_IMAGES[key];
  if (!bundledSrc) ensureArtistPhotoMap();
  const originalSrc = bundledSrc || lookupArtistPhoto(key)?.thumb;
  const optimizedSrc = originalSrc ? optimizeRemoteImageUrl(originalSrc, size) : undefined;
  const [stage, setStage] = useState<'optimized' | 'original' | 'gallery-loading' | 'gallery' | 'failed'>(
    originalSrc ? 'optimized' : 'gallery-loading',
  );
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Reset before the browser can dispatch a cached-image load event. A passive
  // effect can run after that event and incorrectly hide an already loaded
  // portrait at opacity: 0.
  useLayoutEffect(() => {
    setStage(originalSrc ? 'optimized' : 'gallery-loading');
    setGalleryUrls([]);
    setGalleryIndex(0);
    setLoaded(false);
  }, [name, optimizedSrc, originalSrc]);

  useEffect(() => {
    if (stage !== 'gallery-loading') return;
    if (!fallbackToGallery) {
      setStage('failed');
      return;
    }

    let cancelled = false;
    void import('../utils/artistGallery')
      .then(({ getArtistGallery }) => {
        if (cancelled) return;

        const candidates = getArtistGallery(name)
          .flatMap(photo => [optimizeRemoteImageUrl(photo.url, size), photo.url])
          .filter((url, index, urls) => (
            Boolean(url)
            && url !== optimizedSrc
            && url !== originalSrc
            && urls.indexOf(url) === index
          ));

        if (!candidates.length) {
          setStage('failed');
          return;
        }

        setGalleryUrls(candidates);
        setGalleryIndex(0);
        setLoaded(false);
        setStage('gallery');
      })
      .catch(() => {
        if (!cancelled) setStage('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackToGallery, name, originalSrc, optimizedSrc, size, stage]);

  const advanceImageFallback = useCallback(() => {
    setLoaded(false);
    setStage(current => {
      if (current === 'optimized' && optimizedSrc !== originalSrc) return 'original';
      if (current === 'optimized' || current === 'original') {
        return fallbackToGallery ? 'gallery-loading' : 'failed';
      }
      if (current === 'gallery' && galleryIndex + 1 < galleryUrls.length) {
        setGalleryIndex(index => index + 1);
        return 'gallery';
      }
      return 'failed';
    });
  }, [fallbackToGallery, galleryIndex, galleryUrls.length, optimizedSrc, originalSrc]);

  const src = stage === 'original'
    ? originalSrc
    : stage === 'gallery'
      ? galleryUrls[galleryIndex]
      : stage === 'optimized'
        ? optimizedSrc
        : undefined;

  useImageLoadTimeout(
    Boolean(src && !loaded),
    `${key}:${stage}:${src ?? ''}`,
    advanceImageFallback,
  );

  const avatar = (() => {
    if (src && stage !== 'failed') {
      const placeholderHue = hashSeed(name) % 360;
      return (
        <span
          className={`relative inline-flex rounded-full overflow-hidden shrink-0 ${loaded ? '' : 'art-loading'}`}
          style={{ width: size, height: size }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center font-mono font-black text-white"
            style={{
              fontSize: size * 0.32,
              background: `radial-gradient(circle at 35% 35%, hsl(${placeholderHue}, 72%, 24%), #050b14 78%)`,
              textShadow: `0 0 8px hsl(${placeholderHue}, 90%, 62%)`,
            }}
          >
            {initialsFor(name)}
          </span>
          <img
            src={src}
            alt={decorative ? '' : name}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            referrerPolicy="no-referrer"
            width={size}
            height={size}
            onLoad={() => setLoaded(true)}
            onError={advanceImageFallback}
            className={`relative rounded-full object-cover shrink-0 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
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
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : name}
        aria-hidden={decorative || undefined}
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
        aria-hidden={decorative || undefined}
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
