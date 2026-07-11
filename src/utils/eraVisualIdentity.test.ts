import { describe, expect, it } from 'vitest';
import type { YearlyEra } from '../types';
import { deriveEraVisualIdentity } from './eraVisualIdentity';

const ERA: YearlyEra = {
  year: 2024,
  plays: 5_000,
  unique_artists: 420,
  unique_tracks: 1_180,
  top_artist: 'Bilmuri',
  top_track: 'The Journey',
  dominant_daypart: 'Mañana 06-11',
  era_label: 'Era Groove Emocional',
  era_desc: 'Un capítulo de reconstrucción.',
  diversity_index: 30,
};

describe('deriveEraVisualIdentity', () => {
  it('turns listening evidence into honest relative signals', () => {
    const identity = deriveEraVisualIdentity(ERA, 10_000);

    expect(identity.intensity).toBe(50);
    expect(identity.exploration).toBe(30);
    expect(identity.fixation).toBe(70);
    expect(identity.energy).toBe(54);
    expect(identity.mood.es).toContain('Amanecer eléctrico');
    expect(identity.energyBand.en).toBe('Sustained current');
  });

  it('is deterministic while giving different chapters distinct art direction', () => {
    const first = deriveEraVisualIdentity(ERA, 10_000);
    const repeat = deriveEraVisualIdentity(ERA, 10_000);
    const next = deriveEraVisualIdentity({ ...ERA, year: 2025, top_artist: 'nothingnowhere.' }, 10_000);

    expect(repeat).toEqual(first);
    expect(next.serial).not.toBe(first.serial);
    expect(next.palette.primary).not.toBe(first.palette.primary);
    expect(['orbit', 'waveform', 'prism', 'grid']).toContain(first.motif);
    expect(first.texture).toContain('gradient');
  });

  it('clamps malformed diversity and handles an archive without a positive peak', () => {
    const identity = deriveEraVisualIdentity({ ...ERA, diversity_index: 180 }, 0);

    expect(identity.intensity).toBe(0);
    expect(identity.exploration).toBe(100);
    expect(identity.fixation).toBe(0);
    expect(identity.energy).toBe(0);
  });
});
