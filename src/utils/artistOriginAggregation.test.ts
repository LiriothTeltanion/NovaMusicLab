import { describe, expect, it } from 'vitest';
import { parseMusicSources } from './parser';

describe('artist-origin country aggregation', () => {
  it('weights known artist countries from every counted play and leaves listener telemetry separate', () => {
    const csv = [
      'Metallica,72 Seasons,Room of Mirrors,01 Jan 2026 10:00',
      'Metallica,72 Seasons,Room of Mirrors,01 Jan 2026 10:05',
      'Bring Me The Horizon,Sempiternal,Shadow Moses,01 Jan 2026 10:10',
      'Unknown Future Band,Demo,Signal,01 Jan 2026 10:15',
    ].join('\n');

    const data = parseMusicSources({ csvTexts: [csv] });

    expect(data.core_metrics.total_plays).toBe(4);
    expect(data.artist_origin_countries).toEqual([
      { country: 'United States', plays: 2 },
      { country: 'United Kingdom', plays: 1 },
    ]);
    // Last.fm does not have connection-country telemetry, so it must not be
    // mistaken for the artist-origin aggregate.
    expect(data.countries).toEqual([{ country: 'Unknown', plays: 4 }]);
  });
});
