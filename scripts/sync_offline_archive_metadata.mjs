import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const compiledPath = path.join(root, 'src', 'data', 'music_dna_compiled.json');
const knowledgePath = path.join(root, 'src', 'data', 'offline_artist_knowledge.json');
const write = process.argv.includes('--write');

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

function topArchiveItems(items, key, artistName, limit = 5) {
  return items
    .filter(item => normalize(item.artist) === normalize(artistName))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, limit)
    .map(item => item[key]);
}

function buildEmotionalSeeds(archiveArtist, knowledge) {
  const tags = Array.from(new Set([
    archiveArtist.genre,
    ...(knowledge.musicbrainz?.tags ?? []),
    ...(knowledge.wikidata?.genres ?? []),
    ...(knowledge.curated?.tags ?? []),
  ].filter(Boolean)));
  const activeYears = [
    knowledge.musicbrainz?.lifeSpanBegin?.slice(0, 4),
    knowledge.musicbrainz?.lifeSpanEnd?.slice(0, 4),
    knowledge.wikidata?.inception?.slice(0, 4),
    knowledge.wikidata?.birthDate?.slice(0, 4),
    ...(knowledge.curated?.activeYears ?? []),
  ].filter(Boolean);
  const releaseYears = Array.from(new Set(
    (knowledge.releaseGroups ?? [])
      .map(group => Number(group.firstReleaseDate?.slice(0, 4)))
      .filter(Boolean),
  )).sort((a, b) => a - b);

  return {
    sourceText: [
      archiveArtist.name,
      archiveArtist.genre,
      archiveArtist.country,
      knowledge.musicbrainz?.type,
      knowledge.musicbrainz?.area,
      knowledge.musicbrainz?.beginArea,
      knowledge.musicbrainz?.disambiguation,
      knowledge.wikidata?.label,
      knowledge.wikidata?.description,
      knowledge.curated?.name,
      knowledge.curated?.origin,
      knowledge.curated?.country,
      knowledge.curated?.description,
      knowledge.curated?.background,
      ...(knowledge.wikidata?.countries ?? []),
      ...(knowledge.wikidata?.formationPlaces ?? []),
      ...(knowledge.wikidata?.recordLabels ?? []),
      ...(knowledge.wikidata?.members ?? []),
      ...(knowledge.wikidata?.occupations ?? []),
      ...(knowledge.wikidata?.instruments ?? []),
      ...(knowledge.wikidata?.instanceOf ?? []),
      ...tags,
      ...(knowledge.releaseGroups ?? []).slice(0, 12).map(group => group.title),
    ].filter(Boolean).join(' '),
    tags,
    activeYears,
    releaseYears,
  };
}

const compiled = JSON.parse(fs.readFileSync(compiledPath, 'utf8'));
const database = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
const compiledByExactName = new Map(compiled.top_artists.map((artist, index) => [
  String(artist.name).normalize('NFC').trim(),
  { artist, rank: index + 1 },
]));
const compiledByName = new Map();
for (const [index, artist] of compiled.top_artists.entries()) {
  const key = normalize(artist.name);
  if (!compiledByName.has(key)) compiledByName.set(key, { artist, rank: index + 1 });
}
const changedArtists = [];

for (const knowledge of database.artists ?? []) {
  const match = compiledByExactName.get(String(knowledge.name).normalize('NFC').trim())
    ?? compiledByName.get(normalize(knowledge.name));
  if (!match) continue;

  const { artist, rank } = match;
  const archive = {
    rank,
    plays: artist.plays,
    genre: artist.genre,
    country: artist.country,
    topTracks: topArchiveItems(compiled.top_tracks, 'title', artist.name),
    topAlbums: topArchiveItems(compiled.top_albums, 'title', artist.name),
  };
  const emotionalSeeds = buildEmotionalSeeds(artist, knowledge);

  if (
    JSON.stringify(knowledge.archive) !== JSON.stringify(archive)
    || JSON.stringify(knowledge.emotionalSeeds) !== JSON.stringify(emotionalSeeds)
  ) {
    changedArtists.push(artist.name);
    knowledge.archive = archive;
    knowledge.emotionalSeeds = emotionalSeeds;
  }
}

if (!changedArtists.length) {
  process.stdout.write('Offline archive metadata is already synchronized.\n');
} else if (write) {
  fs.writeFileSync(knowledgePath, `${JSON.stringify(database, null, 2)}\n`, 'utf8');
  process.stdout.write(`Synchronized ${changedArtists.length} offline archive profile(s): ${changedArtists.join(', ')}\n`);
} else {
  process.stderr.write(`Offline archive metadata drift detected for ${changedArtists.length} artist(s): ${changedArtists.join(', ')}\n`);
  process.stderr.write('Run node scripts/sync_offline_archive_metadata.mjs --write after recompiling the dataset.\n');
  process.exitCode = 1;
}
