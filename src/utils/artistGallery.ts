import galleryData from '../data/artist_gallery.json';
import { hashSeed } from './seededRandom';

export interface GalleryPhoto {
  url: string;
  source: string;
}

const GALLERY = galleryData as Record<string, GalleryPhoto[]>;

// NFC-normalize: the JSON keys are NFC, but uploaded artist names can arrive
// NFD-decomposed (macOS exports) - byte-different yet visually identical.
const galleryKey = (name: string) => name.normalize('NFC').trim().toLowerCase();

/** All known photos for an artist (empty array when none). */
export function getArtistGallery(name: string): GalleryPhoto[] {
  return GALLERY[galleryKey(name)] ?? [];
}

/**
 * Deterministic "photo of the day": same artist + same date always picks the
 * same index, but the museum wakes up with different portraits each day.
 * No Math.random — tests and SSR stay stable within a day.
 */
export function getDailyPhotoIndex(name: string, length: number, date: Date = new Date()): number {
  if (length <= 1) return 0;
  const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  return hashSeed(`${galleryKey(name)}::${dayKey}`) % length;
}
