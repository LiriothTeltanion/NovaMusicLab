import { describe, expect, it } from 'vitest';

import { buildArtistStory } from './artistStory';
import { getOfflineArtistKnowledge } from './offlineArtistKnowledge';
import type { OfflineArtistKnowledge } from './offlineArtistKnowledge';

/** Minimal shape so each case states only the fields it is about. */
function knowledgeFixture(overrides: Partial<OfflineArtistKnowledge>): OfflineArtistKnowledge {
  return {
    name: 'Test Act',
    normalizedName: 'test act',
    archive: { rank: 1, plays: 10, genre: 'Rock', country: 'Unknown', topTracks: [], topAlbums: [] },
    releaseGroups: [],
    emotionalSeeds: { sourceText: '', tags: [], activeYears: [], releaseYears: [] },
    fetchStatus: 'matched',
    ...overrides,
  } as OfflineArtistKnowledge;
}

describe('buildArtistStory', () => {
  it('says nothing at all when there is nothing verified to say', () => {
    expect(buildArtistStory(undefined, 'en')).toBeNull();
    expect(buildArtistStory(knowledgeFixture({}), 'en')).toBeNull();
  });

  it('reads a formation year for a group and a birth year for a person', () => {
    // MusicBrainz keeps both in lifeSpanBegin, so reading it blindly turned
    // Post Malone's birth year into the year he "began in Syracuse".
    const band = buildArtistStory(knowledgeFixture({
      musicbrainz: { id: 'a', score: 100, name: 'Band', type: 'Group', beginArea: 'Sheffield', area: 'United Kingdom', lifeSpanBegin: '2004', aliases: [], tags: [], isnis: [] },
    }), 'en');
    expect(band?.chapters[0].text).toBe('Formed in Sheffield, United Kingdom in 2004.');
    expect(band?.formedYear).toBe(2004);

    const person = buildArtistStory(knowledgeFixture({
      musicbrainz: { id: 'b', score: 100, name: 'Solo', type: 'Person', beginArea: 'Syracuse', area: 'United States', lifeSpanBegin: '1995-07-04', aliases: [], tags: [], isnis: [] },
    }), 'en');
    expect(person?.chapters[0].text).toBe('Born in Syracuse, United States in 1995.');
    expect(person?.formedYear).toBeNull();
  });

  it('does not call a solo artist a lineup of one', () => {
    const story = buildArtistStory(knowledgeFixture({
      musicbrainz: { id: 'c', score: 100, name: 'Solo', type: 'Person', area: 'United States', aliases: [], tags: [], isnis: [] },
      bandMembers: [{ name: 'Solo', roles: ['vocals'], begin: '2015', end: null, current: true }],
    }), 'en');
    expect(story?.chapters.some(chapter => chapter.id === 'lineup')).toBe(false);
  });

  it('keeps a real lineup, with roles and tenure, split by who is still in it', () => {
    const story = buildArtistStory(knowledgeFixture({
      musicbrainz: { id: 'd', score: 100, name: 'Band', type: 'Group', area: 'Norway', aliases: [], tags: [], isnis: [] },
      bandMembers: [
        { name: 'Stayer', roles: ['guitar'], begin: '2004', end: null, current: true },
        { name: 'Leaver', roles: ['drums', 'drums'], begin: '2004', end: '2013', current: false },
      ],
    }), 'en');

    expect(story?.chapters.find(chapter => chapter.id === 'lineup')?.text)
      .toBe('Documented lineup: 1 current member and 1 former member.');
    expect(story?.lineup.current[0]).toMatchObject({ name: 'Stayer', tenure: '2004 – present' });
    expect(story?.lineup.former[0]).toMatchObject({ name: 'Leaver', tenure: '2004 – 2013' });
    // Duplicate roles come back from MusicBrainz for members credited twice.
    expect(story?.lineup.former[0].roles).toEqual(['drums']);
  });

  it('does not print a label name with two full stops', () => {
    const story = buildArtistStory(knowledgeFixture({
      wikidata: {
        id: 'Q1', url: 'https://www.wikidata.org/entity/Q1', genres: [], countries: [], formationPlaces: [],
        recordLabels: ['Deathwish Inc.'], members: [], occupations: [], instruments: [], instanceOf: [],
        officialWebsites: [], images: [],
      },
    }), 'en');
    expect(story?.chapters.find(chapter => chapter.id === 'labels')?.text)
      .toBe('Released through Deathwish Inc.');
  });

  it('states an ending only when a source says the act ended', () => {
    const base = {
      musicbrainz: { id: 'e', score: 100, name: 'Band', type: 'Group', area: 'United States', aliases: [], tags: [], isnis: [] },
    };
    expect(buildArtistStory(knowledgeFixture(base), 'en')?.chapters.some(c => c.id === 'status')).toBe(false);

    const ended = buildArtistStory(knowledgeFixture({
      musicbrainz: { ...base.musicbrainz, ended: true, lifeSpanEnd: '2010-04-14' },
    }), 'en');
    expect(ended?.chapters.find(c => c.id === 'status')?.text).toBe('No longer active as of 2010.');
  });

  it('refuses year values a music database should never hold', () => {
    const story = buildArtistStory(knowledgeFixture({
      musicbrainz: { id: 'f', score: 100, name: 'Band', type: 'Group', area: 'Spain', lifeSpanBegin: '0204', aliases: [], tags: [], isnis: [] },
    }), 'en');
    expect(story?.formedYear).toBeNull();
    expect(story?.chapters[0].text).toBe('Comes from Spain.');
  });

  it('composes every top-100 artist in all three languages', () => {
    // The room renders this for whoever the visitor opens, so an artist whose
    // facts produce no sentence would leave a blank panel where the dossier
    // promises a story.
    for (const lang of ['es', 'en', 'he'] as const) {
      const story = buildArtistStory(getOfflineArtistKnowledge('Bring Me the Horizon'), lang);
      expect(story?.chapters.length, lang).toBeGreaterThanOrEqual(3);
      expect(story?.chapters.every(chapter => chapter.text.trim().length > 0), lang).toBe(true);
    }
  });
});
