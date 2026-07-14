import type { ArtistGenreCatalogEntry } from '../types';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isArtistGenreCatalogEntry(value: unknown): value is ArtistGenreCatalogEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (!isNonEmptyString(row.artistKey)
    || !isNonEmptyString(row.name)
    || !Number.isInteger(row.plays)
    || Number(row.plays) <= 0
    || !isNonEmptyString(row.automaticGenre)
    || !isNonEmptyString(row.automaticFamily)
    || !isNonEmptyString(row.country)
    || (row.source !== 'catalog' && row.source !== 'unclassified')) return false;

  const exactName = row.name.normalize('NFC').trim();
  if (row.artistKey !== exactName) return false;
  return row.source !== 'unclassified'
    || (row.automaticGenre === 'Unclassified' && row.automaticFamily === 'Unclassified');
}

/** Runtime guard for the independently loaded, archive-wide genre catalog. */
export function isArtistGenreCatalog(value: unknown): value is ArtistGenreCatalogEntry[] {
  if (!Array.isArray(value) || !value.every(isArtistGenreCatalogEntry)) return false;
  return new Set(value.map(row => row.artistKey)).size === value.length;
}

export function validateArtistGenreCatalog(value: unknown): ArtistGenreCatalogEntry[] {
  if (!isArtistGenreCatalog(value)) {
    throw new TypeError('Invalid Nova Music Lab artist genre catalog.');
  }
  return value;
}

/**
 * Loads the default archive's long-tail artist catalog only when genre editing
 * needs it. Personal uploads already carry the same catalog in memory.
 */
export function loadDefaultGenreCatalog(): Promise<ArtistGenreCatalogEntry[]> {
  return import('./music_dna_genre_catalog.json')
    .then(module => validateArtistGenreCatalog(module.default));
}
