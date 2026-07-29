import { hashSeed } from './seededRandom';

export interface HeroConstellationArtist {
  name: string;
  plays: number;
  imageUrl: string;
}

export function getLocalDayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Chooses a stable daily set without mutating rank order or using Math.random.
 * The archive fingerprint keeps two different libraries from receiving an
 * accidentally identical constellation on the same day.
 */
export function selectDailyArtistSatellites(
  artists: readonly HeroConstellationArtist[],
  anchorName: string | undefined,
  dayKey: string,
  limit = 4,
): HeroConstellationArtist[] {
  if (limit <= 0) return [];

  const normalizedAnchor = anchorName?.normalize('NFC').trim().toLowerCase();
  const seen = new Set<string>();
  const candidates = artists.filter((artist) => {
    const key = artist.name.normalize('NFC').trim().toLowerCase();
    if (!key || key === normalizedAnchor || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const archiveFingerprint = artists
    .slice(0, 24)
    .map((artist) => `${artist.name.normalize('NFC')}:${artist.plays}`)
    .join('|');

  return candidates
    .map((artist, rank) => ({
      artist,
      rank,
      score: hashSeed(`${dayKey}::${archiveFingerprint}::${artist.name.normalize('NFC')}`),
    }))
    .sort((left, right) => left.score - right.score || left.rank - right.rank)
    .slice(0, Math.min(4, Math.floor(limit)))
    .map(({ artist }) => artist);
}
