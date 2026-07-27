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
 * Loading them lazily keeps the landing shell flat no matter how large the
 * catalogue gets. Callers render the deterministic gradient tile until the maps
 * arrive, then swap to the real cover - the same "generative first, swap when
 * loaded" behaviour the remote images themselves already use.
 */
let albums: ArtMap | null = null;
let tracks: ArtMap | null = null;

let loadStarted = false;
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  for (const listener of listeners) listener();
}

/** Kick off the one-time load. Safe to call from render - it self-deduplicates. */
export function ensureArtMaps(): void {
  if (loadStarted) return;
  loadStarted = true;
  void Promise.all([
    import('../data/album_images.json'),
    import('../data/track_images.json'),
  ])
    .then(([albumModule, trackModule]) => {
      albums = albumModule.default as ArtMap;
      tracks = trackModule.default as ArtMap;
      emit();
    })
    .catch(() => {
      // An artwork map that will not load is an honest gap, not an error state:
      // every caller already renders a deterministic tile when a key is missing.
      albums = {};
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
