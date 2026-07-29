import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Cloud, ImageOff, Sparkles } from 'lucide-react';
import type { EmotionalMoodKey } from '../../engines/moodCore';
import { useImageLoadTimeout } from '../../hooks/useImageLoadTimeout';
import type { GalleryPhoto } from '../../utils/artistGallery';
import { getDailyPhotoIndex } from '../../utils/artistGallery';
import { optimizeRemoteImageUrl } from '../../utils/remoteImage';
import MoodArtCanvas from '../MoodArtCanvas';
import type { ArtistAtlasCopy } from './atlasCopy';

interface ArtistMediaStageProps {
  artistName: string;
  photos: GalleryPhoto[];
  fallbackMood: EmotionalMoodKey;
  copy: ArtistAtlasCopy;
  accent: string;
}

/**
 * Progressive artist portrait stage. The active portrait is prioritized while
 * the filmstrip remains lazy. Broken remote media disappears from the stage
 * and the deterministic canvas is always ready as an honest local fallback.
 */
export default function ArtistMediaStage({
  artistName,
  photos,
  fallbackMood,
  copy,
  accent,
}: ArtistMediaStageProps) {
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const availablePhotos = useMemo(
    () => photos.filter(photo => !failedUrls.has(photo.url)),
    [failedUrls, photos],
  );
  const [activeIndex, setActiveIndex] = useState(() => getDailyPhotoIndex(artistName, photos.length));
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [useOriginal, setUseOriginal] = useState(false);

  useEffect(() => {
    setFailedUrls(new Set());
    setActiveIndex(getDailyPhotoIndex(artistName, photos.length));
    setLoadedUrl(null);
    setUseOriginal(false);
  }, [artistName, photos.length]);

  useEffect(() => {
    if (availablePhotos.length && activeIndex >= availablePhotos.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, availablePhotos.length]);

  const activePhoto = availablePhotos.length
    ? availablePhotos[activeIndex % availablePhotos.length]
    : undefined;
  const optimizedActiveUrl = activePhoto
    ? optimizeRemoteImageUrl(activePhoto.url, 720)
    : undefined;
  const activeImageUrl = activePhoto
    ? useOriginal ? activePhoto.url : optimizedActiveUrl
    : undefined;

  useEffect(() => {
    setLoadedUrl(null);
    setUseOriginal(false);
  }, [activePhoto?.url]);

  const failActivePhoto = () => {
    setLoadedUrl(null);
    if (activePhoto && !useOriginal && optimizedActiveUrl !== activePhoto.url) {
      setUseOriginal(true);
      return;
    }
    if (activePhoto) {
      setFailedUrls(previous => new Set(previous).add(activePhoto.url));
    }
  };

  useImageLoadTimeout(
    Boolean(activePhoto && activeImageUrl && loadedUrl !== activePhoto.url),
    `${artistName}:${activePhoto?.url ?? ''}:${activeImageUrl ?? ''}`,
    failActivePhoto,
  );

  const move = (delta: number) => {
    if (availablePhotos.length < 2) return;
    setLoadedUrl(null);
    setActiveIndex(index => (index + delta + availablePhotos.length) % availablePhotos.length);
  };

  return (
    <div className="artist-atlas__stage nova-on-dark" aria-label={copy.portraitStage}>
      <MoodArtCanvas
        moodKey={fallbackMood}
        seed={`artist-atlas::${artistName}`}
        width={840}
        height={720}
        className="artist-atlas__stage-fallback"
      />

      {activePhoto ? (
        <img
          key={activePhoto.url}
          src={activeImageUrl}
          alt={artistName}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoadedUrl(activePhoto.url)}
          onError={failActivePhoto}
          className={`artist-atlas__stage-image ${loadedUrl === activePhoto.url ? 'artist-atlas__stage-image--loaded' : ''}`}
        />
      ) : null}

      <div className="artist-atlas__stage-shade" aria-hidden="true" />

      <div className="artist-atlas__stage-status">
        {activePhoto && loadedUrl === activePhoto.url
          ? <Cloud className="h-3.5 w-3.5" />
          : <Sparkles className="h-3.5 w-3.5" />}
        <span>
          {activePhoto && loadedUrl === activePhoto.url
            ? `${copy.remoteArtwork} · ${activePhoto.source}`
            : copy.generatedFallback}
        </span>
      </div>

      {activePhoto ? (
        <p className="artist-atlas__privacy-note">{copy.remoteArtworkNote}</p>
      ) : (
        <div className="artist-atlas__missing-media" role="status">
          <ImageOff className="h-5 w-5" style={{ color: accent }} />
          <p>{copy.noGallery}</p>
        </div>
      )}

      {availablePhotos.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label={copy.previousPhoto}
            className="artist-atlas__stage-nav artist-atlas__stage-nav--previous"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label={copy.nextPhoto}
            className="artist-atlas__stage-nav artist-atlas__stage-nav--next"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </>
      ) : null}

      {availablePhotos.length ? (
        <div className="artist-atlas__filmstrip" aria-label={copy.portraitStage}>
          <span className="artist-atlas__filmstrip-count">
            {copy.photoCount((activeIndex % availablePhotos.length) + 1, availablePhotos.length)}
          </span>
          <div className="artist-atlas__filmstrip-items">
            {availablePhotos.map((photo, index) => {
              const selected = index === activeIndex % availablePhotos.length;
              const thumbnailUrl = optimizeRemoteImageUrl(photo.url, 64);
              return (
                <button
                  key={photo.url}
                  type="button"
                  onClick={() => {
                    setLoadedUrl(null);
                    setActiveIndex(index);
                  }}
                  aria-label={copy.selectPhoto(index + 1)}
                  aria-pressed={selected}
                  className="artist-atlas__filmstrip-button"
                  style={{ borderColor: selected ? accent : 'rgba(255,255,255,0.16)' }}
                >
                  <img
                    src={thumbnailUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    width="64"
                    height="64"
                    onError={event => {
                      if (event.currentTarget.dataset.original !== 'true' && thumbnailUrl !== photo.url) {
                        event.currentTarget.dataset.original = 'true';
                        event.currentTarget.src = photo.url;
                        return;
                      }
                      setFailedUrls(previous => new Set(previous).add(photo.url));
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
