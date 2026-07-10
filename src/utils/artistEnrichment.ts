import artistProfiles from '../data/artist_enrichment.json';
import type { MusicDnaData, TopAlbum, TopArtist, TopTrack, YearlyEra } from '../types';

export type LocalizedText = {
  es: string;
  en: string;
};

export type LocalizedList = {
  es: string[];
  en: string[];
};

export interface ArtistAlbumEnrichment {
  title: string;
  year: number;
  description: LocalizedText;
}

export interface ArtistEnrichment {
  name: string;
  aliases: string[];
  origin: LocalizedText;
  country: LocalizedText;
  start_year: number | string;
  status: LocalizedText;
  bio: LocalizedText;
  archive_role: LocalizedText;
  sound_evolution: LocalizedText;
  why_it_matters: LocalizedText;
  signature_moods: LocalizedList;
  key_albums: ArtistAlbumEnrichment[];
}

export interface RelatedArchiveArtist {
  artist: TopArtist;
  sharedGenres: string[];
  sameCountry: boolean;
  hasProfile: boolean;
  score: number;
}

const profiles = artistProfiles as ArtistEnrichment[];

export function normalizeCatalogName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/&/g, 'and')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

function profileNames(profile: ArtistEnrichment) {
  return [profile.name, ...profile.aliases].filter(Boolean);
}

export function artistMatchesProfile(artistName: string, profile: ArtistEnrichment) {
  const normalizedArtist = normalizeCatalogName(artistName);
  return profileNames(profile).some(name => normalizeCatalogName(name) === normalizedArtist);
}

export function getArtistEnrichment(artistName: string) {
  return profiles.find(profile => artistMatchesProfile(artistName, profile));
}

// Substring matching (to catch "In Blur - Single" vs "In Blur") is only safe
// when the shorter side is long enough to be distinctive - "II", "Live", "Demo"
// or "Solo" would otherwise silently inherit an unrelated album's year and
// description. Exact matches (after normalization, which already strips
// parenthesized suffixes like "(Deluxe Edition)") are always allowed.
const MIN_SUBSTRING_MATCH_LENGTH = 5;

export function getAlbumEnrichment(profile: ArtistEnrichment | undefined, albumTitle: string) {
  if (!profile) return undefined;
  const normalizedAlbum = normalizeCatalogName(albumTitle);

  return profile.key_albums.find(album => {
    const normalizedProfileAlbum = normalizeCatalogName(album.title);
    if (normalizedAlbum === normalizedProfileAlbum) return true;
    const shorter = Math.min(normalizedAlbum.length, normalizedProfileAlbum.length);
    if (shorter < MIN_SUBSTRING_MATCH_LENGTH) return false;
    return normalizedAlbum.includes(normalizedProfileAlbum)
      || normalizedProfileAlbum.includes(normalizedAlbum);
  });
}

function artistMatchesAnyName(artistName: string, selectedName: string, profile?: ArtistEnrichment) {
  const normalizedArtist = normalizeCatalogName(artistName);
  const names = profile ? [selectedName, ...profileNames(profile)] : [selectedName];
  return names.some(name => normalizeCatalogName(name) === normalizedArtist);
}

export function getArtistArchiveAlbums(data: MusicDnaData, artistName: string, profile?: ArtistEnrichment) {
  return data.top_albums
    .filter(album => artistMatchesAnyName(album.artist, artistName, profile))
    .sort((a, b) => b.plays - a.plays);
}

export function getArtistArchiveTracks(data: MusicDnaData, artistName: string, profile?: ArtistEnrichment) {
  return data.top_tracks
    .filter(track => artistMatchesAnyName(track.artist, artistName, profile))
    .sort((a, b) => b.plays - a.plays);
}

export function getArtistEraSignals(data: MusicDnaData, artistName: string, profile?: ArtistEnrichment) {
  return data.yearly_eras
    .filter(era => artistMatchesAnyName(era.top_artist, artistName, profile))
    .sort((a, b) => a.year - b.year);
}

export function albumReleaseLabel(album: TopAlbum, profile?: ArtistEnrichment) {
  return getAlbumEnrichment(profile, album.title)?.year;
}

export function summarizeArtistEvidence(
  albums: TopAlbum[],
  tracks: TopTrack[],
  eras: YearlyEra[],
  formatNumber: (value: number) => string,
) {
  const albumPlays = albums.reduce((total, album) => total + album.plays, 0);
  const trackPlays = tracks.reduce((total, track) => total + track.plays, 0);
  return {
    albumCount: albums.length,
    trackCount: tracks.length,
    eraCount: eras.length,
    albumPlaysLabel: formatNumber(albumPlays),
    trackPlaysLabel: formatNumber(trackPlays),
  };
}

const lowSignalGenreTokens = new Set([
  'and', 'the', 'with', 'modern', 'alternative', 'rock', 'metal', 'pop',
  'music', 'core',
]);

function genreTokens(genre: string) {
  return normalizeCatalogName(genre)
    .split(' ')
    .filter(token => token.length > 2 && !lowSignalGenreTokens.has(token));
}

export function getArtistCatalogStats(profile?: ArtistEnrichment) {
  if (!profile?.key_albums.length) {
    return {
      albumCount: 0,
      firstYear: undefined,
      lastYear: undefined,
      spanYears: 0,
    };
  }

  const years = profile.key_albums.map(album => album.year).sort((a, b) => a - b);
  const firstYear = years[0];
  const lastYear = years[years.length - 1];

  return {
    albumCount: profile.key_albums.length,
    firstYear,
    lastYear,
    spanYears: lastYear - firstYear,
  };
}

export function getRelatedArchiveArtists(
  data: MusicDnaData,
  artistName: string,
  profile?: ArtistEnrichment,
  limit = 6,
): RelatedArchiveArtist[] {
  const selectedArtist = data.top_artists.find(artist => artistMatchesAnyName(artist.name, artistName, profile));
  if (!selectedArtist) return [];

  const selectedTokens = new Set(genreTokens(selectedArtist.genre));
  const selectedCountry = normalizeCatalogName(selectedArtist.country);

  return data.top_artists
    .filter(artist => !artistMatchesAnyName(artist.name, artistName, profile))
    .map(artist => {
      const sharedGenres = genreTokens(artist.genre).filter(token => selectedTokens.has(token));
      const sameCountry = normalizeCatalogName(artist.country) === selectedCountry;
      const hasProfile = Boolean(getArtistEnrichment(artist.name));
      const score = (sharedGenres.length * 4)
        + (sameCountry ? 1.6 : 0)
        + (hasProfile ? 0.6 : 0)
        + Math.log10(Math.max(artist.plays, 1));

      return { artist, sharedGenres, sameCountry, hasProfile, score };
    })
    .filter(item => item.sharedGenres.length > 0 || item.sameCountry)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
