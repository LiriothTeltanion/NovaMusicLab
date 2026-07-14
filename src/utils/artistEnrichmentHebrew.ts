export interface HebrewArtistEnrichment {
  name: string;
  origin: string;
  country: string;
  status: string;
  bio: string;
  archive_role: string;
  sound_evolution: string;
  why_it_matters: string;
  signature_moods: string[];
  key_albums: Array<{
    title: string;
    description: string;
  }>;
}

type OverlayListener = (overlay: HebrewArtistEnrichment[]) => void;

let installedOverlay: HebrewArtistEnrichment[] | undefined;
let loadPromise: Promise<void> | undefined;
const listeners = new Set<OverlayListener>();

function installOverlay(overlay: HebrewArtistEnrichment[]) {
  const names = new Set(overlay.map(profile => profile.name));
  if (!overlay.length || names.size !== overlay.length) {
    throw new Error('Hebrew artist enrichment contains missing or duplicate profiles.');
  }

  // Notify loaded consumers first. If their stricter base/overlay validation
  // fails, do not cache a broken overlay as successfully installed.
  listeners.forEach(listener => listener(overlay));
  installedOverlay = overlay;
}

export function subscribeToHebrewArtistEnrichment(listener: OverlayListener) {
  listeners.add(listener);
  if (installedOverlay) listener(installedOverlay);
  return () => listeners.delete(listener);
}

export function isHebrewArtistEnrichmentLoaded() {
  return Boolean(installedOverlay);
}

/**
 * Preloads only the Hebrew overlay. It intentionally has no dependency on the
 * much larger ES/EN base, so selecting Hebrew outside Top Histórico does not
 * download the full artist dossier catalog.
 */
export function loadHebrewArtistEnrichment(): Promise<void> {
  if (installedOverlay) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = import('../data/artist_enrichment_he.json')
      .then(module => installOverlay(module.default as HebrewArtistEnrichment[]))
      .catch(error => {
        loadPromise = undefined;
        throw error;
      });
  }
  return loadPromise;
}
