import { describe, expect, it } from 'vitest';
import {
  buildOfflineArtistKnowledgeSummary,
  getOfflineArtistKnowledge,
  getOfflineArtistKnowledgeStats,
  getOfflineArtistSourceText,
} from './offlineArtistKnowledge';

describe('offline artist knowledge', () => {
  it('ships the complete local top-100 artist knowledge cache', () => {
    const stats = getOfflineArtistKnowledgeStats();

    expect(stats.artistCount).toBe(100);
    expect(stats.matchedCount).toBeGreaterThanOrEqual(99);
    expect(stats.wikidataProfileCount).toBeGreaterThanOrEqual(70);
    expect(stats.wikidataDescriptionCount).toBeGreaterThanOrEqual(70);
    expect(stats.wikidataWebsiteCount).toBeGreaterThanOrEqual(60);
    expect(stats.wikidataImageCount).toBeGreaterThanOrEqual(60);
    expect(stats.wikidataGenreCount).toBeGreaterThanOrEqual(60);
    expect(stats.wikidataCountryCount).toBeGreaterThanOrEqual(60);
    expect(stats.wikidataFormationPlaceCount).toBeGreaterThanOrEqual(50);
    expect(stats.wikidataMemberCount).toBeGreaterThanOrEqual(30);
    expect(stats.curatedProfileCount).toBeGreaterThanOrEqual(1);
    expect(stats.sourceNames).toContain('MusicBrainz');
    expect(stats.sourceNames).toContain('Wikidata');
    expect(stats.sourceNames).toContain('Curated public links');
  });

  it('resolves difficult artist identities through aliases', () => {
    expect(getOfflineArtistKnowledge('nothingnowhere.')?.musicbrainz?.name).toBe('nothing,nowhere.');
    expect(getOfflineArtistKnowledge('Slaves')?.musicbrainz?.name).toBe('Rain City Drive');
    expect(getOfflineArtistKnowledge('Machine Gun Kelly')?.musicbrainz?.name).toBe('mgk');
  });

  it('provides source text that the emotional engine can score', () => {
    const sourceText = getOfflineArtistSourceText('Deafheaven').toLowerCase();

    expect(sourceText).toContain('deafheaven');
    expect(sourceText).toContain('american blackgaze band');
    expect(sourceText).toMatch(/blackgaze|shoegaze|metal/);
  });

  it('keeps Wikidata identifiers beside MusicBrainz matches', () => {
    const bmth = getOfflineArtistKnowledge('Bring Me the Horizon');

    expect(bmth?.musicbrainz?.id).toBe('074e3847-f67f-49f9-81f1-8c8cea147e8e');
    expect(bmth?.wikidata?.id).toBe('Q494784');
    expect(bmth?.wikidata?.description).toBe('British rock band');
    expect(bmth?.wikidata?.genres).toContain('metalcore');
    expect(bmth?.wikidata?.countries).toContain('United Kingdom');
    expect(bmth?.wikidata?.members.length).toBeGreaterThan(0);
    expect(bmth?.wikidata?.officialWebsites[0]).toContain('bmthofficial.com');
  });

  it('keeps curated corrections when automatic matching is weaker than public evidence', () => {
    const odeon = getOfflineArtistKnowledge('Odeon');

    expect(odeon?.archive.country).toBe('Brazil');
    expect(odeon?.musicbrainz).toBeUndefined();
    expect(odeon?.curated?.origin).toBe('Rio de Janeiro, Brazil');
    expect(odeon?.releaseGroups[0]).toMatchObject({
      title: 'game',
      firstReleaseDate: '2022-09-09',
    });
    expect(getOfflineArtistSourceText('Odeon')).toContain('Brazilian post-hardcore/electronic project');
  });

  it('summarizes coverage for an uploaded artist list', () => {
    const summary = buildOfflineArtistKnowledgeSummary([
      { name: 'Bring Me The Horizon', plays: 10, genre: 'Metalcore', country: 'United Kingdom' },
      { name: 'Unknown Future Band', plays: 2, genre: 'Unclassified', country: 'Unknown' },
    ]);

    expect(summary.total_artists).toBe(2);
    expect(summary.matched_artists).toBe(1);
    expect(summary.unmatched_artists).toBe(1);
    expect(summary.wikidata_profile_count).toBeGreaterThanOrEqual(70);
    expect(summary.matched_play_rate_pct).toBe(83.3);
    expect(summary.top_matches[0].matchedName).toBe('Bring Me the Horizon');
    expect(summary.top_missing[0].name).toBe('Unknown Future Band');
  });
});
