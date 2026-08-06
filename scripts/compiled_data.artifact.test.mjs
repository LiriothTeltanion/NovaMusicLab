import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const compiledDatasetPath = path.join(process.cwd(), 'src', 'data', 'music_dna_compiled.json');
const genreCatalogPath = path.join(process.cwd(), 'src', 'data', 'music_dna_genre_catalog.json');
const artistMetadataPath = path.join(process.cwd(), 'src', 'data', 'artist_meta.json');
const offlineKnowledgePath = path.join(process.cwd(), 'src', 'data', 'offline_artist_knowledge.json');
const artistIdentityRegistryPath = path.join(process.cwd(), 'src', 'data', 'artist_identity_registry.json');
const compiledDataset = JSON.parse(readFileSync(compiledDatasetPath, 'utf8'));
const genreCatalog = JSON.parse(readFileSync(genreCatalogPath, 'utf8'));
const artistMetadata = JSON.parse(readFileSync(artistMetadataPath, 'utf8'));
const offlineKnowledge = JSON.parse(readFileSync(offlineKnowledgePath, 'utf8'));
const artistIdentityRegistry = JSON.parse(readFileSync(artistIdentityRegistryPath, 'utf8'));

function exactIdentityKey(value) {
  return String(value ?? '').normalize('NFC').trim();
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/&/g, 'and')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

const topArtists = compiledDataset.top_artists.slice(0, 100);
const knowledgeByExactName = new Map(offlineKnowledge.artists.map(artist => [artist.name, artist]));
const knowledgeByName = new Map();
for (const artist of offlineKnowledge.artists) {
  const key = normalize(artist.name);
  if (!knowledgeByName.has(key)) knowledgeByName.set(key, artist);
}

function knowledgeForArtist(name) {
  return knowledgeByExactName.get(name) ?? knowledgeByName.get(normalize(name));
}

function dateKeyInTimeZone(date, timeZone = 'Asia/Jerusalem') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function totalsByYear(rows, yearForRow, playsForRow) {
  const totals = new Map();
  for (const row of rows) {
    const year = yearForRow(row);
    totals.set(year, (totals.get(year) ?? 0) + playsForRow(row));
  }
  return totals;
}

describe('bundled compiled music dataset', () => {
  it('keeps the full artist genre catalog complete, unique and outside the main payload', () => {
    const catalogPlays = genreCatalog.reduce((sum, artist) => sum + artist.plays, 0);
    const catalogKeys = new Set(genreCatalog.map(artist => artist.artistKey));
    const catalogByKey = new Map(genreCatalog.map(artist => [artist.artistKey, artist]));
    const familyPlays = new Map();

    for (const artist of genreCatalog) {
      familyPlays.set(
        artist.automaticFamily,
        (familyPlays.get(artist.automaticFamily) ?? 0) + artist.plays,
      );
      expect(artist.artistKey, artist.name).toBe(artist.name.normalize('NFC').trim());
      // 'observed' joined 'catalog' and 'unclassified' when the MusicBrainz
      // layer landed: a genre nobody curated, but sourced and attributable.
      expect(
        ['catalog', 'observed', 'unclassified'].includes(artist.source),
        `${artist.name} source "${artist.source}"`,
      ).toBe(true);
    }

    expect(compiledDataset).not.toHaveProperty('artist_genre_catalog');
    expect(genreCatalog).toHaveLength(compiledDataset.core_metrics.unique_artists);
    expect(catalogKeys.size).toBe(genreCatalog.length);
    expect(catalogPlays).toBe(compiledDataset.core_metrics.total_plays);

    for (const artist of topArtists) {
      expect(catalogByKey.get(exactIdentityKey(artist.name))).toMatchObject({
        name: artist.name,
        plays: artist.plays,
        automaticGenre: artist.genre,
        country: artist.country,
      });
    }

    expect(Object.fromEntries(familyPlays)).toEqual(Object.fromEntries(
      compiledDataset.top_genres.map(genre => [genre.name, genre.plays]),
    ));
  });

  /**
   * The ledger, and the reason this test can be trusted after a recompile.
   *
   * Remembered constants cannot tell "the archive grew" apart from "the parser
   * broke" - both look like a changed number. This identity can: every counted
   * play is a raw row from some source, minus the Spotify rows under 30s, minus
   * the cross-source duplicates. If it balances, the merge is sound whatever
   * the totals happen to be. It is asserted with no literals at all.
   */
  it('balances the source ledger, whatever the archive currently holds', () => {
    const s = compiledDataset.source_summary;
    const ledger = (s.spotify_plays - s.spotify_short_plays)
      + s.lastfm_plays
      + s.youtube_plays
      + (s.apple_music_plays ?? 0)
      + (s.listenbrainz_plays ?? 0)
      - s.cross_source_duplicates;

    expect(ledger).toBe(s.merged_plays);
    expect(s.merged_plays).toBe(compiledDataset.core_metrics.total_plays);
  });

  /**
   * Bands, not points. A ratio that drifts more than a few points on a small
   * data increase means the parsing rules changed, not the archive - which is
   * exactly the failure a hardcoded total cannot distinguish from growth.
   */
  it('keeps the parsing ratios inside their measured bands', () => {
    const s = compiledDataset.source_summary;
    const shortPlayRate = s.spotify_short_plays / s.spotify_plays * 100;
    const dedupeRate = s.cross_source_duplicates
      / (s.spotify_plays - s.spotify_short_plays + s.lastfm_plays + s.youtube_plays) * 100;

    // Measured 60.38% before the 2026-08 refresh, 59.68% after.
    expect(shortPlayRate).toBeGreaterThan(50);
    expect(shortPlayRate).toBeLessThan(70);
    // Measured 29.7% before, 31.7% after.
    expect(dedupeRate).toBeGreaterThan(20);
    expect(dedupeRate).toBeLessThan(45);
  });

  it('keeps the merged source totals and YouTube import coverage intact', () => {
    expect(compiledDataset.core_metrics).toMatchObject({
      total_plays: 82661,
      unique_artists: 6593,
      unique_tracks: 20908,
    });

    // Exact on purpose: these are the ledger's own components, so a silent
    // change in any one of them is precisely what we want to catch.
    expect(compiledDataset.source_summary).toMatchObject({
      source_type: 'merged',
      lastfm_plays: 52490,
      // 1,987 until "oliver tree" was added to artist_meta.json, then 2,021.
      // That coupling is real and easy to trip over: the YouTube parser only
      // credits an "Artist - Track" title when the artist is in the bundled
      // catalogue, so curating one artist made 34 of his videos countable.
      youtube_plays: 2021,
      spotify_plays: 164847,
      merged_plays: 82661,
      cross_source_duplicates: 38322,
    });
    expect(compiledDataset.source_summary.merged_plays).toBe(compiledDataset.core_metrics.total_plays);

    // The compiler stamps these behind --flagship because the parser cannot
    // know them; without the flag a recompile silently downgrades the museum.
    expect(compiledDataset.narrative_scope).toBe('flagship');
    expect(compiledDataset.project).toContain('Last.fm CSV');
    expect(compiledDataset.project).toContain('Spotify JSON');
    expect(compiledDataset.project).toContain('YouTube');

    const originCountries = Array.isArray(compiledDataset.artist_origin_countries)
      ? compiledDataset.artist_origin_countries
      : [];
    expect(Array.isArray(compiledDataset.artist_origin_countries)).toBe(true);
    expect(originCountries.length).toBeGreaterThan(0);
    expect(originCountries.reduce((total, country) => total + country.plays, 0))
      .toBeLessThanOrEqual(compiledDataset.core_metrics.total_plays);
  });

  it('keeps canonical, compiled and offline archive metadata synchronized', () => {
    const compiledNames = topArtists.map(artist => exactIdentityKey(artist.name)).sort();
    const knowledgeNames = offlineKnowledge.artists.map(artist => exactIdentityKey(artist.name)).sort();
    expect(knowledgeNames).toEqual(compiledNames);

    for (const artist of topArtists) {
      const canonical = artistMetadata[artist.name.normalize('NFC').trim().toLowerCase()];
      const offline = knowledgeForArtist(artist.name);

      expect(canonical, artist.name).toBeDefined();
      expect(artist.country, artist.name).toBe(canonical.country);
      expect(artist.genre, artist.name).toBe(canonical.genre);
      expect(offline?.archive.country, artist.name).toBe(artist.country);
      expect(offline?.archive.genre, artist.name).toBe(artist.genre);
    }
  });

  it('keeps daily, monthly, yearly and core totals on one exact basis', () => {
    const dailyRows = Object.entries(compiledDataset.daily_plays).sort(([left], [right]) => left.localeCompare(right));
    const dailyTotal = dailyRows.reduce((sum, [, plays]) => sum + plays, 0);
    const monthlyTotal = compiledDataset.monthly_activity.reduce((sum, row) => sum + row.plays, 0);
    const yearlyTotal = compiledDataset.yearly_eras.reduce((sum, row) => sum + row.plays, 0);
    const activeDays = dailyRows.filter(([, plays]) => plays > 0).length;
    const dailyByYear = totalsByYear(dailyRows, ([dateKey]) => Number(dateKey.slice(0, 4)), ([, plays]) => plays);
    const monthlyByYear = totalsByYear(compiledDataset.monthly_activity, row => row.year, row => row.plays);
    const yearlyByYear = totalsByYear(compiledDataset.yearly_eras, row => row.year, row => row.plays);

    expect(dailyTotal).toBe(compiledDataset.core_metrics.total_plays);
    expect(monthlyTotal).toBe(compiledDataset.core_metrics.total_plays);
    expect(yearlyTotal).toBe(compiledDataset.core_metrics.total_plays);
    expect(activeDays).toBe(compiledDataset.core_metrics.active_days);

    for (const year of yearlyByYear.keys()) {
      expect(dailyByYear.get(year), `daily ${year}`).toBe(yearlyByYear.get(year));
      expect(monthlyByYear.get(year), `monthly ${year}`).toBe(yearlyByYear.get(year));
    }
  });

  it('keeps observed bounds honest and excludes future calendar dates', () => {
    const dateKeys = Object.keys(compiledDataset.daily_plays).sort();
    const dataMinDate = dateKeys[0];
    const dataMaxDate = dateKeys.at(-1);
    const today = dateKeyInTimeZone(new Date());
    const generatedDate = dateKeyInTimeZone(new Date(compiledDataset.generated_at));

    // The start date staying put is the signal here. If it ever moves, an
    // export came back truncated or the year gate misfired - the end date is
    // supposed to advance with each refresh, the beginning is not.
    expect(dataMinDate).toBe('2015-03-01');
    expect(dataMaxDate).toBe('2026-08-06');
    expect(dataMaxDate <= today).toBe(true);
    expect(generatedDate >= dataMaxDate).toBe(true);
  });

  it('reports top-100 coverage against the complete archive denominator', () => {
    const top100Plays = topArtists.reduce((sum, artist) => sum + artist.plays, 0);
    const totalPlays = compiledDataset.core_metrics.total_plays;

    expect(top100Plays).toBe(43647);
    expect(top100Plays).toBeLessThan(totalPlays);
    // 53.3% before the 2026-08 refresh. The share barely moving while the
    // archive grew is itself the evidence the head of the distribution is
    // stable and nothing was double-counted.
    expect((top100Plays / totalPlays) * 100).toBeCloseTo(52.8, 1);
    expect(totalPlays - top100Plays).toBe(39014);
  });

  it('derives the current knowledge summary from the synchronized offline source', () => {
    const matchedArtists = topArtists.filter(artist => {
      const knowledge = knowledgeForArtist(artist.name);
      return Boolean(knowledge?.musicbrainz || knowledge?.curated);
    });
    const wikidataProfiles = offlineKnowledge.artists.filter(artist => artist.wikidata?.id).length;

    // 78 before the 2026-08 refresh. This going UP is fine; it going down is a
    // work item, not a number to edit - it would mean a new top-100 artist has
    // no Wikidata profile and the dossier will render thin.
    expect(offlineKnowledge.artists).toHaveLength(topArtists.length);
    expect(matchedArtists).toHaveLength(100);
    expect(wikidataProfiles).toBe(79);
    expect(matchedArtists.reduce((sum, artist) => sum + artist.plays, 0)).toBe(43647);
  });

  it('matches every unambiguous Wikidata country in the bundled top 100', () => {
    for (const artist of topArtists) {
      const countries = knowledgeForArtist(artist.name)?.wikidata?.countries ?? [];
      if (countries.length === 1) {
        expect(artist.country, artist.name).toBe(countries[0]);
      }
    }
  });

  it('keeps every evidence-backed artist identity canonical across the compiled artifact', () => {
    const artistLabels = [
      ...compiledDataset.top_artists.map(artist => ({ view: 'top_artists', name: artist.name })),
      ...compiledDataset.top_tracks.map(track => ({ view: 'top_tracks', name: track.artist })),
      ...compiledDataset.top_albums.map(album => ({ view: 'top_albums', name: album.artist })),
      ...compiledDataset.yearly_eras.map(era => ({ view: 'yearly_eras', name: era.top_artist })),
      ...compiledDataset.sessions.map(session => ({ view: 'sessions', name: session.top_artist })),
      ...compiledDataset.obsessions.map(obsession => ({ view: 'obsessions', name: obsession.artist })),
    ];

    for (const identity of artistIdentityRegistry.identities) {
      const canonicalRows = compiledDataset.top_artists
        .filter(artist => exactIdentityKey(artist.name) === exactIdentityKey(identity.canonical));
      const knowledge = knowledgeForArtist(identity.canonical);
      const registeredMbid = identity.evidence?.musicbrainz?.id;
      const registeredQid = identity.evidence?.wikidata?.id;
      expect(canonicalRows, identity.canonical).toHaveLength(1);
      expect(registeredMbid, identity.canonical)
        .toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(registeredQid, identity.canonical).toMatch(/^Q[1-9]\d*$/);
      expect(knowledge?.musicbrainz?.id, identity.canonical).toBe(registeredMbid);
      expect(knowledge?.wikidata?.id, identity.canonical).toBe(registeredQid);

      for (const alias of identity.aliases) {
        const leaks = artistLabels.filter(row => exactIdentityKey(row.name) === exactIdentityKey(alias));
        expect(leaks, `${identity.canonical} leaked as ${alias}`).toEqual([]);
      }
    }
  });

  it('keeps generic genres below both artist and play-share budgets', () => {
    const generic = topArtists.filter(artist => ['Alternative', 'Unclassified'].includes(artist.genre));
    const totalPlays = topArtists.reduce((sum, artist) => sum + artist.plays, 0);
    const genericPlays = generic.reduce((sum, artist) => sum + artist.plays, 0);

    expect(generic.length).toBeLessThanOrEqual(15);
    expect((generic.length / topArtists.length) * 100).toBeLessThanOrEqual(15);
    expect((genericPlays / totalPlays) * 100).toBeLessThanOrEqual(8);
  });
});
