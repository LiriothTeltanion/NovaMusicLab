// Dev-side genre harvest from MusicBrainz for artists the catalog cannot class.
//
// Why MusicBrainz and not something faster: genre_ontology.v1.json IS the
// MusicBrainz genre vocabulary, so a genre returned here joins onto an existing
// ontology term by MBID - an exact key match, never a name guess. Measured on a
// 25-artist sample spread across the play range before this script was written:
//   exact artist-name match in MusicBrainz : 84%
//   of the sample, carrying >= 1 genre     : 52%
//   genres that joined by MBID             : 13 of 13 (100%)
//   genres missing from the ontology       : 0
//
// The output is an OBSERVATION layer, deliberately separate from the curated
// artist_meta.json. Nothing here is presented as verified: these are machine
// readings with provenance, for the assertion builder to admit as candidates.
//
// Rate limit is MusicBrainz's published 1 request/second, honoured on the error
// path too. Every response is cached, so re-running with a larger --limit only
// pays for the artists it has not seen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chooseArtistByName } from './lib/artistNameMatch.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src', 'data');
const CACHE_DIR = path.join(ROOT, 'scripts', '.cache', 'musicbrainz_genres');
const OUTPUT_PATH = path.join(DATA, 'artist_genre_observations.json');
const RESIDUE_PATH = path.join(ROOT, 'scripts', 'artist_genre_residue.json');

const UA = 'NovaMusicLab/1.0 (+https://github.com/LiriothTeltanion/NovaMusicLab)';
const DELAY_MS = 1100;
const BACKOFF_MS = 5000;

const DRY_RUN = process.argv.includes('--dry-run');
// Re-evaluate only artists whose search is already on disk. Used after the
// matching rules change: every previously refused name is re-judged against the
// new rules without spending a single request.
const CACHED_ONLY = process.argv.includes('--cached-only');
const LIMIT = (() => {
  const arg = process.argv.find(a => a.startsWith('--limit='));
  return arg ? Number(arg.split('=')[1]) : 1000;
})();

const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => (s || '').normalize('NFC').trim().toLowerCase();
const read = f => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

const catalog = read('music_dna_genre_catalog.json');
const rows = Array.isArray(catalog) ? catalog : (catalog.artists ?? []);
const ontology = read('genre_ontology.v1.json');
const ontologyTermIds = new Set(ontology.terms.map(term => term.id));

const existing = fs.existsSync(OUTPUT_PATH)
  ? JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'))
  : { schemaVersion: 1, provider: 'musicbrainz', artists: {} };
const observations = existing.artists ?? {};

fs.mkdirSync(CACHE_DIR, { recursive: true });
// Full-Unicode cache key: ASCII-only normalisation collapses non-Latin names.
const cachePath = (kind, key) => path.join(
  CACHE_DIR,
  `${kind}-${Buffer.from(key, 'utf8').toString('base64url').slice(0, 110)}.json`,
);

const targets = rows
  .filter(r => r.automaticFamily === 'Unclassified' && r.name)
  .filter(r => !observations[norm(r.name)])
  .filter(r => !CACHED_ONLY || fs.existsSync(cachePath('search', r.name)))
  .sort((a, b) => (b.plays || 0) - (a.plays || 0))
  .slice(0, LIMIT);

console.log('MusicBrainz genre harvest');
console.log(`  unclassified in catalogue : ${rows.filter(r => r.automaticFamily === 'Unclassified').length}`);
console.log(`  already observed          : ${Object.keys(observations).length}`);
console.log(`  to look up now            : ${targets.length}`);
console.log(`  estimated wall clock      : ${Math.round(targets.length * 2.2 / 60)} min`);
if (DRY_RUN) {
  console.log('  --dry-run: no requests, no writes.');
  process.exit(0);
}

async function musicbrainz(url, kind, cacheKey) {
  const cached = cachePath(kind, cacheKey);
  if (fs.existsSync(cached)) {
    return { body: JSON.parse(fs.readFileSync(cached, 'utf8')), fromCache: true };
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (res.status === 503 || res.status === 429) {
        await sleep(BACKOFF_MS);
        continue;
      }
      if (!res.ok) throw new Error(String(res.status));
      const body = await res.json();
      fs.writeFileSync(cached, JSON.stringify(body));
      return { body, fromCache: false };
    } catch (error) {
      console.log(`    ${cacheKey}: ${error.message}, retrying`);
      await sleep(BACKOFF_MS);
    }
  }
  return { body: null, fromCache: false };
}

/** Lucene needs its operators escaped or a name like "AC/DC" changes the query. */
function luceneEscape(value) {
  return value.replace(/([+\-!(){}[\]^"~*?:\\/]|&&|\|\|)/g, '\\$1');
}

/**
 * Duplicates of the same name are resolved by MusicBrainz's own relevance
 * score, and only when one clearly leads - a tie stays a refusal.
 */
function mostRelevant(matches) {
  const sorted = [...matches].sort((left, right) => (right.score || 0) - (left.score || 0));
  const [top, second] = sorted;
  return (top.score || 0) > (second.score || 0) ? top : null;
}

const chooseArtist = (name, candidates) => chooseArtistByName(name, candidates, {
  tieBreak: mostRelevant,
});

let classified = 0;
let live = 0;
let cacheHits = 0;
const residue = [];

for (const [index, target] of targets.entries()) {
  const search = await musicbrainz(
    `https://musicbrainz.org/ws/2/artist/?query=artist:%22${encodeURIComponent(luceneEscape(target.name))}%22&fmt=json&limit=3`,
    'search',
    target.name,
  );
  if (search.fromCache) cacheHits += 1; else { live += 1; await sleep(DELAY_MS); }

  if (!search.body) {
    residue.push({ name: target.name, plays: target.plays ?? 0, reason: 'search failed' });
    continue;
  }

  const { artist, reason } = chooseArtist(target.name, search.body.artists);
  if (!artist) {
    residue.push({ name: target.name, plays: target.plays ?? 0, reason });
    continue;
  }

  const detail = await musicbrainz(
    `https://musicbrainz.org/ws/2/artist/${artist.id}?inc=genres&fmt=json`,
    'detail',
    artist.id,
  );
  if (detail.fromCache) cacheHits += 1; else { live += 1; await sleep(DELAY_MS); }

  if (!detail.body) {
    residue.push({ name: target.name, plays: target.plays ?? 0, reason: 'detail failed' });
    continue;
  }

  // Only genres the ontology already knows. An unknown MBID means the vocabulary
  // is stale, and growing it is sync_genre_ontology.mjs's job, not this script's.
  const genres = (detail.body.genres ?? [])
    .filter(genre => ontologyTermIds.has(`musicbrainz:${genre.id}`))
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 4)
    .map(genre => ({ id: genre.id, name: genre.name, votes: genre.count ?? 0 }));

  if (!genres.length) {
    residue.push({ name: target.name, plays: target.plays ?? 0, reason: 'MusicBrainz artist carries no known genre' });
    continue;
  }

  observations[norm(target.name)] = {
    name: target.name,
    musicbrainzArtistId: artist.id,
    genres,
  };
  classified += 1;

  if ((index + 1) % 100 === 0 || index === targets.length - 1) {
    console.log(`  [${index + 1}/${targets.length}] classified ${classified} · live ${live} · cached ${cacheHits}`);
  }
}

const sortedArtists = Object.fromEntries(
  Object.keys(observations).sort().map(key => [key, observations[key]]),
);
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify({
  schemaVersion: 1,
  provider: 'musicbrainz',
  sourceUrl: 'https://musicbrainz.org/doc/MusicBrainz_API',
  note: 'Machine observations, not curated truth. artist_meta.json always wins.',
  artistCount: Object.keys(sortedArtists).length,
  artists: sortedArtists,
}, null, 2)}\n`);

residue.sort((a, b) => b.plays - a.plays);
fs.writeFileSync(RESIDUE_PATH, `${JSON.stringify(residue.slice(0, 400), null, 2)}\n`);

console.log('\nDone.');
console.log(`  newly classified    : ${classified}`);
console.log(`  refused / no genre  : ${residue.length}`);
console.log(`  observations file   : ${Object.keys(sortedArtists).length} artists`);
