/**
 * Second pass at artist_gallery.json: for every artist still short of 4
 * photos, pulls MORE candidates directly from Wikimedia Commons categories
 * (broader than the single P18/first-image field already embedded in
 * offline_artist_knowledge.json), filters out non-portrait files (album
 * covers, logos, posters, tour flyers), and HTTP-verifies every new URL
 * before accepting it. Existing photos are never removed or reordered.
 *
 * Usage: node scripts/expand_artist_gallery_v2.mjs [--skip-check]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KNOWLEDGE_PATH = join(ROOT, 'src', 'data', 'offline_artist_knowledge.json');
const GALLERY_PATH = join(ROOT, 'src', 'data', 'artist_gallery.json');
const CACHE_DIR = join(ROOT, 'scripts', '.cache', 'commons_gallery');
mkdirSync(CACHE_DIR, { recursive: true });

const TARGET_PHOTOS = 4;
const SKIP_CHECK = process.argv.includes('--skip-check');
const UA = 'NovaMusicLab/1.0 (https://github.com/kevincusnir/nova-music-lab; kevincusnir@gmail.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const EXCLUDE_FILENAME_SIGNALS = [
  'cover', 'album', 'single', ' ep ', '-ep', 'logo', 'poster', 'flyer',
  'ticket', 'setlist', 'banner', 'wordmark', 'symbol', 'artwork',
  'discography', 'tracklist', 'billboard', 'map', 'flag', 'award',
  // Some band names (Slaves, Nightlife, ...) collide with unrelated, sensitive
  // real-world Commons categories - a bare portrait-likeness filter isn't
  // enough to keep those out. Block specific known-bad patterns rather than
  // a bare "slave" substring, since the band's OWN legitimate photo is
  // literally titled "Slaves_American_band.jpg" and would match otherwise.
  'newly_released_slaves', 'cargo_of_newly_released', 'slavery',
  'plantation', 'auschwitz', 'holocaust', 'genocide', 'lynching', 'massacre',
  'file-type-icons', 'fileicon',
];

// A pure ASCII-strip key collapses any non-Latin-script name (Hebrew, etc.)
// to the same empty string, silently sharing one cache file across
// different artists. The hash suffix guarantees uniqueness regardless.
function cacheKey(name) {
  const ascii = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60);
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return `${ascii || 'x'}_${(hash >>> 0).toString(36)}`;
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

/**
 * Same Commons file can be reached through different URL shapes
 * (commons.wikimedia.org/wiki/Special:FilePath/X vs.
 * upload.wikimedia.org/.../thumb/.../NNNpx-X) depending on which API served
 * it. A raw string dedup misses that, so callers should key their
 * "already have this photo" sets by this instead of the literal URL.
 */
function wikimediaFileKey(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'commons.wikimedia.org' && u.pathname.startsWith('/wiki/Special:FilePath/')) {
      const name = decodeURIComponent(u.pathname.replace('/wiki/Special:FilePath/', ''));
      return name.replace(/_/g, ' ').toLowerCase();
    }
    if (u.hostname === 'upload.wikimedia.org') {
      const parts = u.pathname.split('/').filter(Boolean);
      let last = decodeURIComponent(parts[parts.length - 1] || '');
      last = last.replace(/^\d+px-/, '');
      return last.replace(/_/g, ' ').toLowerCase();
    }
  } catch { /* not a valid URL */ }
  return url;
}

function looksLikePortrait(title) {
  const lower = title.toLowerCase();
  if (lower.endsWith('.svg')) return false;
  return !EXCLUDE_FILENAME_SIGNALS.some((signal) => lower.includes(signal));
}

async function commonsCategoryFiles(categoryTitle) {
  const key = `cat-${cacheKey(categoryTitle)}`;
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(`Category:${categoryTitle}`)}&cmtype=file&cmlimit=40&format=json`;
  try {
    const { json, fromCache } = await fetchJson(url, key);
    if (!fromCache) await sleep(350);
    return (json.query?.categorymembers ?? []).map((m) => m.title);
  } catch {
    return [];
  }
}

async function commonsThumbUrls(titles) {
  if (!titles.length) return new Map();
  const key = `info-${cacheKey(titles.join('|'))}`;
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles.join('|'))}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`;
  try {
    const { json, fromCache } = await fetchJson(url, key);
    if (!fromCache) await sleep(350);
    const map = new Map();
    for (const page of Object.values(json.query?.pages ?? {})) {
      const info = page.imageinfo?.[0];
      const thumb = info?.thumburl ?? info?.url;
      if (thumb) map.set(page.title, thumb);
    }
    return map;
  } catch {
    return new Map();
  }
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

function categoryCandidates(artist, mbName) {
  const names = new Set([artist.name]);
  if (mbName && mbName !== artist.name) names.add(mbName);
  const stripped = artist.name.replace(/[.,'"!?]/g, '').trim();
  if (stripped && stripped !== artist.name) names.add(stripped);
  const base = [...names];
  for (const n of base) {
    names.add(`${n} (band)`);
    names.add(`${n} (musician)`);
  }
  return [...names];
}

/** Secondary source: images embedded directly in an artist's Wikipedia article, for
 * cases with no dedicated (or richly populated) Commons category. */
async function wikipediaMediaImages(title) {
  const key = `wp-${cacheKey(title)}`;
  const url = `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  try {
    const { json, fromCache } = await fetchJson(url, key);
    if (!fromCache) await sleep(300);
    // Keep the "File:" prefix - these titles are queried against Commons next,
    // which hosts the actual media regardless of which Wikipedia article embeds it.
    return (json.items ?? [])
      .filter((item) => item.type === 'image' && item.title?.startsWith('File:'))
      .map((item) => item.title);
  } catch {
    return [];
  }
}

const knowledge = JSON.parse(readFileSync(KNOWLEDGE_PATH, 'utf8'));
const gallery = JSON.parse(readFileSync(GALLERY_PATH, 'utf8'));

let artistsImproved = 0, photosAdded = 0, artistsChecked = 0;

for (const artist of knowledge.artists) {
  const key = artist.name.toLowerCase();
  const existing = gallery[key] ?? [];
  if (existing.length >= TARGET_PHOTOS) continue;
  artistsChecked++;

  const existingKeys = new Set(existing.map((p) => wikimediaFileKey(p.url)));
  const needed = TARGET_PHOTOS - existing.length;
  const candidates = categoryCandidates(artist, artist.musicbrainz?.name);

  let fileTitles = [];
  for (const candidate of candidates) {
    fileTitles = await commonsCategoryFiles(candidate);
    if (fileTitles.length) break;
  }
  if (!fileTitles.length) {
    fileTitles = await wikipediaMediaImages(artist.name);
  }
  if (!fileTitles.length) continue;

  const portraitTitles = fileTitles.filter(looksLikePortrait).slice(0, 12);
  if (!portraitTitles.length) continue;

  const thumbs = await commonsThumbUrls(portraitTitles);
  const newPhotos = [];
  for (const title of portraitTitles) {
    if (newPhotos.length >= needed) break;
    const url = thumbs.get(title);
    if (!url || existingKeys.has(wikimediaFileKey(url))) continue;
    if (SKIP_CHECK || (await checkUrl(url))) {
      newPhotos.push({ url, source: 'wikimedia' });
      existingKeys.add(wikimediaFileKey(url));
    }
  }

  if (newPhotos.length) {
    gallery[key] = [...existing, ...newPhotos].slice(0, TARGET_PHOTOS);
    artistsImproved++;
    photosAdded += newPhotos.length;
    console.log(`  +${newPhotos.length} ${artist.name} (now ${gallery[key].length})`);
  }
}

writeFileSync(GALLERY_PATH, `${JSON.stringify(gallery, null, 2)}\n`);

const counts = Object.values(gallery).map((p) => p.length);
const dist = {};
counts.forEach((n) => { dist[n] = (dist[n] ?? 0) + 1; });
console.log(`\nChecked ${artistsChecked} artists below target, improved ${artistsImproved}, +${photosAdded} photos total.`);
console.log('Final distribution:', JSON.stringify(dist));
console.log(`Artists at ${TARGET_PHOTOS}+: ${counts.filter((n) => n >= TARGET_PHOTOS).length} / ${counts.length}`);
