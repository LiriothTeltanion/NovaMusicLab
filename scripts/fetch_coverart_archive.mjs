// Dev-side album artwork extraction from the Cover Art Archive.
//
// Why this source: every release group in offline_artist_knowledge.json already
// carries its MusicBrainz release-group MBID, and the Cover Art Archive is keyed
// by exactly that MBID. So this is an exact join - no fuzzy artist/title matching
// and none of the mismatch risk the iTunes/Deezer search passes carry.
//
// The stored URL is the canonical coverartarchive.org address, never the
// dn7xxxxx.ca.archive.org node the redirect happens to resolve to today: those
// node hostnames are load-balanced and not stable.
//
// Merges into album_images.json. Existing entries are never overwritten.
// Results are baked into static JSON; the app itself never calls this at runtime.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src', 'data');
const CACHE_DIR = path.join(ROOT, 'scripts', '.cache', 'coverart');
const ALBUMS_PATH = path.join(DATA, 'album_images.json');
const RESIDUE_PATH = path.join(ROOT, 'scripts', 'album_art_residue.json');

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = (() => {
  const a = process.argv.find(x => x.startsWith('--limit='));
  return a ? Number(a.split('=')[1]) : Infinity;
})();

const UA = 'NovaMusicLab/1.0 (+https://github.com/LiriothTeltanion/NovaMusicLab)';
const DELAY_MS = 350;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Must match the reader in src/components/CoverArt.tsx exactly.
const norm = s => (s || '').normalize('NFC').trim().toLowerCase();
const artKey = (artist, title) => `${norm(artist)}|||${norm(title)}`;

const knowledge = JSON.parse(fs.readFileSync(path.join(DATA, 'offline_artist_knowledge.json'), 'utf8'));
const albums = JSON.parse(fs.readFileSync(ALBUMS_PATH, 'utf8'));
const before = Object.keys(albums).length;

fs.mkdirSync(CACHE_DIR, { recursive: true });
const cachePath = mbid => path.join(CACHE_DIR, `rg-${mbid}.json`);

/** Ask the Cover Art Archive whether this release group has front cover art. */
async function coverFor(mbid) {
  const cached = cachePath(mbid);
  if (fs.existsSync(cached)) {
    return { ...JSON.parse(fs.readFileSync(cached, 'utf8')), fromCache: true };
  }

  const url = `https://coverartarchive.org/release-group/${mbid}/front-500`;
  let result = { found: false, url: null };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // HEAD keeps this cheap: ~997 lookups without downloading ~80 MB of images.
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow', headers: { 'User-Agent': UA } });
      if (res.status === 429 || res.status === 503) {
        console.log(`    rate-limited (${res.status}), backing off 15s`);
        await sleep(15000);
        continue;
      }
      // 404 is a legitimate answer: this release group simply has no cover.
      result = res.ok ? { found: true, url } : { found: false, url: null };
      break;
    } catch (e) {
      console.log(`    fetch error: ${e.message}, retrying in 5s`);
      await sleep(5000);
    }
  }

  fs.writeFileSync(cached, JSON.stringify(result, null, 2));
  return { ...result, fromCache: false };
}

const targets = [];
for (const artist of knowledge.artists) {
  for (const rg of artist.releaseGroups ?? []) {
    if (!rg.id) continue;
    const key = artKey(artist.name, rg.title);
    if (albums[key]) continue; // already covered by iTunes/Deezer - never overwrite
    targets.push({ artist: artist.name, title: rg.title, mbid: rg.id, type: rg.primaryType, key });
  }
}

console.log(`Cover Art Archive pass`);
console.log(`  release groups needing art : ${targets.length}`);
console.log(`  already covered            : ${before} keys in album_images.json`);
if (DRY_RUN) {
  console.log('  --dry-run: no requests, no writes.');
  process.exit(0);
}

let found = 0;
let live = 0;
let cacheHits = 0;
const residue = [];
const slice = targets.slice(0, LIMIT);

for (const [i, t] of slice.entries()) {
  const res = await coverFor(t.mbid);
  if (res.fromCache) cacheHits++; else live++;

  if (res.found) {
    albums[t.key] = { thumb: res.url, source: 'coverartarchive' };
    found++;
  } else {
    residue.push({ artist: t.artist, title: t.title, mbid: t.mbid, reason: 'no front cover in Cover Art Archive' });
  }

  if ((i + 1) % 50 === 0 || i === slice.length - 1) {
    console.log(`  [${i + 1}/${slice.length}] found ${found} · live ${live} · cached ${cacheHits}`);
  }
  if (!res.fromCache) await sleep(DELAY_MS);
}

// Sort keys so the diff stays reviewable instead of shuffling on every run.
const sorted = Object.fromEntries(Object.keys(albums).sort().map(k => [k, albums[k]]));
fs.writeFileSync(ALBUMS_PATH, JSON.stringify(sorted, null, 2) + '\n');
fs.writeFileSync(RESIDUE_PATH, JSON.stringify(residue, null, 2) + '\n');

console.log(`\nDone.`);
console.log(`  covers added      : ${found}`);
console.log(`  no cover on CAA   : ${residue.length}`);
console.log(`  album_images.json : ${before} -> ${Object.keys(sorted).length} keys`);
console.log(`  residue written   : ${RESIDUE_PATH}`);
