import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import ArtistAvatar from './ArtistAvatar';
import { getArtistGallery, getDailyPhotoIndex } from '../utils/artistGallery';

interface ArtistPhotoCarouselProps {
  name: string;
  size?: number;
  /** Auto-advance interval in ms; 0 disables rotation. */
  intervalMs?: number;
}

/**
 * Rotating portrait for dossier headers: crossfades through every known
 * photo of the artist (primary + Deezer + Wikimedia), starting on the
 * deterministic photo-of-the-day. Click cycles manually. Falls back to the
 * plain ArtistAvatar when the gallery has fewer than two usable photos.
 */
export default function ArtistPhotoCarousel({ name, size = 88, intervalMs = 7000 }: ArtistPhotoCarouselProps) {
  const { tc } = useApp();
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const photos = useMemo(
    () => getArtistGallery(name).filter(p => !failed.has(p.url)),
    [name, failed],
  );
  const [index, setIndex] = useState(() => getDailyPhotoIndex(name, photos.length));

  useEffect(() => {
    setFailed(new Set());
    setIndex(getDailyPhotoIndex(name, getArtistGallery(name).length));
  }, [name]);

  useEffect(() => {
    if (photos.length < 2 || !intervalMs) return;
    const id = window.setInterval(() => setIndex(i => (i + 1) % photos.length), intervalMs);
    return () => window.clearInterval(id);
  }, [photos.length, intervalMs]);

  if (photos.length < 2) {
    return <ArtistAvatar name={name} size={size} />;
  }

  const active = index % photos.length;

  return (
    <button
      type="button"
      onClick={() => setIndex(i => (i + 1) % photos.length)}
      aria-label={name}
      className="relative block cursor-pointer rounded-full focus:outline-none"
      style={{ width: size, height: size }}
      title={`${name} · ${photos[active].source}`}
    >
      {photos.map((photo, i) => (
        <img
          key={photo.url}
          src={photo.url}
          alt={i === active ? name : ''}
          loading={i === active ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(prev => new Set(prev).add(photo.url))}
          className="absolute inset-0 rounded-full object-cover transition-opacity duration-700"
          style={{
            width: size,
            height: size,
            opacity: i === active ? 1 : 0,
            border: `1px solid ${tc.c1}30`,
          }}
        />
      ))}
      <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-1" aria-hidden="true">
        {photos.map((photo, i) => (
          <span
            key={photo.url}
            className="h-1 w-1 rounded-full transition-all"
            style={{
              backgroundColor: i === active ? tc.c1 : 'rgba(255,255,255,0.3)',
              transform: i === active ? 'scale(1.4)' : 'scale(1)',
            }}
          />
        ))}
      </span>
    </button>
  );
}
