/**
 * Deterministic PRNG so generative art is stable for a given dataset:
 * the same seed string always paints the same artwork, but each user's
 * archive (different artists/plays) produces different pieces.
 */

/** FNV-1a string hash → 32-bit unsigned seed. */
export function hashSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: tiny fast PRNG with good distribution for visual work. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convenience: seeded PRNG directly from a string. */
export function randomFromString(seed: string): () => number {
  return mulberry32(hashSeed(seed));
}
