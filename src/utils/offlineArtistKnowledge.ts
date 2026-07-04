import offlineKnowledge from '../data/offline_artist_knowledge.json';
import type { ArtistKnowledgeSummary, TopArtist } from '../types';
import { normalizeCatalogName } from './artistEnrichment';

export interface OfflineArtistReleaseGroup {
  id: string;
  title: string;
  primaryType: string;
  firstReleaseDate?: string;
}

export interface OfflineArtistWikidataFacts {
  id: string;
  url: string;
  label?: string;
  description?: string;
  genres: string[];
  countries: string[];
  formationPlaces: string[];
  recordLabels: string[];
  members: string[];
  occupations: string[];
  instruments: string[];
  instanceOf: string[];
  officialWebsites: string[];
  images: string[];
  inception?: string;
  birthDate?: string;
}

export interface OfflineArtistCuratedFacts {
  name: string;
  sourceName: string;
  sourceUrls: string[];
  origin: string;
  country: string;
  description: string;
  background: string;
  tags: string[];
  activeYears: string[];
}

export interface OfflineArtistKnowledge {
  name: string;
  normalizedName: string;
  archive: {
    rank: number;
    plays: number;
    genre: string;
    country: string;
    topTracks: string[];
    topAlbums: string[];
  };
  musicbrainz?: {
    id: string;
    score: number;
    name: string;
    sortName?: string;
    type?: string;
    country?: string;
    area?: string;
    beginArea?: string;
    lifeSpanBegin?: string;
    lifeSpanEnd?: string;
    ended?: boolean;
    disambiguation?: string;
    aliases: string[];
    tags: string[];
    isnis: string[];
  };
  wikidata?: OfflineArtistWikidataFacts;
  curated?: OfflineArtistCuratedFacts;
  releaseGroups: OfflineArtistReleaseGroup[];
  emotionalSeeds: {
    sourceText: string;
    tags: string[];
    activeYears: string[];
    releaseYears: number[];
  };
  fetchStatus: 'matched' | 'not_found' | 'error';
  errors?: string[];
}

interface OfflineArtistKnowledgeDatabase {
  meta: {
    schemaVersion: number;
    generatedAt: string | null;
    artistCount: number;
    sources: Array<{
      name: string;
      url: string;
      licenseNote: string;
    }>;
    notes: string[];
  };
  artists: OfflineArtistKnowledge[];
}

const database = offlineKnowledge as OfflineArtistKnowledgeDatabase;
const artistMap = new Map(
  database.artists.map(artist => [normalizeCatalogName(artist.name), artist]),
);

const wikidataProfileCount = database.artists.filter(artist => artist.wikidata?.id).length;
const wikidataDescriptionCount = database.artists.filter(artist => artist.wikidata?.description).length;
const wikidataWebsiteCount = database.artists.filter(artist => artist.wikidata?.officialWebsites?.length).length;
const wikidataImageCount = database.artists.filter(artist => artist.wikidata?.images?.length).length;
const wikidataGenreCount = database.artists.filter(artist => artist.wikidata?.genres?.length).length;
const wikidataCountryCount = database.artists.filter(artist => artist.wikidata?.countries?.length).length;
const wikidataFormationPlaceCount = database.artists.filter(artist => artist.wikidata?.formationPlaces?.length).length;
const wikidataMemberCount = database.artists.filter(artist => artist.wikidata?.members?.length).length;
const curatedProfileCount = database.artists.filter(artist => artist.curated).length;

function hasOfflineProfile(knowledge?: OfflineArtistKnowledge): knowledge is OfflineArtistKnowledge {
  return Boolean(knowledge?.musicbrainz || knowledge?.curated);
}

export function getOfflineArtistKnowledge(artistName: string) {
  return artistMap.get(normalizeCatalogName(artistName));
}

export function getOfflineArtistSourceText(artistName: string) {
  const knowledge = getOfflineArtistKnowledge(artistName);
  return knowledge?.emotionalSeeds.sourceText ?? '';
}

export function getOfflineArtistKnowledgeStats() {
  return {
    generatedAt: database.meta.generatedAt,
    artistCount: database.artists.length,
    matchedCount: database.artists.filter(artist => artist.fetchStatus === 'matched').length,
    wikidataProfileCount,
    wikidataDescriptionCount,
    wikidataWebsiteCount,
    wikidataImageCount,
    wikidataGenreCount,
    wikidataCountryCount,
    wikidataFormationPlaceCount,
    wikidataMemberCount,
    curatedProfileCount,
    sourceNames: database.meta.sources.map(source => source.name),
  };
}

export function buildOfflineArtistKnowledgeSummary(topArtists: TopArtist[]): ArtistKnowledgeSummary {
  const matches = topArtists
    .map((artist, index) => {
      const knowledge = getOfflineArtistKnowledge(artist.name);
      if (!hasOfflineProfile(knowledge)) {
        return {
          matched: false as const,
          name: artist.name,
          plays: artist.plays,
          rank: index + 1,
        };
      }

      return {
        matched: true as const,
        name: artist.name,
        plays: artist.plays,
        rank: index + 1,
        matchedName: knowledge.musicbrainz?.name ?? knowledge.curated?.name ?? knowledge.name,
        mbid: knowledge.musicbrainz?.id,
        tags: knowledge.emotionalSeeds.tags.slice(0, 6),
        releaseGroupCount: knowledge.releaseGroups.length,
      };
    });

  const matched = matches.filter(match => match.matched);
  const missing = matches.filter(match => !match.matched);
  const totalPlays = topArtists.reduce((sum, artist) => sum + artist.plays, 0);
  const matchedPlays = matched.reduce((sum, artist) => sum + artist.plays, 0);

  return {
    source: 'offline_artist_knowledge',
    generated_at: database.meta.generatedAt,
    cache_artist_count: database.artists.length,
    wikidata_profile_count: wikidataProfileCount,
    wikidata_description_count: wikidataDescriptionCount,
    wikidata_website_count: wikidataWebsiteCount,
    wikidata_image_count: wikidataImageCount,
    total_artists: topArtists.length,
    matched_artists: matched.length,
    unmatched_artists: missing.length,
    match_rate_pct: topArtists.length ? Math.round((matched.length / topArtists.length) * 1000) / 10 : 0,
    matched_plays: matchedPlays,
    matched_play_rate_pct: totalPlays ? Math.round((matchedPlays / totalPlays) * 1000) / 10 : 0,
    top_matches: matched.slice(0, 8).map(match => ({
      name: match.name,
      plays: match.plays,
      rank: match.rank,
      matchedName: match.matchedName,
      mbid: match.mbid,
      tags: match.tags,
      releaseGroupCount: match.releaseGroupCount,
    })),
    top_missing: missing.slice(0, 8).map(match => ({
      name: match.name,
      plays: match.plays,
      rank: match.rank,
    })),
  };
}

export default database;
