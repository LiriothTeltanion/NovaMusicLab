import type { MusicDnaData } from '../types';
import {
  buildSpotifySearchUrl,
  buildYoutubeSearchUrl,
  getCuratedArtistMedia,
  getPrimarySpotifyUrl,
  getPrimaryYoutubeUrl,
  hasSpotifyMedia,
  hasYoutubeEmbedMedia,
  hasYoutubeMedia,
} from './mediaLinks';

export interface MediaCoverageRow {
  rank: number;
  artist: string;
  plays: number;
  hasCuratedProfile: boolean;
  spotifyVerified: boolean;
  youtubeVerified: boolean;
  youtubeEmbeddable: boolean;
  youtubeChannelVerified: boolean;
  spotifyUrl: string;
  youtubeUrl: string;
  youtubeSearchUrl: string;
}

export interface MediaCoverageReport {
  totalArtists: number;
  auditedArtists: number;
  curatedProfiles: number;
  spotifyVerified: number;
  youtubeVerified: number;
  youtubeEmbeddable: number;
  youtubeChannelVerified: number;
  missingAnyMedia: MediaCoverageRow[];
  missingYoutube: MediaCoverageRow[];
  rows: MediaCoverageRow[];
  score: number;
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export function buildMediaCoverageReport(data: MusicDnaData, limit = 20): MediaCoverageReport {
  const rows = data.top_artists.slice(0, limit).map((artist, index): MediaCoverageRow => {
    const curated = getCuratedArtistMedia(artist.name);
    const spotifyVerified = hasSpotifyMedia(curated);
    const youtubeVerified = hasYoutubeMedia(curated);
    const youtubeEmbeddable = hasYoutubeEmbedMedia(curated);
    const youtubeUrl = getPrimaryYoutubeUrl(curated);
    const spotifyUrl = getPrimarySpotifyUrl(curated);

    return {
      rank: index + 1,
      artist: artist.name,
      plays: artist.plays,
      hasCuratedProfile: Boolean(curated),
      spotifyVerified,
      youtubeVerified,
      youtubeEmbeddable,
      youtubeChannelVerified: Boolean(curated?.youtubeChannelUrl),
      spotifyUrl: spotifyUrl ?? buildSpotifySearchUrl(artist.name),
      youtubeUrl: youtubeUrl ?? buildYoutubeSearchUrl(`${artist.name} official audio`),
      youtubeSearchUrl: buildYoutubeSearchUrl(`${artist.name} official video official audio`),
    };
  });

  const auditedArtists = rows.length;
  const curatedProfiles = rows.filter(row => row.hasCuratedProfile).length;
  const spotifyVerified = rows.filter(row => row.spotifyVerified).length;
  const youtubeVerified = rows.filter(row => row.youtubeVerified).length;
  const youtubeEmbeddable = rows.filter(row => row.youtubeEmbeddable).length;
  const youtubeChannelVerified = rows.filter(row => row.youtubeChannelVerified).length;
  const missingAnyMedia = rows.filter(row => !row.hasCuratedProfile);
  const missingYoutube = rows.filter(row => !row.youtubeVerified);

  const score = Math.round((
    percent(curatedProfiles, auditedArtists) * 0.2
    + percent(spotifyVerified, auditedArtists) * 0.28
    + percent(youtubeVerified, auditedArtists) * 0.32
    + percent(youtubeEmbeddable, auditedArtists) * 0.2
  ));

  return {
    totalArtists: data.top_artists.length,
    auditedArtists,
    curatedProfiles,
    spotifyVerified,
    youtubeVerified,
    youtubeEmbeddable,
    youtubeChannelVerified,
    missingAnyMedia,
    missingYoutube,
    rows,
    score,
  };
}
