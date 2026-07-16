// Pass 2: retry only the misses with cleaned search terms and a title-only
// fallback search (artist still validated against results before accepting).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetArg = process.argv[2];
if (!targetArg) {
  throw new Error('Usage: node scripts/fetch_itunes_art_pass2.mjs <media_targets.json>');
}
const targets = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), targetArg), 'utf8'));
if (!Array.isArray(targets.albums) || !Array.isArray(targets.tracks)) {
  throw new TypeError('media_targets.json must contain albums[] and tracks[].');
}

const outDir = path.join(ROOT, 'src', 'data');
const albums = JSON.parse(fs.readFileSync(path.join(outDir, 'album_images.json'), 'utf8'));
const tracks = JSON.parse(fs.readFileSync(path.join(outDir, 'track_images.json'), 'utf8'));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const norm = (s) => (s || '')
  .toLowerCase()
  .replace(/\s*\([^)]*\)\s*/g, ' ')
  .replace(/[^\p{L}\p{N}\s]/gu, '')
  .replace(/\s+/g, ' ')
  .trim();

const matches = (a, b) => {
  const na = norm(a), nb = norm(b);
  return na === nb || na.includes(nb) || nb.includes(na);
};

// Strip parentheticals and feat. from the SEARCH TERM itself (pass 1 only
// stripped them for comparison, so "(420CC EDITION)"-style suffixes polluted
// the query and produced zero results).
const cleanTerm = (s) => s.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();

async function search(term, entity) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=${entity}&limit=8`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'NovaMusicLab-dev-art-fetch/1.0' } });
      if (res.status === 403 || res.status === 429) { await sleep(20000); continue; }
      if (!res.ok) return null;
      return await res.json();
    } catch { await sleep(5000); }
  }
  return null;
}

const hiRes = (u) => u ? u.replace('100x100bb.jpg', '600x600bb.jpg') : null;

async function resolveAlbum(a) {
  const title = cleanTerm(a.title);
  // Attempt 1: cleaned artist + title
  let data = await search(`${a.artist} ${title}`, 'album');
  let hit = data?.results?.find(r => matches(r.artistName, a.artist) && matches(r.collectionName, a.title));
  if (hit) return hit;
  await sleep(350);
  // Attempt 2: title-only, validate artist
  data = await search(title, 'album');
  hit = data?.results?.find(r => matches(r.artistName, a.artist) && matches(r.collectionName, a.title));
  if (hit) return hit;
  await sleep(350);
  // Attempt 3: the album may exist only as a single/EP -> song search, use its art
  data = await search(`${a.artist} ${title}`, 'song');
  hit = data?.results?.find(r => matches(r.artistName, a.artist) && (matches(r.collectionName, a.title) || matches(r.trackName, a.title)));
  return hit ?? null;
}

async function resolveTrack(t) {
  const title = cleanTerm(t.title);
  let data = await search(`${t.artist} ${title}`, 'song');
  let hit = data?.results?.find(r => matches(r.artistName, t.artist) && matches(r.trackName, t.title));
  if (hit) return hit;
  await sleep(350);
  data = await search(title, 'song');
  hit = data?.results?.find(r => matches(r.artistName, t.artist) && matches(r.trackName, t.title));
  return hit ?? null;
}

let newAlbums = 0;
for (const a of targets.albums) {
  const key = `${a.artist.toLowerCase()}|||${a.title.toLowerCase()}`;
  if (albums[key]) continue;
  const hit = await resolveAlbum(a);
  if (hit?.artworkUrl100) { albums[key] = { thumb: hiRes(hit.artworkUrl100), source: 'itunes' }; newAlbums++; }
  console.log(`[album-p2] ${a.artist} - ${a.title}: ${hit ? 'OK' : 'miss'}`);
  await sleep(350);
}

let newTracks = 0;
for (const t of targets.tracks) {
  const key = `${t.artist.toLowerCase()}|||${t.title.toLowerCase()}`;
  if (tracks[key]) continue;
  const hit = await resolveTrack(t);
  if (hit?.artworkUrl100) { tracks[key] = { thumb: hiRes(hit.artworkUrl100), source: 'itunes' }; newTracks++; }
  console.log(`[track-p2] ${t.artist} - ${t.title}: ${hit ? 'OK' : 'miss'}`);
  await sleep(350);
}

fs.writeFileSync(path.join(outDir, 'album_images.json'), JSON.stringify(albums, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'track_images.json'), JSON.stringify(tracks, null, 2) + '\n');
console.log(`\nPASS2 DONE. New albums: +${newAlbums} (total ${Object.keys(albums).length}/100) | New tracks: +${newTracks} (total ${Object.keys(tracks).length}/50)`);
