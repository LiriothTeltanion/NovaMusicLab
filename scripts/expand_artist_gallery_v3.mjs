/**
 * Third pass at artist_gallery.json: adds Deezer's own artist portrait
 * (`picture_xl` from `/search/artist`) as a source neither v1 nor v2 used.
 *
 * Deezer often has several unrelated artists sharing the same display name
 * (e.g. two different "Odeon"s), and picking the wrong one would show a
 * stranger's face on the artist's dossier - worse than no photo at all. To
 * stay safe this script ONLY accepts a match when the search returns
 * EXACTLY ONE result whose name equals ours case-insensitively; any
 * ambiguity (0 or 2+ exact-name matches) is skipped rather than guessed.
 *
 * Usage: node scripts/expand_artist_gallery_v3.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KNOWLEDGE_PATH = join(ROOT, 'src', 'data', 'offline_artist_knowledge.json');
const GALLERY_PATH = join(ROOT, 'src', 'data', 'artist_gallery.json');
const CACHE_DIR = join(ROOT, 'scripts', '.cache', 'deezer_artist_picture');
mkdirSync(CACHE_DIR, { recursive: true });

const TARGET_PHOTOS = 4;
const UA = 'NovaMusicLab/1.0 (https://github.com/kevincusnir/nova-music-lab; kevincusnir@gmail.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cacheKey(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 80);
}

function cacheGet(key) {
  const file = join(CACHE_DIR, `${key}.json`);
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}

function cachePut(key, value) {
  writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify(value));
}

async function fetchJson(url, key) {
  const cached = key ? cacheGet(key) : null;
  if (cached) return { json: cached, fromCache: true };
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status}`);
  const json = await res.json();
  if (key) cachePut(key, json);
  return { json, fromCache: false };
}

async function checkUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NovaMusicLab-linkcheck' },
      signal: AbortSignal.timeout(15000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function deezerArtistPicture(name) {
  const key = `search-${cacheKey(name)}`;
  const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=10`;
  let json;
  try {
    ({ json } = await fetchJson(url, key));
  } catch {
    return null;
  }
  await sleep(300);
  const results = json?.data ?? [];
  const exact = results.filter((r) => r.name?.toLowerCase() === name.toLowerCase());
  if (exact.length !== 1) return null; // ambiguous (0 or 2+ same-named artists) - skip rather than guess
  const picture = exact[0].picture_xl || exact[0].picture_big;
  return picture || null;
}

const knowledge = JSON.parse(readFileSync(KNOWLEDGE_PATH, 'utf8'));
const gallery = JSON.parse(readFileSync(GALLERY_PATH, 'utf8'));

let improved = 0, checked = 0, ambiguousSkipped = 0;

for (const artist of knowledge.artists) {
  const key = artist.name.toLowerCase();
  const existing = gallery[key] ?? [];
  if (existing.length >= TARGET_PHOTOS) continue;
  checked++;

  const existingUrls = new Set(existing.map((p) => p.url));
  const names = [artist.name];
  if (artist.musicbrainz?.name && artist.musicbrainz.name !== artist.name) names.push(artist.musicbrainz.name);

  let picture = null;
  let wasAmbiguous = false;
  for (const name of names) {
    const searchKey = `search-${cacheKey(name)}`;
    const cachedBefore = cacheGet(searchKey);
    picture = await deezerArtistPicture(name);
    if (picture) break;
    if (!cachedBefore) {
      const raw = cacheGet(searchKey);
      const results = raw?.data ?? [];
      if (results.some((r) => r.name?.toLowerCase() === name.toLowerCase())) wasAmbiguous = true;
    }
  }

  if (!picture) {
    if (wasAmbiguous) ambiguousSkipped++;
    continue;
  }
  if (existingUrls.has(picture)) continue;
  if (!(await checkUrl(picture))) continue;

  gallery[key] = [...existing, { url: picture, source: 'deezer' }].slice(0, TARGET_PHOTOS);
  improved++;
  console.log(`  +1 ${artist.name} (now ${gallery[key].length})`);
}

writeFileSync(GALLERY_PATH, `${JSON.stringify(gallery, null, 2)}\n`);

const counts = Object.values(gallery).map((p) => p.length);
const dist = {};
counts.forEach((n) => { dist[n] = (dist[n] ?? 0) + 1; });
console.log(`\nChecked ${checked} artists below target, improved ${improved}, skipped ${ambiguousSkipped} ambiguous same-name matches.`);
console.log('Final distribution:', JSON.stringify(dist));
console.log(`Artists at ${TARGET_PHOTOS}+: ${counts.filter((n) => n >= TARGET_PHOTOS).length} / ${counts.length}`);
