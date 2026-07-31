// Dev-side artist portrait harvest from the public Deezer API (no key, no auth).
//
// Why this pass exists: the archive holds 6,413 artists and only ~113 had a
// portrait, so 98% of the museum rendered a generated avatar. Wikimedia and
// Wikidata cover the curated top only - they simply have no entry for most of
// the long tail - while Deezer returned a result for every artist sampled,
// down to one-play entries.
//
// Matching rule, measured on a 30-artist sample spread across the whole
// play-count range before this script was written:
//   exact name match only                     -> 67%
//   + duplicates resolved by follower count   -> 90%
// The remaining 10% are refusals, not failures: a different artist with a
// similar name, or two equally plausible matches. Those stay without a photo
// rather than get the wrong face.
//
// Merges into artist_images.json; existing entries are never overwritten.
// Results are baked into static JSON - the app never calls this at runtime.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src', 'data');
const CACHE_DIR = path.join(ROOT, 'scripts', '.cache', 'deezer_artists');
const IMAGES_PATH = path.join(DATA, 'artist_images.json');
const RESIDUE_PATH = path.join(ROOT, 'scripts', 'artist_photo_residue.json');

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = (() => {
  const arg = process.argv.find(a => a.startsWith('--limit='));
  return arg ? Number(arg.split('=')[1]) : Infinity;
})();

const UA = 'NovaMusicLab/1.0 (+https://github.com/LiriothTeltanion/NovaMusicLab)';
const DELAY_MS = 320;
const BACKOFF_MS = 10_000;
const SEARCH = ['https:', '', 'api.deezer.com', 'search', 'artist'].join('/');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => (s || '').normalize('NFC').trim().toLowerCase();
const read = f => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

const catalog = read('music_dna_genre_catalog.json');
const rows = Array.isArray(catalog) ? catalog : (catalog.artists ?? []);
const images = read('artist_images.json');
const gallery = read('artist_gallery.json');
const before = Object.keys(images).length;

const hasPhoto = key => Boolean(images[key] || (gallery[key] && gallery[key].length));

const targets = rows
  .filter(r => r.name && !hasPhoto(norm(r.name)))
  .sort((a, b) => (b.plays || 0) - (a.plays || 0));

console.log('Deezer artist portrait harvest');
console.log(`  artists in archive        : ${rows.length}`);
console.log(`  already have a portrait   : ${rows.length - targets.length}`);
console.log(`  to look up                : ${targets.length}`);
if (DRY_RUN) {
  console.log('  --dry-run: no requests, no writes.');
  process.exit(0);
}

fs.mkdirSync(CACHE_DIR, { recursive: true });
// Full-Unicode cache key: ASCII-only normalisation collapses non-Latin names.
const cachePath = name => path.join(
  CACHE_DIR,
  `${Buffer.from(name, 'utf8').toString('base64url').slice(0, 120)}.json`,
);

async function searchArtist(name) {
  const cached = cachePath(name);
  if (fs.existsSync(cached)) {
    return { data: JSON.parse(fs.readFileSync(cached, 'utf8')), fromCache: true };
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(`${SEARCH}?limit=5&q=${encodeURIComponent(name)}`, {
        headers: { 'User-Agent': UA },
      });
      if (res.status === 429 || res.status === 403) {
        console.log(`    rate-limited (${res.status}), backing off ${BACKOFF_MS / 1000}s`);
        await sleep(BACKOFF_MS);
        continue;
      }
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json()).data ?? [];
      fs.writeFileSync(cached, JSON.stringify(data));
      return { data, fromCache: false };
    } catch (error) {
      console.log(`    error for "${name}": ${error.message}, retrying in 5s`);
      await sleep(5000);
    }
  }
  return { data: null, fromCache: false };
}

/**
 * Returns the Deezer artist we are confident is the right one, or null.
 * Never guesses: a wrong portrait is worse than a generated avatar.
 */
function chooseMatch(name, data) {
  const exact = data.filter(x => norm(x.name) === norm(name) && x.picture_xl);
  if (exact.length === 1) return { artist: exact[0], reason: 'exact' };
  if (exact.length === 0) return { artist: null, reason: 'no exact name match' };

  // Deezer carries duplicate entries for well-known acts. The canonical one
  // dominates on followers; if it does not, the two are genuinely ambiguous.
  const sorted = [...exact].sort((a, b) => (b.nb_fan || 0) - (a.nb_fan || 0));
  const [top, second] = sorted;
  if ((top.nb_fan || 0) >= Math.max(1000, (second.nb_fan || 0) * 5)) {
    return { artist: top, reason: 'dominant follower count' };
  }
  return { artist: null, reason: `${exact.length} equally plausible matches` };
}

let added = 0;
let live = 0;
let cacheHits = 0;
const residue = [];
const slice = targets.slice(0, LIMIT);

for (const [index, target] of slice.entries()) {
  const { data, fromCache } = await searchArtist(target.name);
  if (fromCache) cacheHits += 1; else live += 1;

  if (data === null) {
    residue.push({ name: target.name, plays: target.plays ?? 0, reason: 'lookup failed' });
  } else {
    const { artist, reason } = chooseMatch(target.name, data);
    if (artist) {
      images[norm(target.name)] = { thumb: artist.picture_xl, source: 'deezer' };
      added += 1;
    } else {
      residue.push({ name: target.name, plays: target.plays ?? 0, reason });
    }
  }

  if ((index + 1) % 250 === 0 || index === slice.length - 1) {
    console.log(`  [${index + 1}/${slice.length}] added ${added} · live ${live} · cached ${cacheHits}`);
  }
  if (!fromCache) await sleep(DELAY_MS);
}

const sorted = Object.fromEntries(Object.keys(images).sort().map(k => [k, images[k]]));
fs.writeFileSync(IMAGES_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
// Residue is capped: the tail is thousands of one-play artists and the file is
// a review queue, not an archive.
residue.sort((a, b) => b.plays - a.plays);
fs.writeFileSync(RESIDUE_PATH, `${JSON.stringify(residue.slice(0, 400), null, 2)}\n`);

console.log('\nDone.');
console.log(`  portraits added     : ${added}`);
console.log(`  refused / not found : ${residue.length}`);
console.log(`  artist_images.json  : ${before} -> ${Object.keys(sorted).length} keys`);
