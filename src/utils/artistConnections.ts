import type { MusicDnaData, TopArtist } from '../types';
import { normalizeCatalogName } from './catalogName';
import { canonicalGenreFamily } from './genreTaxonomy';
import { getOfflineArtistKnowledge } from './offlineArtistKnowledge';

export interface DocumentedArtistConnection {
  artist: TopArtist;
  kind: 'same-identity' | 'shared-member';
  sharedMembers: string[];
}

export interface ArchiveNeighbor {
  artist: TopArtist;
  sharedGenres: string[];
  sameCountry: boolean;
  score: number;
}

const missingCountryKeys = new Set(['', 'unknown', 'unavailable', 'not available', 'n a']);
const missingGenreKeys = new Set(['', 'unknown', 'unclassified', 'not available', 'n a']);

function genreSignals(artist: TopArtist) {
  const knowledge = getOfflineArtistKnowledge(artist.name);
  const family = canonicalGenreFamily(artist.genre);
  const labels = [
    family === 'Unclassified' ? '' : family,
    artist.genre,
    ...(knowledge?.musicbrainz?.tags ?? []),
    ...(knowledge?.wikidata?.genres ?? []),
    ...(knowledge?.curated?.tags ?? []),
  ];
  const signals = new Map<string, string>();

  for (const label of labels) {
    const key = normalizeCatalogName(label);
    if (!key || missingGenreKeys.has(key) || signals.has(key)) continue;
    signals.set(key, label);
  }

  return signals;
}

function memberMap(artistName: string) {
  const members = getOfflineArtistKnowledge(artistName)?.bandMembers ?? [];
  return new Map(
    members
      .map(member => [normalizeCatalogName(member.name), member.name] as const)
      .filter(([key]) => Boolean(key)),
  );
}

/**
 * Returns only relations supported by the offline identity/lineup catalog.
 * Shared styles and countries deliberately live in `getArchiveNeighbors`
 * because similarity is not evidence of collaboration or influence.
 */
export function getDocumentedArtistConnections(
  data: MusicDnaData,
  artistName: string,
  limit = 6,
): DocumentedArtistConnection[] {
  const selected = getOfflineArtistKnowledge(artistName);
  if (!selected) return [];

  const selectedMbid = selected.musicbrainz?.id;
  const selectedMembers = memberMap(artistName);

  return data.top_artists
    .filter(artist => normalizeCatalogName(artist.name) !== normalizeCatalogName(artistName))
    .flatMap<DocumentedArtistConnection>(artist => {
      const candidate = getOfflineArtistKnowledge(artist.name);
      if (!candidate) return [];

      if (selectedMbid && candidate.musicbrainz?.id === selectedMbid) {
        return [{ artist, kind: 'same-identity', sharedMembers: [] }];
      }

      const sharedMembers = (candidate.bandMembers ?? [])
        .filter(member => selectedMembers.has(normalizeCatalogName(member.name)))
        .map(member => selectedMembers.get(normalizeCatalogName(member.name)) ?? member.name)
        .filter((member, index, values) => values.indexOf(member) === index)
        .slice(0, 3);

      return sharedMembers.length
        ? [{ artist, kind: 'shared-member', sharedMembers }]
        : [];
    })
    .sort((left, right) => {
      if (left.kind !== right.kind) return left.kind === 'same-identity' ? -1 : 1;
      return right.artist.plays - left.artist.plays;
    })
    .slice(0, limit);
}

export function getArchiveNeighbors(
  data: MusicDnaData,
  artistName: string,
  excludeArtistNames: readonly string[] = [],
  limit = 4,
): ArchiveNeighbor[] {
  const excluded = new Set([
    normalizeCatalogName(artistName),
    ...excludeArtistNames.map(normalizeCatalogName),
  ]);
  const selectedArtist = data.top_artists.find(
    artist => normalizeCatalogName(artist.name) === normalizeCatalogName(artistName),
  );
  if (!selectedArtist) return [];

  const selectedGenres = genreSignals(selectedArtist);
  const selectedCountry = normalizeCatalogName(selectedArtist.country);
  const selectedCountryKnown = !missingCountryKeys.has(selectedCountry);

  return data.top_artists
    .filter(artist => !excluded.has(normalizeCatalogName(artist.name)))
    .map(artist => {
      const candidateGenres = genreSignals(artist);
      const sharedGenres = [...selectedGenres.entries()]
        .filter(([key]) => candidateGenres.has(key))
        .map(([, label]) => label);
      const candidateCountry = normalizeCatalogName(artist.country);
      const sameCountry = selectedCountryKnown
        && !missingCountryKeys.has(candidateCountry)
        && candidateCountry === selectedCountry;
      const score = (sharedGenres.length * 4)
        + (sameCountry ? 1.6 : 0)
        + Math.log10(Math.max(artist.plays, 1));

      return { artist, sharedGenres, sameCountry, score };
    })
    .filter(item => item.sharedGenres.length > 0 || item.sameCountry)
    .sort((left, right) => right.score - left.score || right.artist.plays - left.artist.plays)
    .slice(0, limit)
    .map(({ artist, sharedGenres, sameCountry, score }) => ({
      artist,
      sharedGenres,
      sameCountry,
      score,
    }));
}
