import { describe, expect, it } from 'vitest';
import { hashSeed, mulberry32, randomFromString } from './seededRandom';

describe('seededRandom', () => {
  it('hashSeed is deterministic and distinguishes close strings', () => {
    expect(hashSeed('melancolia:v0')).toBe(hashSeed('melancolia:v0'));
    expect(hashSeed('melancolia:v0')).not.toBe(hashSeed('melancolia:v1'));
  });

  it('mulberry32 yields the same sequence for the same seed', () => {
    const a = mulberry32(1234), b = mulberry32(1234);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('randomFromString stays within [0, 1) and varies by seed', () => {
    const rndX = randomFromString('artistas|del|museo');
    const rndY = randomFromString('otro|archivo');
    const x = Array.from({ length: 100 }, () => rndX());
    expect(x.every(v => v >= 0 && v < 1)).toBe(true);
    expect(x[0]).not.toBe(rndY());
  });
});
