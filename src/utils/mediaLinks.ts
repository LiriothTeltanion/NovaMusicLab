import mediaLinks from '../data/artist_media_links.json';
import type { TopAlbum, TopTrack } from '../types';
import { normalizeCatalogName } from './artistEnrichment';

export type MediaProvider = 'spotify' | 'youtube';

export interface CuratedArtistMedia {
  artist: string;
  aliases?: string[];
  spotifyArtistUrl?: string;
  spotifyAlbumUrl?: string;
  spotifyTrackUrl?: string;
  youtubeVideoUrl?: string;
  youtubePlaylistUrl?: string;
  officialSiteUrl?: string;
}

export interface MediaAction {
  label: string;
  url: string;
  provider: MediaProvider | 'web';
  kind: 'artist' | 'track' | 'album' | 'official' | 'live' | 'search';
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
  const match = url.match(/open\.spotify\.com\/(artist|album|track|playlist)\/([a-zA-Z0-9]+)/);
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

export function youtubeEmbedFromUrl(url?: string) {
  const videoId = youtubeVideoIdFromUrl(url);
  if (!videoId) return undefined;
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
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
  const spotifyUrl = curated?.spotifyTrackUrl ?? curated?.spotifyAlbumUrl ?? curated?.spotifyArtistUrl;
  const youtubeUrl = curated?.youtubeVideoUrl ?? curated?.youtubePlaylistUrl;

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
      embedUrl: youtubeEmbedFromUrl(youtubeUrl),
      verified: Boolean(youtubeUrl),
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
        url: buildSpotifySearchUrl(trackQuery),
        provider: 'spotify',
        kind: 'track',
      },
      {
        label: 'Spotify Album',
        url: buildSpotifySearchUrl(albumQuery),
        provider: 'spotify',
        kind: 'album',
      },
      {
        label: 'YouTube Official',
        url: buildYoutubeSearchUrl(`${trackQuery} official video official audio`),
        provider: 'youtube',
        kind: 'official',
      },
      {
        label: 'YouTube Live',
        url: buildYoutubeSearchUrl(`${artistQuery} live official`),
        provider: 'youtube',
        kind: 'live',
      },
    ],
  };
}
