import artistProfiles from '../data/artist_enrichment.json';
import type { MusicDnaData, TopAlbum, TopArtist, TopTrack, YearlyEra } from '../types';
import {
  subscribeToHebrewArtistEnrichment,
  type HebrewArtistEnrichment,
} from './artistEnrichmentHebrew';
import { normalizeCatalogName } from './catalogName';

export {
  isHebrewArtistEnrichmentLoaded,
  loadHebrewArtistEnrichment,
} from './artistEnrichmentHebrew';
export { normalizeCatalogName } from './catalogName';

export type LocalizedText = {
  es: string;
  en: string;
  he: string;
};

export type LocalizedList = {
  es: string[];
  en: string[];
  he: string[];
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

type BaseLocalizedText = Omit<LocalizedText, 'he'>;
type BaseLocalizedList = Omit<LocalizedList, 'he'>;

interface BaseArtistAlbumEnrichment extends Omit<ArtistAlbumEnrichment, 'description'> {
  description: BaseLocalizedText;
}

interface BaseArtistEnrichment extends Omit<
  ArtistEnrichment,
  | 'origin'
  | 'country'
  | 'status'
  | 'bio'
  | 'archive_role'
  | 'sound_evolution'
  | 'why_it_matters'
  | 'signature_moods'
  | 'key_albums'
> {
  origin: BaseLocalizedText;
  country: BaseLocalizedText;
  status: BaseLocalizedText;
  bio: BaseLocalizedText;
  archive_role: BaseLocalizedText;
  sound_evolution: BaseLocalizedText;
  why_it_matters: BaseLocalizedText;
  signature_moods: BaseLocalizedList;
  key_albums: BaseArtistAlbumEnrichment[];
}

const withEnglishFallback = (text: BaseLocalizedText): LocalizedText => ({
  ...text,
  // AppProvider preloads the Hebrew overlay before rendering HE. Keeping this
  // fallback makes the synchronous API safe for tests and non-React callers.
  he: text.en,
});

const profiles = (artistProfiles as BaseArtistEnrichment[]).map<ArtistEnrichment>(profile => ({
  ...profile,
  origin: withEnglishFallback(profile.origin),
  country: withEnglishFallback(profile.country),
  status: withEnglishFallback(profile.status),
  bio: withEnglishFallback(profile.bio),
  archive_role: withEnglishFallback(profile.archive_role),
  sound_evolution: withEnglishFallback(profile.sound_evolution),
  why_it_matters: withEnglishFallback(profile.why_it_matters),
  signature_moods: {
    ...profile.signature_moods,
    he: profile.signature_moods.en,
  },
  key_albums: profile.key_albums.map(album => ({
    ...album,
    description: withEnglishFallback(album.description),
  })),
}));

function installHebrewArtistEnrichment(overlay: HebrewArtistEnrichment[]) {
  const overlayByName = new Map(overlay.map(profile => [profile.name, profile]));
  if (overlayByName.size !== profiles.length) {
    throw new Error(
      `Hebrew artist enrichment profile mismatch: expected ${profiles.length}, received ${overlayByName.size}.`,
    );
  }

  const validatedProfiles = profiles.map(profile => {
    const hebrew = overlayByName.get(profile.name);
    if (!hebrew) throw new Error(`Missing Hebrew artist enrichment for ${profile.name}.`);
    const albumOverlayByTitle = new Map(
      hebrew.key_albums.map(album => [album.title, album.description]),
    );
    if (albumOverlayByTitle.size !== profile.key_albums.length) {
      throw new Error(`Hebrew album enrichment mismatch for ${profile.name}.`);
    }
    for (const album of profile.key_albums) {
      const description = albumOverlayByTitle.get(album.title);
      if (!description) {
        throw new Error(`Missing Hebrew enrichment for ${profile.name} / ${album.title}.`);
      }
    }
    return { profile, hebrew, albumOverlayByTitle };
  });

  for (const { profile, hebrew, albumOverlayByTitle } of validatedProfiles) {
    profile.origin.he = hebrew.origin;
    profile.country.he = hebrew.country;
    profile.status.he = hebrew.status;
    profile.bio.he = hebrew.bio;
    profile.archive_role.he = hebrew.archive_role;
    profile.sound_evolution.he = hebrew.sound_evolution;
    profile.why_it_matters.he = hebrew.why_it_matters;
    profile.signature_moods.he = hebrew.signature_moods;
    for (const album of profile.key_albums) {
      album.description.he = albumOverlayByTitle.get(album.title)!;
    }
  }
}

subscribeToHebrewArtistEnrichment(installHebrewArtistEnrichment);

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
