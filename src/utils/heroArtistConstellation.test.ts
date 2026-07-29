import { describe, expect, it } from 'vitest';
import {
  getLocalDayKey,
  selectDailyArtistSatellites,
  type HeroConstellationArtist,
} from './heroArtistConstellation';

const artists: HeroConstellationArtist[] = [
  { name: 'Anchor', plays: 100, imageUrl: 'https://upload.wikimedia.org/anchor.jpg' },
  { name: 'Alpha', plays: 90, imageUrl: 'https://upload.wikimedia.org/alpha.jpg' },
  { name: 'Beta', plays: 80, imageUrl: 'https://upload.wikimedia.org/beta.jpg' },
  { name: 'Gamma', plays: 70, imageUrl: 'https://upload.wikimedia.org/gamma.jpg' },
  { name: 'Delta', plays: 60, imageUrl: 'https://upload.wikimedia.org/delta.jpg' },
  { name: 'Epsilon', plays: 50, imageUrl: 'https://upload.wikimedia.org/epsilon.jpg' },
];

describe('heroArtistConstellation', () => {
  it('formats a stable local calendar key', () => {
    expect(getLocalDayKey(new Date(2026, 6, 9, 23, 59))).toBe('2026-07-09');
  });

  it('returns a stable, bounded daily selection without the anchor', () => {
    const first = selectDailyArtistSatellites(artists, 'Anchor', '2026-07-29');
    const second = selectDailyArtistSatellites(artists, 'Anchor', '2026-07-29');

    expect(second).toEqual(first);
    expect(first).toHaveLength(4);
    expect(first.map((artist) => artist.name)).not.toContain('Anchor');
    expect(new Set(first.map((artist) => artist.name)).size).toBe(first.length);
    expect(artists.map((artist) => artist.name)).toEqual([
      'Anchor',
      'Alpha',
      'Beta',
      'Gamma',
      'Delta',
      'Epsilon',
    ]);
  });

  it('honors smaller limits and removes normalized duplicate names', () => {
    const withDuplicate = [
      ...artists,
      { ...artists[1], name: ' Alpha ' },
    ];

    const selected = selectDailyArtistSatellites(
      withDuplicate,
      'Anchor',
      '2026-07-29',
      2,
    );

    expect(selected).toHaveLength(2);
    expect(new Set(selected.map((artist) => artist.name.trim().toLowerCase())).size).toBe(2);
  });
});
