import type { MusicDnaData } from '../types';

/**
 * The bundled demo archive, loaded on demand so the ~150KB dataset
 * ships as its own cacheable chunk instead of inflating the app entry bundle.
 * Returning visitors with their own IndexedDB dataset never download it at all.
 */
export function loadDefaultDataset(): Promise<MusicDnaData> {
  return import('./music_dna_compiled.json').then(
    module => module.default as unknown as MusicDnaData,
  );
}
