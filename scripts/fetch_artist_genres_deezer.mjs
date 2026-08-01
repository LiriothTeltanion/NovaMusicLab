// Second-source genre harvest from Deezer, for artists MusicBrainz could not
// classify.
//
// Two thirds of the MusicBrainz refusals were not matching failures: the artist
// was found, MusicBrainz simply carries no genre tag for them. No amount of
// name normalisation fixes that, so this reads a different catalogue.
//
// It is cheap because the portrait harvest already cached 6,019 Deezer artist
// searches: 84% of the remaining unclassified artists resolve to a Deezer id
// with no network at all. Only the album list is fetched, one request per
// artist, and genre_id comes back inside it - no per-album call.
//
// The honest limit, and the reason this runs second: Deezer's vocabulary is 22
// genres where MusicBrainz has thousands. Its labels are true but coarse.
// "Alternative" and "All" are refused outright - moving an artist from
// "we do not know" to "Alternative" would put them straight back into the
// generic bucket this whole effort exists to empty, dressed up as knowledge.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chooseArtistByName } from './lib/artistNameMatch.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src', 'data');
const ARTIST_CACHE = path.join(ROOT, 'scripts', '.cache', 'deezer_artists');
const ALBUM_CACHE = path.join(ROOT, 'scripts', '.cache', 'deezer_albums');
const OUTPUT_PATH = path.join(DATA, 'artist_genre_observations_deezer.json');

const UA = 'NovaMusicLab/1.0 (+https://github.com/LiriothTeltanion/NovaMusicLab)';
const DELAY_MS = 340;
const BACKOFF_MS = 10_000;

/** Labels that say nothing the museum does not already know. */
const UNINFORMATIVE = new Set(['alternative', 'all']);

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = (() => {
  const arg = process.argv.find(a => a.startsWith('--limit='));
  return arg ? Number(arg.split('=')[1]) : Infinity;
})();

const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => (s || '').normalize('NFC').trim().toLowerCase();
const read = f => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

const catalog = read('music_dna_genre_catalog.json');
const rows = Array.isArray(catalog) ? catalog : catalog.artists;

const artistCachePath = name => path.join(
  ARTIST_CACHE, `${Buffer.from(name, 'utf8').toString('base64url').slice(0, 120)}.json`,
);

/**
 * Duplicates of the same name are resolved by follower count, and only when one
 * dominates by a wide margin - Deezer carries duplicate entries for well-known
 * acts, and there the canonical one leads by orders of magnitude.
 */
function dominantByFollowers(matches) {
  const sorted = [...matches].sort((left, right) => (right.nb_fan || 0) - (left.nb_fan || 0));
  const [top, second] = sorted;
  return (top.nb_fan || 0) >= Math.max(1000, (second.nb_fan || 0) * 5) ? top : null;
}

/**
 * Resolved entirely from the cached searches, through the shared matcher. The
 * relaxed tier matters more here than it looks: Deezer answered
 * "30 Seconds to Mars" with exactly one candidate, "Thirty Seconds to Mars" at
 * 1.75M followers, and an exact-only rule threw that away.
 */
function chooseArtist(name, data) {
  return chooseArtistByName(name, data, { tieBreak: dominantByFollowers }).artist;
}

const targets = [];
for (const row of rows) {
  if (row.source !== 'unclassified' || !row.name) continue;
  const file = artistCachePath(row.name);
  if (!fs.existsSync(file)) continue;
  let artist = null;
  try {
    artist = chooseArtist(row.name, JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch { continue; }
  if (artist) targets.push({ row, artist });
}
targets.sort((left, right) => (right.row.plays || 0) - (left.row.plays || 0));

const existing = fs.existsSync(OUTPUT_PATH)
  ? JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'))
  : { schemaVersion: 1, provider: 'deezer', artists: {} };
const observations = existing.artists ?? {};

const pending = targets.filter(t => !observations[norm(t.row.name)]).slice(0, LIMIT);

console.log('Deezer genre harvest (second source)');
console.log(`  unclassified in catalogue : ${rows.filter(r => r.source === 'unclassified').length}`);
console.log(`  resolvable from cache     : ${targets.length}`);
console.log(`  already observed          : ${Object.keys(observations).length}`);
console.log(`  to look up now            : ${pending.length}`);
console.log(`  estimated wall clock      : ${Math.round(pending.length * 0.36 / 60)} min`);
if (DRY_RUN) {
  console.log('  --dry-run: no requests, no writes.');
  process.exit(0);
}

fs.mkdirSync(ALBUM_CACHE, { recursive: true });

async function deezer(url, cacheKey) {
  const cached = path.join(ALBUM_CACHE, `${cacheKey}.json`);
  if (fs.existsSync(cached)) {
    return { body: JSON.parse(fs.readFileSync(cached, 'utf8')), fromCache: true };
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 429 || res.status === 403) { await sleep(BACKOFF_MS); continue; }
      if (!res.ok) throw new Error(String(res.status));
      const body = await res.json();
      fs.writeFileSync(cached, JSON.stringify(body));
      return { body, fromCache: false };
    } catch (error) {
      console.log(`    ${cacheKey}: ${error.message}, retrying`);
      await sleep(5000);
    }
  }
  return { body: null, fromCache: false };
}

const vocabulary = await deezer('https://api.deezer.com/genre', 'genre-vocabulary');
if (!vocabulary.body) {
  console.error('Could not read the Deezer genre vocabulary. Nothing written.');
  process.exit(1);
}
const genreName = new Map((vocabulary.body.data ?? []).map(g => [g.id, g.name]));
if (!vocabulary.fromCache) await sleep(DELAY_MS);

let classified = 0;
let live = 0;
let cacheHits = 0;
let refusedGeneric = 0;
let refusedEmpty = 0;

for (const [index, { row, artist }] of pending.entries()) {
  const albums = await deezer(
    `https://api.deezer.com/artist/${artist.id}/albums?limit=12`,
    `artist-${artist.id}-albums`,
  );
  if (albums.fromCache) cacheHits += 1; else { live += 1; await sleep(DELAY_MS); }
  if (!albums.body) continue;

  // Majority vote across the artist's releases: a single mislabelled album
  // cannot decide what the museum says about the whole body of work.
  const tally = new Map();
  for (const album of albums.body.data ?? []) {
    const id = album.genre_id;
    if (!id || id <= 0) continue;
    tally.set(id, (tally.get(id) ?? 0) + 1);
  }
  if (!tally.size) { refusedEmpty += 1; continue; }

  const ranked = [...tally.entries()].sort((left, right) => right[1] - left[1]);
  const label = genreName.get(ranked[0][0]);
  if (!label) { refusedEmpty += 1; continue; }
  if (UNINFORMATIVE.has(label.toLowerCase())) { refusedGeneric += 1; continue; }

  observations[norm(row.name)] = {
    name: row.name,
    deezerArtistId: artist.id,
    genres: [{ id: ranked[0][0], name: label, albums: ranked[0][1] }],
  };
  classified += 1;

  if ((index + 1) % 200 === 0 || index === pending.length - 1) {
    console.log(`  [${index + 1}/${pending.length}] classified ${classified} · live ${live} · cached ${cacheHits}`);
  }
}

const sorted = Object.fromEntries(
  Object.keys(observations).sort().map(key => [key, observations[key]]),
);
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify({
  schemaVersion: 1,
  provider: 'deezer',
  sourceUrl: 'https://developers.deezer.com/api',
  note: 'Coarse second-source readings. MusicBrainz and artist_meta.json both win over this.',
  artistCount: Object.keys(sorted).length,
  artists: sorted,
}, null, 2)}\n`);

console.log('\nDone.');
console.log(`  newly classified        : ${classified}`);
console.log(`  refused, only "Alternative": ${refusedGeneric}`);
console.log(`  refused, no album genre : ${refusedEmpty}`);
console.log(`  observations file       : ${Object.keys(sorted).length} artists`);
