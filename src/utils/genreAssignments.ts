import type {
  ArtistGenreCatalogEntry,
  GenreAssignment,
  MusicDnaData,
} from '../types';
import {
  canonicalGenreFamily,
  sanitizeSecondaryTags,
} from './genreTaxonomy';

export function artistGenreKey(name: string): string {
  return name.normalize('NFC').trim();
}

export function effectiveGenreFamily(
  entry: ArtistGenreCatalogEntry,
  assignment?: GenreAssignment,
): string {
  return assignment
    ? canonicalGenreFamily(assignment.family)
    : canonicalGenreFamily(entry.automaticFamily);
}

export function effectiveGenreLabel(assignment: GenreAssignment): string {
  const family = canonicalGenreFamily(assignment.family);
  const tags = sanitizeSecondaryTags(family, assignment.tags);
  return [family, ...tags.filter(tag => tag.toLocaleLowerCase('en-US') !== family.toLocaleLowerCase('en-US'))]
    .join(' / ');
}

function assignmentMap(
  catalog: readonly ArtistGenreCatalogEntry[],
  assignments: readonly GenreAssignment[],
): Map<string, GenreAssignment> {
  const validKeys = new Set(catalog.map(entry => entry.artistKey));
  const byArtist = new Map<string, GenreAssignment>();

  assignments.forEach(assignment => {
    if (!validKeys.has(assignment.artistKey)) return;
    byArtist.set(assignment.artistKey, {
      ...assignment,
      artistName: artistGenreKey(assignment.artistName),
      family: canonicalGenreFamily(assignment.family),
      tags: sanitizeSecondaryTags(assignment.family, assignment.tags),
    });
  });

  return byArtist;
}

/**
 * Applies local genre corrections to every genre-bearing projection while
 * keeping the original catalog as immutable automatic evidence. The complete
 * catalog is mandatory: rebuilding from the top-100 alone would fabricate an
 * archive-wide denominator, so legacy datasets without it are returned intact.
 */
export function applyGenreAssignments(
  baseData: MusicDnaData,
  assignments: readonly GenreAssignment[],
): MusicDnaData {
  const catalog = baseData.artist_genre_catalog;
  if (!catalog?.length) return baseData;

  const assignmentsByArtist = assignmentMap(catalog, assignments);
  const families = new Map<string, number>();

  catalog.forEach(entry => {
    const family = effectiveGenreFamily(entry, assignmentsByArtist.get(entry.artistKey));
    families.set(family, (families.get(family) ?? 0) + entry.plays);
  });

  const updateGenre = <T extends { artist?: string; name?: string; genre: string }>(row: T): T => {
    const artistName = row.artist ?? row.name ?? '';
    const assignment = assignmentsByArtist.get(artistGenreKey(artistName));
    return assignment ? { ...row, genre: effectiveGenreLabel(assignment) } : row;
  };

  return {
    ...baseData,
    top_artists: baseData.top_artists.map(updateGenre),
    top_tracks: baseData.top_tracks.map(updateGenre),
    top_genres: [...families.entries()]
      .map(([name, plays]) => ({ name, plays }))
      .sort((left, right) => right.plays - left.plays || left.name.localeCompare(right.name, 'en')),
  };
}
