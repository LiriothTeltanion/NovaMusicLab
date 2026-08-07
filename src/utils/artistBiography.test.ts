import { describe, expect, it } from 'vitest';

import { buildArtistBiography } from './artistBiography';
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

const paragraph = (
  biography: ReturnType<typeof buildArtistBiography>,
  id: string,
) => biography?.paragraphs.find(entry => entry.id === id);

describe('buildArtistBiography', () => {
  it('says nothing at all when there is nothing verified to say', () => {
    expect(buildArtistBiography(undefined, { lang: 'en' })).toBeNull();
    expect(buildArtistBiography(knowledgeFixture({}), { lang: 'en' })).toBeNull();
  });

  it('keeps a curated paragraph for an artist the offline brain never matched', () => {
    // The brain covers the top 100; twelve curated profiles sit below it. Their
    // dossiers used to show the curated prose, so losing it would be a
    // regression disguised as a rewrite.
    const biography = buildArtistBiography(undefined, {
      lang: 'en',
      editorial: 'A band that reads as transformation energy.',
    });
    expect(biography?.paragraphs).toHaveLength(1);
    expect(paragraph(biography, 'editorial')?.voice).toBe('editorial');
  });

  it('reads a formation year for a group and a birth year for a person', () => {
    // MusicBrainz keeps both in lifeSpanBegin, so reading it blindly turned
    // Post Malone's birth year into the year he "began in Syracuse".
    const band = buildArtistBiography(knowledgeFixture({
      name: 'Band',
      musicbrainz: { id: 'a', score: 100, name: 'Band', type: 'Group', beginArea: 'Sheffield', area: 'United Kingdom', lifeSpanBegin: '2004', aliases: [], tags: [], isnis: [] },
    }), { lang: 'en' });
    expect(paragraph(band, 'identity')?.text).toBe('Band formed in Sheffield, United Kingdom in 2004.');
    expect(band?.lead).toContain('2004 – present');

    const person = buildArtistBiography(knowledgeFixture({
      name: 'Solo',
      musicbrainz: { id: 'b', score: 100, name: 'Solo', type: 'Person', beginArea: 'Syracuse', area: 'United States', lifeSpanBegin: '1995-07-04', aliases: [], tags: [], isnis: [] },
    }), { lang: 'en' });
    expect(paragraph(person, 'identity')?.text).toBe('Solo was born in Syracuse, United States in 1995.');
    expect(person?.lead).toContain('1995');
  });

  it('refuses year values a music database should never hold', () => {
    const biography = buildArtistBiography(knowledgeFixture({
      name: 'Band',
      musicbrainz: { id: 'f', score: 100, name: 'Band', type: 'Group', area: 'Spain', lifeSpanBegin: '0204', aliases: [], tags: [], isnis: [] },
    }), { lang: 'en' });
    expect(paragraph(biography, 'identity')?.text).toBe('Band comes from Spain.');
    expect(biography?.lead).toEqual(['Spain']);
  });

  it('does not call a solo artist a lineup of one', () => {
    // Post Malone's single membership relation is a backing band with no
    // instrument attached, so the columns must stay empty too - suppressing
    // only the sentence still rendered "Current lineup: The Fools For You".
    const biography = buildArtistBiography(knowledgeFixture({
      musicbrainz: { id: 'c', score: 100, name: 'Solo', type: 'Person', area: 'United States', aliases: [], tags: [], isnis: [] },
      bandMembers: [{ name: 'The Fools For You', roles: [], begin: null, end: null, current: true }],
    }), { lang: 'en' });
    expect(paragraph(biography, 'lineup')).toBeUndefined();
    expect(biography?.lineup.current).toEqual([]);
    expect(biography?.lineup.former).toEqual([]);
  });

  it('prefers the country in the reader own language over the catalogue English', () => {
    // MusicBrainz and Wikidata both answer in English, so a Spanish dossier
    // used to say a band comes from "United Kingdom".
    const biography = buildArtistBiography(knowledgeFixture({
      name: 'Banda',
      musicbrainz: { id: 'l', score: 100, name: 'Banda', type: 'Group', beginArea: 'Sheffield', area: 'United Kingdom', lifeSpanBegin: '2004', aliases: [], tags: [], isnis: [] },
    }), { lang: 'es', country: 'Reino Unido' });
    expect(paragraph(biography, 'identity')?.text).toBe('Banda se formó en Sheffield, Reino Unido en 2004.');
  });

  it('agrees in number with one label and one departed member', () => {
    const biography = buildArtistBiography(knowledgeFixture({
      musicbrainz: { id: 'm', score: 100, name: 'Band', type: 'Group', area: 'England', aliases: [], tags: [], isnis: [] },
      releaseGroups: [{ id: '1', title: 'Only', primaryType: 'Album', firstReleaseDate: '2013-06-11' }],
      wikidata: {
        id: 'Q3', url: 'https://www.wikidata.org/entity/Q3', genres: [], countries: [], formationPlaces: [],
        recordLabels: ['Deathwish Inc.'], members: [], occupations: [], instruments: [], instanceOf: [],
        officialWebsites: [], images: [],
      },
      bandMembers: [
        { name: 'Stayer', roles: ['guitar'], begin: '2010', end: null, current: true },
        { name: 'Leaver', roles: ['drums'], begin: '2010', end: '2013', current: false },
      ],
    }), { lang: 'en' });

    expect(paragraph(biography, 'catalogue')?.text).toContain('The label on record is Deathwish Inc.');
    expect(paragraph(biography, 'lineup')?.text).toContain('One more person passed through the group.');
  });

  it('names the people in a lineup, with roles and tenure, split by who is still in it', () => {
    const biography = buildArtistBiography(knowledgeFixture({
      musicbrainz: { id: 'd', score: 100, name: 'Band', type: 'Group', area: 'Norway', aliases: [], tags: [], isnis: [] },
      bandMembers: [
        { name: 'Stayer', roles: ['guitar'], begin: '2004', end: null, current: true },
        { name: 'Leaver', roles: ['drums', 'drums'], begin: '2004', end: '2013', current: false },
      ],
    }), { lang: 'en' });

    // Counting members says less than naming them, and the names were already
    // in the file.
    expect(paragraph(biography, 'lineup')?.text)
      .toBe('The current lineup is Stayer. One more person passed through the group.');
    expect(biography?.lineup.current[0]).toMatchObject({ name: 'Stayer', tenure: '2004 – present' });
    expect(biography?.lineup.former[0]).toMatchObject({ name: 'Leaver', tenure: '2004 – 2013' });
    // Duplicate roles come back from MusicBrainz for members credited twice.
    expect(biography?.lineup.former[0].roles).toEqual(['drums']);
  });

  it('gives a band that ended no current lineup', () => {
    // MusicBrainz never wrote an end date for Type O Negative's last
    // keyboardist, so the raw relations still flag him current sixteen years
    // after the band stopped existing.
    const biography = buildArtistBiography(knowledgeFixture({
      name: 'Ended Band',
      musicbrainz: { id: 'g', score: 100, name: 'Ended Band', type: 'Group', area: 'United States', ended: true, lifeSpanEnd: '2010-04-14', aliases: [], tags: [], isnis: [] },
      bandMembers: [
        { name: 'Never Signed Off', roles: ['keyboard'], begin: '1989', end: null, current: true },
        { name: 'Left Early', roles: ['guitar'], begin: '1989', end: '1996', current: false },
      ],
    }), { lang: 'en' });

    expect(biography?.lineup.current).toHaveLength(0);
    expect(biography?.lineup.ended).toBe(true);
    expect(paragraph(biography, 'lineup')?.text)
      .toBe('Its documented lineup is Never Signed Off and Left Early.');
    expect(paragraph(biography, 'identity')?.text)
      .toBe('Ended Band comes from United States. It stopped being active in 2010.');
  });

  it('states an ending only when a source says the act ended', () => {
    const biography = buildArtistBiography(knowledgeFixture({
      name: 'Band',
      musicbrainz: { id: 'e', score: 100, name: 'Band', type: 'Group', area: 'United States', aliases: [], tags: [], isnis: [] },
    }), { lang: 'en' });
    expect(paragraph(biography, 'identity')?.text).toBe('Band comes from United States.');
  });

  it('drops the tags that describe no style, and keeps the compounds that do', () => {
    // MusicBrainz tags are community free text. Type O Negative's list carries
    // "american" and a Spanish "estados unidos"; Deafheaven's carries "hipster"
    // and "melancholy". None of those is a genre.
    const biography = buildArtistBiography(knowledgeFixture({
      musicbrainz: {
        id: 'h', score: 100, name: 'Band', type: 'Group', area: 'United States', aliases: [], isnis: [],
        tags: ['blackgaze', 'american', 'estados unidos', '2010s', 'seen live', 'melancholy', 'american primitive', 'melancholic black metal'],
      },
      wikidata: {
        id: 'Q2', url: 'https://www.wikidata.org/entity/Q2', genres: ['post-metal', 'blackgaze'], countries: [],
        formationPlaces: [], recordLabels: [], members: [], occupations: [], instruments: [], instanceOf: [],
        officialWebsites: [], images: [],
      },
    }), { lang: 'en' });

    expect(biography?.styles).toEqual([
      'blackgaze', 'american primitive', 'melancholic black metal', 'post-metal',
    ]);
    // Wikidata repeats "blackgaze"; the sentence must not.
    expect(paragraph(biography, 'sound')?.text)
      .toBe('The sources record these styles: blackgaze, american primitive, melancholic black metal and post-metal.');
  });

  it('names the earliest release and never the newest', () => {
    // The newest entry is routinely a reissue or a live recording - Bring Me
    // the Horizon's is a 2026 re-release of their 2006 debut - so naming it as
    // a milestone would state something the catalogue does not.
    const biography = buildArtistBiography(knowledgeFixture({
      musicbrainz: { id: 'i', score: 100, name: 'Band', type: 'Group', area: 'England', aliases: [], tags: [], isnis: [] },
      releaseGroups: [
        { id: '1', title: 'Later Record', primaryType: 'Album', firstReleaseDate: '2015-02-01' },
        { id: '2', title: 'Debut Record', primaryType: 'Album', firstReleaseDate: '2006-10-30' },
        { id: '3', title: 'Debut Record | Repented', primaryType: 'Album', firstReleaseDate: '2026-07-10' },
      ],
    }), { lang: 'en' });

    const catalogue = paragraph(biography, 'catalogue')?.text ?? '';
    expect(catalogue).toContain('3 releases between 2006 and 2026');
    expect(catalogue).toContain('The earliest on record is Debut Record (2006).');
    expect(catalogue).not.toContain('Repented');
    expect(biography?.lead).toContain('3 releases');
  });

  it('does not print a label name with two full stops', () => {
    const biography = buildArtistBiography(knowledgeFixture({
      releaseGroups: [{ id: '1', title: 'Sunbather', primaryType: 'Album', firstReleaseDate: '2013-06-11' }],
      wikidata: {
        id: 'Q1', url: 'https://www.wikidata.org/entity/Q1', genres: [], countries: [], formationPlaces: [],
        recordLabels: ['Deathwish Inc.'], members: [], occupations: [], instruments: [], instanceOf: [],
        officialWebsites: [], images: [],
      },
    }), { lang: 'en' });
    expect(paragraph(biography, 'catalogue')?.text)
      .toBe('The documented catalogue holds a single release in 2013. The earliest on record is Sunbather (2013). The label on record is Deathwish Inc.');
    expect(paragraph(biography, 'catalogue')?.text).not.toContain('Inc..');
  });

  it('closes with the archive, but only when it has a biography to close', () => {
    const withFacts = buildArtistBiography(knowledgeFixture({
      name: 'Band',
      archive: { rank: 3, plays: 2596, genre: 'Rock', country: 'Unknown', topTracks: [], topAlbums: [] },
      musicbrainz: { id: 'j', score: 100, name: 'Band', type: 'Group', area: 'England', aliases: [], tags: [], isnis: [] },
    }), { lang: 'en' });
    expect(paragraph(withFacts, 'archive')?.text)
      .toBe('In your archive it sits at number 3, with 2,596 recorded plays.');
    expect(withFacts?.paragraphs.at(-1)?.id).toBe('archive');

    // A play count alone is a statistic the evidence pills already show, not a
    // life story, so it never stands in for one.
    const alone = buildArtistBiography(knowledgeFixture({
      archive: { rank: 3, plays: 2596, genre: 'Rock', country: 'Unknown', topTracks: [], topAlbums: [] },
    }), { lang: 'en' });
    expect(alone).toBeNull();
  });

  it('puts the museum voice last, after the facts it rests on', () => {
    const biography = buildArtistBiography(knowledgeFixture({
      name: 'Band',
      musicbrainz: { id: 'k', score: 100, name: 'Band', type: 'Group', area: 'England', aliases: [], tags: [], isnis: [] },
    }), { lang: 'en', editorial: 'It reads as transformation energy.' });

    const editorial = biography?.paragraphs.findIndex(entry => entry.voice === 'editorial') ?? -1;
    const documented = biography?.paragraphs.filter(entry => entry.voice === 'documented') ?? [];
    expect(editorial).toBe(biography!.paragraphs.length - 1);
    expect(documented.length).toBeGreaterThan(0);
    expect(biography?.sources).toContain('curated');
  });

  it('joins a Hebrew prefix to a Latin place name with a maqaf', () => {
    // "נוסדה בSheffield" reads as one broken token; Hebrew joins the prefix to
    // a Latin word the way this file's list conjunction already does.
    const latin = buildArtistBiography(knowledgeFixture({
      name: 'Band',
      musicbrainz: { id: 'n', score: 100, name: 'Band', type: 'Group', beginArea: 'Sheffield', area: 'United Kingdom', lifeSpanBegin: '2004', aliases: [], tags: [], isnis: [] },
    }), { lang: 'he' });
    expect(paragraph(latin, 'identity')?.text).toContain('ב־Sheffield');

    // A place already in Hebrew script takes the prefix directly.
    const hebrew = buildArtistBiography(knowledgeFixture({
      name: 'Band',
      musicbrainz: { id: 'o', score: 100, name: 'Band', type: 'Group', area: 'ישראל', lifeSpanBegin: '2004', aliases: [], tags: [], isnis: [] },
    }), { lang: 'he' });
    expect(paragraph(hebrew, 'identity')?.text).toContain('בישראל');
    expect(paragraph(hebrew, 'identity')?.text).not.toContain('ב־');
  });

  it('composes a real top-100 artist in all three languages', () => {
    // The room renders this for whoever the visitor opens, so an artist whose
    // facts produce no sentence would leave a blank panel where the dossier
    // promises a biography.
    for (const lang of ['es', 'en', 'he'] as const) {
      const biography = buildArtistBiography(
        getOfflineArtistKnowledge('Bring Me the Horizon'),
        { lang, editorial: 'Curated line.' },
      );
      expect(biography?.paragraphs.length, lang).toBeGreaterThanOrEqual(5);
      expect(biography?.paragraphs.every(entry => entry.text.trim().length > 0), lang).toBe(true);
      expect(biography?.paragraphs.every(entry => entry.evidence.length > 0), lang).toBe(true);
      expect(biography?.lead.length, lang).toBe(3);
    }
  });
});
