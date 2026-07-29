import { describe, expect, it } from 'vitest';
import defaultMusicData from '../data/music_dna_compiled.json';
import type { CoreMetrics, MusicDnaData, TopArtist } from '../types';
import { compareArtistOverlap, compareCoreMetrics, compareMoodProfiles } from './museumCompare';

const base = defaultMusicData as unknown as MusicDnaData;

function makeDataset(topArtists: TopArtist[], metricOverrides: Partial<CoreMetrics> = {}): MusicDnaData {
  return {
    ...base,
    top_artists: topArtists,
    core_metrics: { ...base.core_metrics, ...metricOverrides },
  };
}

describe('compareArtistOverlap', () => {
  it('finds shared artists case/whitespace-insensitively and sums their plays from each side', () => {
    const a = makeDataset([
      { name: ' Deafheaven ', plays: 100, genre: 'Blackgaze', country: 'US' },
      { name: 'Only In A', plays: 50, genre: 'Rock', country: 'US' },
    ]);
    const b = makeDataset([
      { name: 'DEAFHEAVEN', plays: 40, genre: 'Blackgaze', country: 'US' },
      { name: 'Only In B', plays: 30, genre: 'Pop', country: 'US' },
    ]);

    const result = compareArtistOverlap(a, b);

    expect(result.sharedCount).toBe(1);
    expect(result.shared[0]).toMatchObject({ name: ' Deafheaven ', playsA: 100, playsB: 40 });
    expect(result.onlyA.map(x => x.name)).toEqual(['Only In A']);
    expect(result.onlyB.map(x => x.name)).toEqual(['Only In B']);
    // union = 3 unique artists, 1 shared -> 33.3%
    expect(result.overlapPct).toBeCloseTo(33.3, 1);
    expect(result.scopeA).toMatchObject({ comparedArtists: 2, complete: false });
  });

  it('returns zero overlap for two disjoint artist lists', () => {
    const a = makeDataset([{ name: 'Artist A', plays: 10, genre: '', country: '' }]);
    const b = makeDataset([{ name: 'Artist B', plays: 10, genre: '', country: '' }]);

    const result = compareArtistOverlap(a, b);

    expect(result.sharedCount).toBe(0);
    expect(result.overlapPct).toBe(0);
  });

  it('caps the shared-artist preview list without affecting sharedCount', () => {
    const names = Array.from({ length: 20 }, (_, i) => `Shared ${i}`);
    const a = makeDataset(names.map(name => ({ name, plays: 10, genre: '', country: '' })));
    const b = makeDataset(names.map(name => ({ name, plays: 5, genre: '', country: '' })));

    const result = compareArtistOverlap(a, b);

    expect(result.sharedCount).toBe(20);
    expect(result.shared.length).toBeLessThan(20);
  });

  it('uses the complete artist catalog and merges normalized duplicate identities', () => {
    const a = makeDataset([], { unique_artists: 2 });
    a.artist_genre_catalog = [
      {
        artistKey: 'Beyoncé',
        name: 'Beyoncé',
        plays: 20,
        automaticGenre: 'Pop',
        automaticFamily: 'Pop',
        country: 'US',
        source: 'catalog',
      },
      {
        artistKey: 'Archive A',
        name: 'Archive A',
        plays: 10,
        automaticGenre: 'Rock',
        automaticFamily: 'Rock',
        country: 'US',
        source: 'catalog',
      },
    ];
    const b = makeDataset([], { unique_artists: 2 });
    b.artist_genre_catalog = [
      {
        artistKey: 'BEYONCE',
        name: 'BEYONCE',
        plays: 5,
        automaticGenre: 'Pop',
        automaticFamily: 'Pop',
        country: 'US',
        source: 'catalog',
      },
      {
        artistKey: 'Archive B',
        name: 'Archive B',
        plays: 8,
        automaticGenre: 'Electronic',
        automaticFamily: 'Electronic',
        country: 'GB',
        source: 'catalog',
      },
    ];

    const result = compareArtistOverlap(a, b);

    expect(result.shared).toEqual([
      { name: 'Beyoncé', playsA: 20, playsB: 5 },
    ]);
    expect(result.scopeA).toEqual({ comparedArtists: 2, archiveArtists: 2, complete: true });
    expect(result.scopeB).toEqual({ comparedArtists: 2, archiveArtists: 2, complete: true });
  });

  it('keeps a fully loaded catalog complete when normalization merges aliases', () => {
    const a = makeDataset([], { unique_artists: 2 });
    a.artist_genre_catalog = [
      {
        artistKey: 'Beyoncé',
        name: 'Beyoncé',
        plays: 20,
        automaticGenre: 'Pop',
        automaticFamily: 'Pop',
        country: 'US',
        source: 'catalog',
      },
      {
        artistKey: 'BEYONCE',
        name: 'BEYONCE',
        plays: 5,
        automaticGenre: 'Pop',
        automaticFamily: 'Pop',
        country: 'US',
        source: 'catalog',
      },
    ];
    const b = makeDataset([], { unique_artists: 1 });
    b.artist_genre_catalog = [{
      artistKey: 'Beyonce',
      name: 'Beyonce',
      plays: 8,
      automaticGenre: 'Pop',
      automaticFamily: 'Pop',
      country: 'US',
      source: 'catalog',
    }];

    const result = compareArtistOverlap(a, b);

    expect(result.shared[0]).toEqual({
      name: 'Beyoncé',
      playsA: 25,
      playsB: 8,
    });
    expect(result.scopeA).toEqual({
      comparedArtists: 1,
      archiveArtists: 2,
      complete: true,
    });
  });
});

describe('compareCoreMetrics', () => {
  it('computes a percentage difference relative to dataset A', () => {
    const a = makeDataset([], { total_plays: 100, unique_artists: 10 });
    const b = makeDataset([], { total_plays: 150, unique_artists: 5 });

    const metrics = compareCoreMetrics(a, b);
    const totalPlays = metrics.find(m => m.key === 'total_plays');
    const uniqueArtists = metrics.find(m => m.key === 'unique_artists');

    expect(totalPlays).toMatchObject({ a: 100, b: 150, diffPct: 50 });
    expect(uniqueArtists).toMatchObject({ a: 10, b: 5, diffPct: -50 });
  });

  it('reports a null diff when dataset A has zero for that metric', () => {
    const a = makeDataset([], { active_days: 0 });
    const b = makeDataset([], { active_days: 20 });

    const metrics = compareCoreMetrics(a, b);
    expect(metrics.find(m => m.key === 'active_days')?.diffPct).toBeNull();
  });
});

describe('compareMoodProfiles', () => {
  it('flags identical dominant moods as matching', () => {
    const sameArtists: TopArtist[] = [{ name: 'Hammock', plays: 500, genre: 'Ambient', country: 'US' }];
    const a = makeDataset(sameArtists);
    const b = makeDataset(sameArtists);

    const result = compareMoodProfiles(a, b);
    expect(result.sameDominantMood).toBe(true);
    expect(result.profileA.dominantMood.key).toBe(result.profileB.dominantMood.key);
  });
});
