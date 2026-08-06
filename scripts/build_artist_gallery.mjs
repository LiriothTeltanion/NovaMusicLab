/**
 * Build artist_gallery.json: up to 4 photos per artist from distinct open
 * sources, so portraits can rotate instead of being frozen to one image.
 *
 * Sources, in order:
 *   1. The existing primary thumb from artist_images.json (visual continuity).
 *   2. Deezer artist picture (1000px, public API, name-validated match).
 *   3. Wikimedia Commons images already stored in the offline knowledge base
 *      (Special:FilePath URLs, served at width=800).
 *
 * Every candidate URL is HTTP-checked (GET, redirects followed) before it
 * ships; anything that doesn't answer 2xx is dropped. Wrong art is worse
 * than no art: Deezer hits are accepted only when the artist name matches.
 *
 * Usage: node scripts/build_artist_gallery.mjs [--skip-check]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { wikimediaFileKey } from './lib/wikimediaFileKey.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KNOWLEDGE_PATH = join(ROOT, 'src', 'data', 'offline_artist_knowledge.json');
const IMAGES_PATH = join(ROOT, 'src', 'data', 'artist_images.json');
const GALLERY_PATH = join(ROOT, 'src', 'data', 'artist_gallery.json');

const SKIP_CHECK = process.argv.includes('--skip-check');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Store-side renames / romanizations (same map family as fetch_art_pass3).
const ARTIST_ALIASES = {
  'machine gun kelly': 'mgk',
  'slaves': 'rain city drive',
  'היהודים': 'hayehudim',
  "ג'ירפות": 'girafot',
};

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function namesMatch(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  return na === nb || na.replace(/\s/g, '') === nb.replace(/\s/g, '');
}

/**
 * Deezer answers with a stand-in image for artists it has no photo for, and it
 * has served that stand-in two different ways. The original guard here only
 * knew the first: an empty path segment, /images/artist//. Deezer now fills
 * that segment with the MD5 of the empty string instead, so the guard silently
 * stopped working and five top-100 artists - Nine Inch Nails, Skid Row, Neck
 * Deep, The Story So Far and boy pablo - picked up a blank tile as a real
 * gallery photo. The identity audit caught it; the file's own rule is that
 * wrong art is worse than no art.
 */
const DEEZER_EMPTY_MD5 = 'd41d8cd98f00b204e9800998ecf8427e';

function isDeezerPlaceholder(url) {
  return url.includes('/artist//') || url.includes(`/artist/${DEEZER_EMPTY_MD5}/`);
}

async function deezerArtistPicture(name) {
  const tryNames = [name, ARTIST_ALIASES[name.toLowerCase()]].filter(Boolean);
  for (const candidate of tryNames) {
    const url = `https://api.deezer.com/search/artist?q=artist:"${encodeURIComponent(candidate)}"&limit=3`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const json = await res.json();
      const hit = (json.data ?? []).find((d) => namesMatch(d.name, candidate));
      const pic = hit?.picture_xl ?? hit?.picture_big;
      if (pic && !isDeezerPlaceholder(pic)) return pic;
    } catch { /* next candidate */ }
  }
  return null;
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

const knowledge = JSON.parse(readFileSync(KNOWLEDGE_PATH, 'utf8'));
const primary = JSON.parse(readFileSync(IMAGES_PATH, 'utf8'));

/**
 * Seeded from the existing file, not started empty.
 *
 * This loop only walks the current top 100, so a fresh object silently deleted
 * everyone else: the 2026-08 refresh ran it and 17 artists lost their gallery
 * outright - Machine Gun Kelly and היהודים among them - while 55 more came back
 * with fewer photos than they had. The top 100 turns over every refresh, and
 * ArtistAvatar reads this file for any artist, not just the ranked ones, so a
 * gallery that was good enough to ship last month is still good enough today.
 *
 * Every other harvester in this repo merges rather than replaces. This one now
 * does too: existing photos are kept, new sources are appended, and the 4-photo
 * cap still applies.
 */
const gallery = JSON.parse(readFileSync(GALLERY_PATH, 'utf8'));
let deezerHits = 0, wikimediaExtras = 0;

for (const artist of knowledge.artists) {
  const key = artist.name.toLowerCase();
  const photos = [...(gallery[key] ?? [])];
  // Keyed canonically, not by raw URL: Commons serves one file under two very
  // different addresses, so a string set lets the same photo in twice.
  const seen = new Set(photos.map(photo => wikimediaFileKey(photo.url)));
  // Drop anything the placeholder rule now rejects, so a bad tile committed by
  // an earlier run does not survive forever just because it is already here.
  for (let index = photos.length - 1; index >= 0; index -= 1) {
    if (isDeezerPlaceholder(photos[index].url)) {
      seen.delete(photos[index].url);
      photos.splice(index, 1);
    }
  }
  const push = (url, source) => {
    if (!url) return;
    const key = wikimediaFileKey(url);
    if (seen.has(key)) return;
    seen.add(key);
    photos.push({ url, source });
  };

  const primaryEntry = primary[key];
  if (primaryEntry) push(primaryEntry.thumb, primaryEntry.source);

  const deezer = await deezerArtistPicture(artist.name);
  if (deezer) { push(deezer, 'deezer'); if (photos.length > 1 || !primaryEntry) deezerHits++; }
  await sleep(150);

  for (const wm of (artist.wikidata?.images ?? []).slice(0, 2)) {
    const sized = `${wm.replace(/^http:/, 'https:')}?width=800`;
    const before = photos.length;
    push(sized, 'wikimedia');
    if (photos.length > before) wikimediaExtras++;
  }

  if (photos.length) gallery[key] = photos.slice(0, 4);
}

console.log(`Gallery built: ${Object.keys(gallery).length} artists, deezer +${deezerHits}, wikimedia +${wikimediaExtras}`);

if (!SKIP_CHECK) {
  const targets = Object.entries(gallery).flatMap(([k, photos]) =>
    photos.filter((p) => p.source !== primary[k]?.source || p.url !== primary[k]?.thumb)
      .map((p) => ({ k, p })),
  );
  console.log(`Link check: ${targets.length} new URLs...`);
  let done = 0, dropped = 0;
  const queue = [...targets];
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const t = queue.pop();
      const ok = await checkUrl(t.p.url);
      done++;
      if (done % 40 === 0) console.log(`  checked ${done}...`);
      if (!ok) {
        gallery[t.k] = gallery[t.k].filter((x) => x.url !== t.p.url);
        if (!gallery[t.k].length) delete gallery[t.k];
        dropped++;
      }
    }
  }));
  console.log(`Link check done: ${dropped} dropped`);
}

writeFileSync(GALLERY_PATH, `${JSON.stringify(gallery, null, 2)}\n`);

const counts = Object.values(gallery).map((p) => p.length);
const multi = counts.filter((c) => c >= 2).length;
console.log(`\nFinal: ${Object.keys(gallery).length} artists in gallery, ${multi} with 2+ photos, avg ${(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(2)}`);
