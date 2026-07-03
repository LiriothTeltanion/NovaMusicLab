/* eslint-disable no-console */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'src', 'data', 'music_dna_compiled.json');
const linksPath = path.join(root, 'src', 'data', 'artist_media_links.json');
const checkedAt = '2026-07-03';

const searchOnlyAliases = {
  '30 Seconds to Mars': ['Thirty Seconds to Mars'],
  'FM84': ['FM-84'],
  'Girafot': ["ג'ירפות"],
  'HaYehudim': ['היהודים', 'The Jews'],
  'MGK': ['Machine Gun Kelly', 'mgk'],
  'Rain City Drive': ['Slaves'],
  'thekidszn': ['the kidszn', 'kidszn'],
};

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\u0590-\u05ff]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function namesFor(entry) {
  return [entry.artist, ...(entry.aliases ?? [])].filter(Boolean);
}

function hasSpotify(entry) {
  return Boolean(entry.spotifyArtistUrl || entry.spotifyAlbumUrl || entry.spotifyTrackUrl);
}

function hasYoutube(entry) {
  return Boolean(entry.officialAudioUrl || entry.youtubeVideoUrl || entry.youtubePlaylistUrl || entry.youtubeChannelUrl || entry.livePerformanceUrl);
}

function findMediaEntry(links, artistName) {
  const normalizedArtist = normalize(artistName);
  return links.find(entry => namesFor(entry).some(name => normalize(name) === normalizedArtist));
}

function inferConfidence(entry) {
  if (entry.mediaConfidence) return entry.mediaConfidence;
  if (hasSpotify(entry) && hasYoutube(entry)) return 'verified';
  if (hasSpotify(entry) || hasYoutube(entry)) return 'partial';
  return 'search';
}

function aliasesFor(artistName) {
  const aliasEntry = Object.entries(searchOnlyAliases).find(([canonical, aliases]) =>
    normalize(canonical) === normalize(artistName)
    || aliases.some(alias => normalize(alias) === normalize(artistName)),
  );

  if (!aliasEntry) return undefined;
  const aliases = [aliasEntry[0], ...aliasEntry[1]].filter(alias => normalize(alias) !== normalize(artistName));
  return [...new Set(aliases)];
}

const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 100;
const data = JSON.parse(await readFile(dataPath, 'utf8'));
const links = JSON.parse(await readFile(linksPath, 'utf8'));
let normalizedExisting = 0;
const added = [];

for (const entry of links) {
  const inferredConfidence = inferConfidence(entry);
  if (!entry.mediaConfidence) {
    entry.mediaConfidence = inferredConfidence;
    normalizedExisting += 1;
  }
}

for (const artist of data.top_artists.slice(0, limit)) {
  if (findMediaEntry(links, artist.name)) continue;

  const nextEntry = {
    artist: artist.name,
    mediaConfidence: 'search',
    checkedAt,
    sourceNote: 'Search-only legal media profile seeded by Codex. Spotify and YouTube buttons use generated searches until exact official artist links are verified.',
  };

  const aliases = aliasesFor(artist.name);
  if (aliases?.length) nextEntry.aliases = aliases;

  links.push(nextEntry);
  added.push(artist.name);
}

await writeFile(linksPath, `${JSON.stringify(links, null, 2)}\n`);

console.log(`Seeded media profiles for top ${limit} artists`);
console.log(`Added search-only profiles: ${added.length}`);
console.log(`Normalized existing confidence fields: ${normalizedExisting}`);
if (added.length) {
  console.log(added.map((artist, index) => `${index + 1}. ${artist}`).join('\n'));
}
