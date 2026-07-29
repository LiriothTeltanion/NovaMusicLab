type ArtMap = Record<string, { thumb: string; source: string }>;

/**
 * Album and track artwork lookup tables, loaded off the critical path.
 *
 * These maps grow every time a new artwork source is harvested (iTunes, Deezer,
 * Cover Art Archive), and they were previously static imports inside CoverArt.
 * CoverArt is reachable from HeroSection, so that pinned both JSON files into
 * the landing-shell closure, which sits within ~11 KB of its gzip budget. A
 * single enrichment pass would have failed `npm run build:check`.
 *
 * Loading stays off the landing-shell path. Track rooms may also request the
 * album map as a secondary exact-key fallback because some title tracks share
 * their album title; this still happens only after a cover-bearing room opens.
 */
let albums: ArtMap | null = null;
let tracks: ArtMap | null = null;

let albumLoadStarted = false;
let trackLoadStarted = false;
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  for (const listener of listeners) listener();
}

/** Load only the map requested by the current visual. */
export function ensureArtMaps(kind: 'album' | 'track'): void {
  if (kind === 'album') {
    if (albumLoadStarted) return;
    albumLoadStarted = true;
    void import('../data/album_images.json')
      .then(albumModule => {
        albums = albumModule.default as ArtMap;
        emit();
      })
      .catch(() => {
        albums = {};
        emit();
      });
    return;
  }

  if (trackLoadStarted) return;
  trackLoadStarted = true;
  void import('../data/track_images.json')
    .then(trackModule => {
      tracks = trackModule.default as ArtMap;
      emit();
    })
    .catch(() => {
      tracks = {};
      emit();
    });
}

export function subscribeArtMaps(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/** Version counter - changes once when the maps land, so every cover re-renders together. */
export function artMapsVersion(): number {
  return version;
}

export function lookupArt(kind: 'album' | 'track', key: string) {
  if (kind === 'album') return albums?.[key];
  return tracks?.[key] ?? albums?.[key];
}
