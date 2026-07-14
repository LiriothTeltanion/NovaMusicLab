import { describe, expect, it } from 'vitest';
import type { ArtistGenreCatalogEntry, GenreAssignment, MusicDnaData } from '../types';
import { applyGenreAssignments, effectiveGenreLabel } from './genreAssignments';

const catalog: ArtistGenreCatalogEntry[] = [
  {
    artistKey: 'Known Artist',
    name: 'Known Artist',
    plays: 10,
    automaticGenre: 'Metalcore',
    automaticFamily: 'Metalcore',
    country: 'Finland',
    source: 'catalog',
  },
  {
    artistKey: 'Unknown Artist',
    name: 'Unknown Artist',
    plays: 5,
    automaticGenre: 'Unclassified',
    automaticFamily: 'Unclassified',
    country: 'Unknown',
    source: 'unclassified',
  },
  {
    artistKey: 'Broad Artist',
    name: 'Broad Artist',
    plays: 3,
    automaticGenre: 'Alternative',
    automaticFamily: 'Alternative',
    country: 'Unknown',
    source: 'catalog',
  },
];

function fixture(): MusicDnaData {
  return {
    project: 'Genre test',
    generated_at: '2026-07-14T00:00:00.000Z',
    core_metrics: {
      total_plays: 18,
      unique_artists: 3,
      unique_tracks: 2,
      unique_albums: 0,
      listening_minutes: 60,
      listening_hours: 1,
      listening_days: 0,
      active_days: 1,
      max_year: 2026,
      match_rate_pct: 100,
    },
    top_artists: catalog.map(entry => ({
      name: entry.name,
      plays: entry.plays,
      genre: entry.automaticGenre,
      country: entry.country,
    })),
    top_tracks: [
      { artist: 'Unknown Artist', title: 'Mystery', plays: 4, genre: 'Unclassified' },
      { artist: 'Known Artist', title: 'Signal', plays: 3, genre: 'Metalcore' },
    ],
    top_albums: [],
    top_genres: [{ name: 'stale', plays: 999 }],
    yearly_eras: [],
    sessions: [],
    obsessions: [],
    countries: [],
    heatmap: Array.from({ length: 24 }, () => Array(7).fill(0)),
    artist_genre_catalog: catalog,
  };
}

const assignment: GenreAssignment = {
  artistKey: 'Unknown Artist',
  artistName: 'Unknown Artist',
  family: 'Metalcore',
  tags: ['Electronicore', 'not controlled'],
  updatedAt: '2026-07-14T00:00:00.000Z',
};

describe('applyGenreAssignments', () => {
  it('rebuilds the complete genre denominator and every artist projection', () => {
    const base = fixture();
    const result = applyGenreAssignments(base, [assignment]);

    expect(result.top_genres).toEqual([
      { name: 'Metalcore', plays: 15 },
      { name: 'Alternative', plays: 3 },
    ]);
    expect(result.top_genres.reduce((sum, row) => sum + row.plays, 0)).toBe(18);
    expect(result.top_artists.find(row => row.name === 'Unknown Artist')?.genre)
      .toBe('Metalcore / Electronicore');
    expect(result.top_tracks.find(row => row.artist === 'Unknown Artist')?.genre)
      .toBe('Metalcore / Electronicore');
  });

  it('does not mutate the source dataset or its automatic catalog', () => {
    const base = fixture();
    const snapshot = structuredClone(base);

    applyGenreAssignments(base, [assignment]);

    expect(base).toEqual(snapshot);
    expect(base.artist_genre_catalog?.[1].automaticFamily).toBe('Unclassified');
  });

  it('uses the last valid correction and ignores assignments outside the catalog', () => {
    const result = applyGenreAssignments(fixture(), [
      assignment,
      { ...assignment, family: 'Hard Rock', tags: ['Glam Metal'] },
      { ...assignment, artistKey: 'Missing', artistName: 'Missing', family: 'Death Metal' },
    ]);

    expect(result.top_genres).toEqual([
      { name: 'Metalcore', plays: 10 },
      { name: 'Hard Rock', plays: 5 },
      { name: 'Alternative', plays: 3 },
    ]);
  });

  it('returns legacy datasets intact rather than rebuilding from an incomplete top list', () => {
    const base = fixture();
    delete base.artist_genre_catalog;
    expect(applyGenreAssignments(base, [assignment])).toBe(base);
  });

  it('sanitizes secondary tags into an honest display genre', () => {
    expect(effectiveGenreLabel(assignment)).toBe('Metalcore / Electronicore');
    expect(effectiveGenreLabel({ ...assignment, family: 'made up', tags: ['Other'] }))
      .toBe('Unclassified');
  });
});
