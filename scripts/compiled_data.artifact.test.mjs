import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const compiledDatasetPath = path.join(process.cwd(), 'src', 'data', 'music_dna_compiled.json');
const compiledDataset = JSON.parse(readFileSync(compiledDatasetPath, 'utf8'));

describe('bundled compiled music dataset', () => {
  it('keeps the merged source totals and YouTube import coverage intact', () => {
    expect(compiledDataset.core_metrics).toMatchObject({
      total_plays: 81604,
      unique_artists: 6418,
      unique_tracks: 20871,
    });

    expect(compiledDataset.source_summary).toMatchObject({
      source_type: 'merged',
      lastfm_plays: 50476,
      spotify_plays: 161898,
      youtube_plays: 1758,
      merged_plays: 81604,
      cross_source_duplicates: 34779,
    });
    expect(compiledDataset.source_summary.merged_plays).toBe(compiledDataset.core_metrics.total_plays);

    const originCountries = Array.isArray(compiledDataset.artist_origin_countries)
      ? compiledDataset.artist_origin_countries
      : [];
    expect(Array.isArray(compiledDataset.artist_origin_countries)).toBe(true);
    expect(originCountries.length).toBeGreaterThan(0);
    expect(originCountries.reduce((total, country) => total + country.plays, 0))
      .toBeLessThanOrEqual(compiledDataset.core_metrics.total_plays);
  });
});
