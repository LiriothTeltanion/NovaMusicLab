import { describe, expect, it } from 'vitest';
import {
  buildEmotionalMapEngineProfile,
  buildAlbumEmotionalReading,
  buildArtistEmotionalReading,
  buildMusicItemMoodProfile,
  buildTrackEmotionalReading,
} from './emotionalEngine';
import type { TopAlbum, TopArtist, TopTrack } from '../types';

const artist: TopArtist = {
  name: 'Test Horizon',
  plays: 1200,
  genre: 'Metalcore / Synthwave',
  country: 'United Kingdom',
};

const track: TopTrack = {
  artist: 'Test Horizon',
  title: 'Neon Collapse',
  plays: 720,
  genre: 'Metalcore / Synthwave',
};

const album: TopAlbum = {
  artist: 'Test Horizon',
  title: 'Neon Archive',
  plays: 480,
};

describe('emotional engine', () => {
  it('creates bilingual artist readings from archive evidence', () => {
    const reading = buildArtistEmotionalReading({
      artist,
      albums: [album],
      tracks: [track],
      eras: [{ year: 2026, plays: 900, unique_artists: 40, unique_tracks: 200, top_artist: artist.name, top_track: track.title, dominant_daypart: 'Noche 18-23', era_label: 'Era de Test Horizon', era_desc: '', diversity_index: 50 }],
    });

    expect(reading.longNarrative.es).toContain('Test Horizon');
    expect(reading.longNarrative.en).toContain('Test Horizon');
    expect(reading.evidence.es).toHaveLength(4);
    expect(reading.axis.catharsis).toBeGreaterThan(50);
  });

  it('creates album and track readings with recommended use in both languages', () => {
    const albumReading = buildAlbumEmotionalReading({
      album,
      artist,
      rank: 2,
      artistTracks: [track],
      catalogIndex: 1,
    });
    const trackReading = buildTrackEmotionalReading({
      track,
      artist,
      rank: 3,
      artistTracks: [track],
      artistAlbums: [album],
      eras: [],
    });

    expect(albumReading.listeningUse.es).toMatch(/Escúchalo/);
    expect(albumReading.listeningUse.en).toMatch(/Play it/);
    expect(albumReading.moodKey).toBeTruthy();
    expect(albumReading.moodConfidence).toBeGreaterThan(0);
    expect(trackReading.longNarrative.es).toContain('Neon Collapse');
    expect(trackReading.longNarrative.en).toContain('Neon Collapse');
    expect(trackReading.moodKey).toBeTruthy();
    expect(trackReading.moodConfidence).toBeGreaterThan(0);
    expect(trackReading.evidence.en.join(' ')).toContain('Rank #3');
  });

  it('builds a mood distribution for the emotional map', () => {
    const profile = buildEmotionalMapEngineProfile([
      artist,
      { ...artist, name: 'Neon Valley', genre: 'Synthwave / Darksynth', plays: 900 },
      { ...artist, name: 'Soft Focus', genre: 'Ambient / Post-Rock', plays: 500 },
    ]);

    expect(profile.artists).toHaveLength(3);
    expect(profile.distribution.length).toBeGreaterThan(0);
    expect(profile.dominantMood.title.en).toBeTruthy();
    expect(profile.averageAxis.energy).toBeGreaterThan(0);
  });

  it('creates lightweight mood profiles for list rows', () => {
    const profile = buildMusicItemMoodProfile('Synthwave night drive neon city', 320);

    expect(profile.moodKey).toBe('futurismo');
    expect(profile.confidence).toBeGreaterThan(0);
    expect(profile.axis.energy).toBeGreaterThan(0);
  });

  it('adds offline artist facts to real emotional readings', () => {
    const reading = buildArtistEmotionalReading({
      artist: {
        name: 'Bring Me the Horizon',
        plays: 2400,
        genre: 'Metalcore / Alternative Rock',
        country: 'United Kingdom',
      },
      albums: [],
      tracks: [],
      eras: [],
    });

    expect(reading.longNarrative.en).toContain('In the emotional engine');
    expect(reading.longNarrative.es).toContain('En el motor emocional');
    expect(reading.evidence.en.some(item => item.includes('MusicBrainz'))).toBe(true);
    expect(reading.evidence.en.some(item => item.includes('Wikidata'))).toBe(true);
  });
});
