import { describe, expect, it } from 'vitest';
import {
  buildArtistMoodProfile as buildEnrichedArtistMoodProfile,
  EMOTIONAL_MOOD_TAXONOMY as ENRICHED_TAXONOMY,
} from './emotionalEngine';
import {
  buildCoreArtistMoodProfile,
  buildCoreEmotionalMapProfile,
  EMOTIONAL_MOOD_TAXONOMY,
} from './moodCore';

describe('lightweight mood core', () => {
  it('keeps the shared visual taxonomy aligned with the enriched engine', () => {
    expect(EMOTIONAL_MOOD_TAXONOMY).toEqual(ENRICHED_TAXONOMY);
    const hebrewCopy = Object.values(EMOTIONAL_MOOD_TAXONOMY)
      .flatMap(mood => [mood.title.he, mood.shortLabel.he, mood.description.he, mood.ritual.he])
      .join(' ');
    expect(hebrewCopy).toMatch(/[\u0590-\u05FF]/);
    expect(hebrewCopy).not.toMatch(/melancholy|פעולת בטון|שקע פיזי/i);
  });

  it('classifies artists without requiring an offline dossier', () => {
    const artist = {
      name: 'Fixture Artist Without Offline Knowledge',
      plays: 320,
      genre: 'synthwave electronic',
      country: 'Unknown',
    };
    expect(buildCoreArtistMoodProfile(artist)).toEqual(buildEnrichedArtistMoodProfile(artist));
  });

  it('builds a stable empty profile for a new archive', () => {
    const profile = buildCoreEmotionalMapProfile([]);
    expect(profile.artists).toEqual([]);
    expect(profile.distribution).toEqual([]);
    expect(profile.dominantMood.key).toBe('calma');
    expect(profile.averageAxis).toEqual({
      energy: 0,
      valence: 0,
      nostalgia: 0,
      catharsis: 0,
      focus: 0,
      darkness: 0,
    });
  });
});
