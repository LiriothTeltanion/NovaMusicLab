import { describe, expect, it } from 'vitest';
import gallery from './artist_gallery.json';
import knowledge from './offline_artist_knowledge.json';
import { getDailyPhotoIndex } from '../utils/artistGallery';

const entries = gallery as Record<string, Array<{ url: string; source: string }>>;
const VALID_SOURCES = new Set(['wikipedia', 'spotify', 'deezer', 'wikimedia']);

/**
 * Commons serves the same file through multiple URL shapes
 * (commons.wikimedia.org/wiki/Special:FilePath/X vs.
 * upload.wikimedia.org/.../thumb/.../NNNpx-X) - a raw string dedup misses
 * that two "different" URLs are actually the same photo. Mirrors
 * wikimediaFileKey() in scripts/expand_artist_gallery_v2.mjs.
 */
function wikimediaFileKey(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === 'commons.wikimedia.org' && u.pathname.startsWith('/wiki/Special:FilePath/')) {
      return decodeURIComponent(u.pathname.replace('/wiki/Special:FilePath/', '')).replace(/_/g, ' ').toLowerCase();
    }
    if (u.hostname === 'upload.wikimedia.org') {
      const parts = u.pathname.split('/').filter(Boolean);
      const last = decodeURIComponent(parts[parts.length - 1] || '').replace(/^\d+px-/, '');
      return last.replace(/_/g, ' ').toLowerCase();
    }
  } catch { /* not a valid URL */ }
  return url;
}

describe('artist_gallery.json stability', () => {
  it('has valid photo shapes, sources and https URLs with no duplicates per artist', () => {
    for (const [artist, photos] of Object.entries(entries)) {
      expect(photos.length, artist).toBeGreaterThan(0);
      expect(photos.length, artist).toBeLessThanOrEqual(4);
      const seen = new Set<string>();
      for (const photo of photos) {
        expect(photo.url, `${artist} url`).toMatch(/^https:\/\//);
        expect(VALID_SOURCES.has(photo.source), `${artist} source "${photo.source}"`).toBe(true);
        expect(seen.has(photo.url), `${artist} duplicate url`).toBe(false);
        seen.add(photo.url);
        const fileKey = wikimediaFileKey(photo.url);
        expect(seen.has(`file:${fileKey}`), `${artist} duplicate photo (same file, different URL shape)`).toBe(false);
        seen.add(`file:${fileKey}`);
      }
    }
  });

  it('keys are lowercase and match knowledge artists', () => {
    const known = new Set(
      (knowledge as { artists: Array<{ name: string }> }).artists.map(a => a.name.toLowerCase()),
    );
    for (const key of Object.keys(entries)) {
      expect(key, `key not lowercase: ${key}`).toBe(key.toLowerCase());
      expect(known.has(key), `gallery key without knowledge row: ${key}`).toBe(true);
    }
  });

  it('meets coverage thresholds (multi-photo museum)', () => {
    const total = Object.keys(entries).length;
    const multi = Object.values(entries).filter(p => p.length >= 2).length;
    expect(total).toBeGreaterThanOrEqual(95);
    expect(multi).toBeGreaterThanOrEqual(85);
  });

  it('keeps Slaves gallery focused on the real American band, not generic slavery media', () => {
    const slaves = entries.slaves ?? [];
    expect(slaves.length).toBeGreaterThanOrEqual(2);
    expect(slaves[0]?.url).toContain('Slaves_American_band.jpg');
    for (const photo of slaves) {
      expect(photo.url).not.toMatch(/fileicon|Newly_released_Slaves|Cargo_of_Newly_released_Slaves|Slavery/i);
    }
  });
});

describe('getDailyPhotoIndex', () => {
  it('is deterministic for the same artist and date', () => {
    const date = new Date(2026, 6, 5);
    expect(getDailyPhotoIndex('deafheaven', 3, date)).toBe(getDailyPhotoIndex('deafheaven', 3, date));
  });

  it('always stays within range and returns 0 for single-photo galleries', () => {
    const date = new Date(2026, 6, 5);
    for (const [artist, photos] of Object.entries(entries)) {
      const idx = getDailyPhotoIndex(artist, photos.length, date);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(Math.max(photos.length, 1));
    }
    expect(getDailyPhotoIndex('anyone', 1, date)).toBe(0);
  });

  it('rotates across days for at least some artists', () => {
    const monday = new Date(2026, 6, 6);
    const tuesday = new Date(2026, 6, 7);
    const rotated = Object.entries(entries)
      .filter(([, photos]) => photos.length >= 2)
      .filter(([artist, photos]) =>
        getDailyPhotoIndex(artist, photos.length, monday) !== getDailyPhotoIndex(artist, photos.length, tuesday),
      );
    expect(rotated.length).toBeGreaterThan(10);
  });
});

describe('bandMembers enrichment stability', () => {
  const artists = (knowledge as {
    artists: Array<{ name: string; bandMembers?: Array<{ name: string; roles: string[]; current: boolean }> }>;
  }).artists;

  it('has well-formed member rows', () => {
    for (const artist of artists) {
      for (const member of artist.bandMembers ?? []) {
        expect(member.name.trim().length, artist.name).toBeGreaterThan(0);
        expect(Array.isArray(member.roles), artist.name).toBe(true);
        expect(typeof member.current, artist.name).toBe('boolean');
      }
    }
  });

  it('meets lineup coverage thresholds', () => {
    const withMembers = artists.filter(a => a.bandMembers?.length);
    const totalRows = artists.reduce((sum, a) => sum + (a.bandMembers?.length ?? 0), 0);
    expect(withMembers.length).toBeGreaterThanOrEqual(60);
    expect(totalRows).toBeGreaterThanOrEqual(400);
  });
});
