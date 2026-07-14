import mediaLinks from '../data/artist_media_links.json';
import type { TopAlbum, TopTrack } from '../types';
import { normalizeCatalogName } from './catalogName';
import type { Lang } from './i18n';

export type MediaProvider = 'spotify' | 'youtube';

export interface CuratedArtistMedia {
  artist: string;
  aliases?: string[];
  spotifyArtistUrl?: string;
  spotifyAlbumUrl?: string;
  spotifyTrackUrl?: string;
  youtubeChannelUrl?: string;
  youtubeVideoUrl?: string;
  youtubePlaylistUrl?: string;
  officialAudioUrl?: string;
  livePerformanceUrl?: string;
  officialSiteUrl?: string;
  wikipediaEnUrl?: string;
  wikipediaEsUrl?: string;
  mediaConfidence?: 'verified' | 'partial' | 'search';
  checkedAt?: string;
  sourceNote?: string;
}

export interface MediaAction {
  label: string;
  url: string;
  provider: MediaProvider | 'web';
  kind: 'artist' | 'track' | 'album' | 'official' | 'live' | 'channel' | 'search' | 'wiki';
}

/**
 * Wikipedia article for the artist in the user's language, falling back to
 * the other language's article. Never falls back to a search URL: a wrong
 * or noisy wiki link is worse than no link.
 */
export function getWikipediaUrl(entry: CuratedArtistMedia | undefined, lang: Lang) {
  if (!entry) return undefined;
  return lang === 'es'
    ? entry.wikipediaEsUrl ?? entry.wikipediaEnUrl
    : lang === 'he'
      // The curated dataset has no verified Hebrew article field yet. Prefer
      // the English canonical article, then Spanish, instead of fabricating a
      // search result or presenting an incorrect language URL.
      ? entry.wikipediaEnUrl ?? entry.wikipediaEsUrl
    : entry.wikipediaEnUrl ?? entry.wikipediaEsUrl;
}

export interface ArtistMediaProfile {
  artistName: string;
  curated?: CuratedArtistMedia;
  spotify: {
    externalUrl: string;
    embedUrl?: string;
    verified: boolean;
  };
  youtube: {
    externalUrl: string;
    embedUrl?: string;
    verified: boolean;
  };
  actions: MediaAction[];
}

const curatedMedia = mediaLinks as CuratedArtistMedia[];

function mediaNames(entry: CuratedArtistMedia) {
  return [entry.artist, ...(entry.aliases ?? [])].filter(Boolean);
}

export function getCuratedArtistMedia(artistName: string) {
  const normalizedArtist = normalizeCatalogName(artistName);
  return curatedMedia.find(entry =>
    mediaNames(entry).some(name => normalizeCatalogName(name) === normalizedArtist),
  );
}

export function spotifyEmbedFromUrl(url?: string) {
  if (!url) return undefined;
  // Optional intl-XX segment: Spotify's share URLs are locale-prefixed
  // (open.spotify.com/intl-es/artist/...) for many users.
  const match = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(artist|album|track|playlist)\/([a-zA-Z0-9]+)/);
  if (!match) return undefined;

  const [, type, id] = match;
  return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
}

function youtubeVideoIdFromUrl(url?: string) {
  if (!url) return undefined;
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('v') ?? undefined;
  } catch {
    return undefined;
  }
}

function youtubePlaylistIdFromUrl(url?: string) {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    const listId = parsed.searchParams.get('list');
    if (listId) return listId;
  } catch {
    return undefined;
  }

  return undefined;
}

export function youtubeEmbedFromUrl(url?: string) {
  const videoId = youtubeVideoIdFromUrl(url);
  if (videoId) return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;

  const playlistId = youtubePlaylistIdFromUrl(url);
  if (playlistId) return `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&rel=0`;

  return undefined;
}

export function hasSpotifyMedia(entry?: CuratedArtistMedia) {
  return Boolean(entry?.spotifyArtistUrl || entry?.spotifyAlbumUrl || entry?.spotifyTrackUrl);
}

export function hasYoutubeEmbedMedia(entry?: CuratedArtistMedia) {
  return Boolean(entry?.officialAudioUrl || entry?.youtubeVideoUrl || entry?.youtubePlaylistUrl);
}

export function hasYoutubeMedia(entry?: CuratedArtistMedia) {
  return Boolean(hasYoutubeEmbedMedia(entry) || entry?.youtubeChannelUrl || entry?.livePerformanceUrl);
}

export function getPrimarySpotifyUrl(entry?: CuratedArtistMedia) {
  return entry?.spotifyTrackUrl ?? entry?.spotifyAlbumUrl ?? entry?.spotifyArtistUrl;
}

export function getPrimaryYoutubeUrl(entry?: CuratedArtistMedia) {
  return entry?.officialAudioUrl
    ?? entry?.youtubeVideoUrl
    ?? entry?.youtubePlaylistUrl
    ?? entry?.youtubeChannelUrl
    ?? entry?.livePerformanceUrl;
}

export function buildSpotifySearchUrl(query: string) {
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

export function buildYoutubeSearchUrl(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export function buildArtistMediaProfile(
  artistName: string,
  topTrack?: TopTrack,
  topAlbum?: TopAlbum,
): ArtistMediaProfile {
  const curated = getCuratedArtistMedia(artistName);
  const artistQuery = artistName;
  const trackQuery = topTrack ? `${topTrack.artist} ${topTrack.title}` : artistQuery;
  const albumQuery = topAlbum ? `${topAlbum.artist} ${topAlbum.title}` : artistQuery;
  const spotifyUrl = getPrimarySpotifyUrl(curated);
  const youtubeUrl = getPrimaryYoutubeUrl(curated);
  const youtubeEmbedUrl = curated?.officialAudioUrl ?? curated?.youtubeVideoUrl ?? curated?.youtubePlaylistUrl;

  const spotifyExternalUrl = spotifyUrl ?? buildSpotifySearchUrl(artistQuery);
  const youtubeExternalUrl = youtubeUrl ?? buildYoutubeSearchUrl(`${artistQuery} official audio`);

  return {
    artistName,
    curated,
    spotify: {
      externalUrl: spotifyExternalUrl,
      embedUrl: spotifyEmbedFromUrl(spotifyUrl),
      verified: Boolean(spotifyUrl),
    },
    youtube: {
      externalUrl: youtubeExternalUrl,
      embedUrl: youtubeEmbedFromUrl(youtubeEmbedUrl),
      verified: hasYoutubeMedia(curated),
    },
    actions: [
      {
        label: 'Spotify Artist',
        url: curated?.spotifyArtistUrl ?? buildSpotifySearchUrl(artistQuery),
        provider: 'spotify',
        kind: 'artist',
      },
      {
        label: 'Spotify Top Track',
        url: curated?.spotifyTrackUrl ?? buildSpotifySearchUrl(trackQuery),
        provider: 'spotify',
        kind: 'track',
      },
      {
        label: 'Spotify Album',
        url: curated?.spotifyAlbumUrl ?? buildSpotifySearchUrl(albumQuery),
        provider: 'spotify',
        kind: 'album',
      },
      {
        label: 'YouTube Channel',
        url: curated?.youtubeChannelUrl ?? buildYoutubeSearchUrl(`${artistQuery} official channel`),
        provider: 'youtube',
        kind: 'channel',
      },
      {
        label: 'YouTube Official',
        url: curated?.officialAudioUrl
          ?? curated?.youtubeVideoUrl
          ?? curated?.youtubePlaylistUrl
          ?? buildYoutubeSearchUrl(`${trackQuery} official video official audio`),
        provider: 'youtube',
        kind: 'official',
      },
      {
        label: 'YouTube Live',
        url: curated?.livePerformanceUrl ?? buildYoutubeSearchUrl(`${artistQuery} live official`),
        provider: 'youtube',
        kind: 'live',
      },
    ],
  };
}
