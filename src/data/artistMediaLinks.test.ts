import { describe, expect, it } from 'vitest';
import mediaLinks from './artist_media_links.json';
import knowledge from './offline_artist_knowledge.json';
import type { CuratedArtistMedia } from '../utils/mediaLinks';

/**
 * Stability contract for the curated artist media database. These run in CI
 * with no network: they pin the shape, uniqueness and minimum coverage of
 * artist_media_links.json so a bad regeneration can never ship silently.
 */
const entries = mediaLinks as CuratedArtistMedia[];

const URL_SHAPES: Array<[keyof CuratedArtistMedia, RegExp]> = [
  ['spotifyArtistUrl', /^https:\/\/open\.spotify\.com\/artist\/[A-Za-z0-9]+/],
  ['spotifyAlbumUrl', /^https:\/\/open\.spotify\.com\/album\/[A-Za-z0-9]+/],
  ['spotifyTrackUrl', /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+/],
  // channel/user/@handle/c/ plus bare legacy vanity URLs (youtube.com/name)
  ['youtubeChannelUrl', /^https:\/\/(www\.)?youtube\.com\/(channel\/|user\/|@|c\/|[\w.-]+$)/],
  ['wikipediaEnUrl', /^https:\/\/en\.wikipedia\.org\/wiki\/.+/],
  ['wikipediaEsUrl', /^https:\/\/es\.wikipedia\.org\/wiki\/.+/],
];

describe('artist_media_links.json stability', () => {
  it('has no duplicate artists across names and aliases', () => {
    const seen = new Map<string, string>();
    for (const entry of entries) {
      // An alias may repeat its own entry's name (case variants are fine);
      // only collisions across DIFFERENT entries indicate a forked artist.
      const keys = new Set([entry.artist, ...(entry.aliases ?? [])].map(n => n.trim().toLowerCase()));
      for (const key of keys) {
        const existing = seen.get(key);
        expect(existing, `"${key}" appears in both "${existing}" and "${entry.artist}"`).toBeUndefined();
        seen.set(key, entry.artist);
      }
    }
  });

  it('every entry has a non-empty artist and a valid confidence', () => {
    for (const entry of entries) {
      expect(entry.artist?.trim().length, JSON.stringify(entry).slice(0, 80)).toBeGreaterThan(0);
      if (entry.mediaConfidence) {
        expect(['verified', 'partial', 'search']).toContain(entry.mediaConfidence);
      }
    }
  });

  it('all provider URLs match their expected shapes', () => {
    for (const entry of entries) {
      for (const [field, shape] of URL_SHAPES) {
        const value = entry[field];
        if (typeof value === 'string') {
          expect(value, `${entry.artist} · ${field}`).toMatch(shape);
        }
      }
      for (const field of ['officialSiteUrl', 'youtubeVideoUrl', 'youtubePlaylistUrl', 'officialAudioUrl', 'livePerformanceUrl'] as const) {
        const value = entry[field];
        if (typeof value === 'string') {
          expect(value, `${entry.artist} · ${field}`).toMatch(/^https?:\/\//);
        }
      }
    }
  });

  it('covers every artist in the offline knowledge base', () => {
    const index = new Set<string>();
    for (const entry of entries) {
      index.add(entry.artist.toLowerCase());
      for (const alias of entry.aliases ?? []) index.add(alias.toLowerCase());
    }
    const missing = (knowledge as { artists: Array<{ name: string }> }).artists
      .filter(a => !index.has(a.name.toLowerCase()))
      .map(a => a.name);
    expect(missing, `knowledge artists without a media entry: ${missing.join(', ')}`).toEqual([]);
  });

  it('meets minimum link coverage thresholds', () => {
    const count = (field: keyof CuratedArtistMedia) => entries.filter(e => e[field]).length;
    expect(count('spotifyArtistUrl')).toBeGreaterThanOrEqual(85);
    expect(count('youtubeChannelUrl')).toBeGreaterThanOrEqual(65);
    expect(entries.filter(e => e.wikipediaEnUrl || e.wikipediaEsUrl).length).toBeGreaterThanOrEqual(65);
  });

  it('pins newly canonicalized artists to evidence-backed provider identifiers', () => {
    const expected = {
      'Amr Diab': {
        spotifyArtistUrl: 'https://open.spotify.com/artist/5abSRg0xN1NV3gLbuvX24M',
        youtubeChannelUrl: 'https://www.youtube.com/channel/UCpui0-2JqcAcII4ybpB1q3w',
      },
      'Sigur Rós': {
        spotifyArtistUrl: 'https://open.spotify.com/artist/6UUrUCIZtQeOf8tC0WuzRy',
        youtubeChannelUrl: 'https://www.youtube.com/channel/UCAmt29QykFXnuIqQoEEnEFg',
      },
      'Aviv Geffen': {
        spotifyArtistUrl: 'https://open.spotify.com/artist/73ieysHN7XpJYEnEAYsO3K',
        youtubeChannelUrl: 'https://www.youtube.com/channel/UCem7pt_OUc85xKNQz1jH8JQ',
      },
    };

    for (const [artist, providers] of Object.entries(expected)) {
      const entry = entries.find(candidate => candidate.artist === artist);
      expect(entry, artist).toBeDefined();
      expect(entry, artist).toMatchObject({
        mediaConfidence: 'verified',
        ...providers,
      });
      expect(entry?.youtubeVideoUrl, `${artist} embeddable media`).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
    }
  });
});
