import { describe, expect, it } from 'vitest';

import type { TopArtist } from '../types';
import { buildArchetypes, buildPersonalityMatrix } from './identityEngine';

const metalcoreArchive: TopArtist[] = [
  { name: 'Signal Breaker', plays: 100, genre: 'Metalcore', country: 'Unknown' },
];

describe('identityEngine interpretive boundaries', () => {
  it.each(['en', 'es', 'he'] as const)('keeps unsupported signals at zero in %s', lang => {
    const matrix = buildPersonalityMatrix([], lang);

    expect(Object.values(matrix).map(trait => trait.score)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(matrix.nostalgia.evidence).toMatch(
      /No mapped genre evidence|No hay evidencia de género mapeada|אין עדות ז׳אנר ממופה/,
    );
  });

  it('uses the real normalized genre signal without an artificial score floor', () => {
    const matrix = buildPersonalityMatrix(metalcoreArchive, 'en');

    expect(matrix.energia.score).toBe(100);
    expect(matrix.rebeldia.score).toBe(60);
    expect(matrix.nostalgia.score).toBe(0);
    expect(matrix.futurismo.score).toBe(0);
    expect(matrix.creatividad.score).toBeGreaterThan(0);
    expect(matrix.creatividad.score).toBeLessThan(30);
  });

  it.each(['en', 'es', 'he'] as const)('keeps archetypes musical and non-clinical in %s', lang => {
    const first = buildArchetypes(metalcoreArchive, lang);
    const second = buildArchetypes(metalcoreArchive, lang);
    const prose = JSON.stringify(first);

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
    expect(prose).not.toMatch(
      /anxiety|loneliness|attachment|ansiedad|soledad|apego|חרדה|בדידות|היקשרות/i,
    );
  });

  it('does not fabricate an archetype when the archive has no supporting rows', () => {
    expect(buildArchetypes([], 'en')).toEqual([]);
  });
});
