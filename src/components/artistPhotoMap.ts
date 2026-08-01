import { useSyncExternalStore } from 'react';

type ArtistImages = Record<string, { thumb: string; source: string }>;

/**
 * The wide artist-portrait index, loaded off the critical path.
 *
 * The archive holds 6,413 artist-name catalog entries. Once every entry that Deezer could
 * resolve has a portrait, this map is roughly a megabyte of raw JSON - and
 * ArtistAvatar is reachable from HeroSection, so importing it directly would
 * pin all of it into the landing-shell closure, which runs within ~13 KB of its
 * gzip budget.
 *
 * The small curated set in artist_open_primary_images.json stays a static
 * import in ArtistAvatar. It covers the hero artist and most of the top 100, so
 * the first screen still paints a real face immediately and only the long tail
 * fades in a moment later.
 */
let wide: ArtistImages | null = null;
let loadStarted = false;
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  for (const listener of listeners) listener();
}

/** Kicks off the one-time load. Safe to call from render - it self-deduplicates. */
export function ensureArtistPhotoMap(): void {
  if (loadStarted) return;
  loadStarted = true;
  void import('../data/artist_images.json')
    .then(module => {
      wide = module.default as ArtistImages;
      emit();
    })
    .catch(() => {
      // A portrait index that will not load is an honest gap, not an error:
      // every caller already renders a generated avatar when a key is missing.
      wide = {};
      emit();
    });
}

export function subscribeArtistPhotoMap(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/** Changes once when the map lands, so every avatar re-renders together. */
export function artistPhotoMapVersion(): number {
  return version;
}

export function lookupArtistPhoto(key: string) {
  return wide?.[key];
}

/**
 * For components that read the index directly instead of through an avatar.
 * An avatar's own subscription re-renders the avatar, not its parent, so a room
 * computing a portrait URL in its render body needs to subscribe itself.
 */
export function useArtistPhotoMap(): void {
  useSyncExternalStore(subscribeArtistPhotoMap, artistPhotoMapVersion, artistPhotoMapVersion);
}

/**
 * Synchronous read for callers outside React that cannot wait for the load -
 * the poster and share-card exporters, which run after the museum is open and
 * the map has therefore already arrived.
 */
export function peekArtistPhoto(key: string) {
  return wide?.[key];
}
