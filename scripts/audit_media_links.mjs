/* eslint-disable no-console */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'src', 'data', 'music_dna_compiled.json');
const linksPath = path.join(root, 'src', 'data', 'artist_media_links.json');

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function namesFor(entry) {
  return [entry.artist, ...(entry.aliases ?? [])].filter(Boolean);
}

function hasSpotify(entry) {
  return Boolean(entry?.spotifyArtistUrl || entry?.spotifyAlbumUrl || entry?.spotifyTrackUrl);
}

function hasYoutubeEmbed(entry) {
  return Boolean(entry?.officialAudioUrl || entry?.youtubeVideoUrl || entry?.youtubePlaylistUrl);
}

function hasYoutube(entry) {
  return Boolean(hasYoutubeEmbed(entry) || entry?.youtubeChannelUrl || entry?.livePerformanceUrl);
}

function findMediaEntry(links, artistName) {
  const normalizedArtist = normalize(artistName);
  return links.find(entry => namesFor(entry).some(name => normalize(name) === normalizedArtist));
}

function pct(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 100;
const data = JSON.parse(await readFile(dataPath, 'utf8'));
const links = JSON.parse(await readFile(linksPath, 'utf8'));
const rows = data.top_artists.slice(0, limit).map((artist, index) => {
  const media = findMediaEntry(links, artist.name);

  return {
    rank: index + 1,
    artist: artist.name,
    plays: artist.plays,
    media,
    hasProfile: Boolean(media),
    hasSpotify: hasSpotify(media),
    hasYoutube: hasYoutube(media),
    hasEmbed: hasYoutubeEmbed(media),
    confidence: media?.mediaConfidence ?? 'none',
  };
});

const total = rows.length;
const profileCount = rows.filter(row => row.hasProfile).length;
const spotifyCount = rows.filter(row => row.hasSpotify).length;
const youtubeCount = rows.filter(row => row.hasYoutube).length;
const embedCount = rows.filter(row => row.hasEmbed).length;
const searchOnlyCount = rows.filter(row => row.confidence === 'search').length;

console.log(`Media audit for top ${total} artists`);
console.log(`Profiles: ${profileCount}/${total} (${pct(profileCount, total)}%)`);
console.log(`Spotify verified: ${spotifyCount}/${total} (${pct(spotifyCount, total)}%)`);
console.log(`YouTube verified: ${youtubeCount}/${total} (${pct(youtubeCount, total)}%)`);
console.log(`Embeddable YouTube: ${embedCount}/${total} (${pct(embedCount, total)}%)`);
console.log(`Search-only fallback profiles: ${searchOnlyCount}/${total} (${pct(searchOnlyCount, total)}%)`);

const missingProfiles = rows.filter(row => !row.hasProfile);
const missingYoutube = rows.filter(row => !row.hasYoutube);

if (missingProfiles.length) {
  console.log('\nMissing profiles:');
  for (const row of missingProfiles) {
    console.log(`${row.rank}. ${row.artist} (${row.plays} plays)`);
  }
}

if (missingYoutube.length) {
  console.log('\nPending verified YouTube:');
  for (const row of missingYoutube) {
    console.log(`${row.rank}. ${row.artist} [${row.confidence}]`);
  }
}
