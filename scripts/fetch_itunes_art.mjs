// One-time dev-side extraction of official album/track artwork from the public
// iTunes Search API (no auth, no key). Results are baked into static JSON;
// the app itself never calls this at runtime.
import fs from 'node:fs';

const targets = JSON.parse(fs.readFileSync(
  'C:/Users/kevin/AppData/Local/Temp/claude/C--Users-kevin-OneDrive-Escritorio-NovaMusicScan/fdc294b3-fb92-48a7-ad44-84b11918ce7f/scratchpad/media_targets.json',
  'utf8'
));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Normalize for matching: lowercase, strip punctuation/suffixes like (Deluxe)
const norm = (s) => (s || '')
  .toLowerCase()
  .replace(/\s*\((deluxe|deluxe edition|live|remastered|bonus[^)]*|feat\.[^)]*|\d+cc edition)[^)]*\)\s*/gi, ' ')
  .replace(/[^\p{L}\p{N}\s]/gu, '')
  .replace(/\s+/g, ' ')
  .trim();

const artistMatches = (a, b) => {
  const na = norm(a), nb = norm(b);
  return na === nb || na.includes(nb) || nb.includes(na);
};
const titleMatches = (a, b) => {
  const na = norm(a), nb = norm(b);
  return na === nb || na.includes(nb) || nb.includes(na);
};

async function search(term, entity) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=${entity}&limit=5`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'NovaMusicLab-dev-art-fetch/1.0' } });
      if (res.status === 403 || res.status === 429) {
        console.log(`  rate-limited (${res.status}), backing off 20s...`);
        await sleep(20000);
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.log(`  fetch error: ${e.message}, retrying in 5s`);
      await sleep(5000);
    }
  }
  return null;
}

const hiRes = (u) => u ? u.replace('100x100bb.jpg', '600x600bb.jpg') : null;

const albums = {};
let albumHits = 0;
for (const [i, a] of targets.albums.entries()) {
  const data = await search(`${a.artist} ${a.title}`, 'album');
  let hit = null;
  if (data?.results?.length) {
    hit = data.results.find(r => artistMatches(r.artistName, a.artist) && titleMatches(r.collectionName, a.title))
       ?? data.results.find(r => artistMatches(r.artistName, a.artist));
  }
  const key = `${a.artist.toLowerCase()}|||${a.title.toLowerCase()}`;
  if (hit?.artworkUrl100) {
    albums[key] = { thumb: hiRes(hit.artworkUrl100), source: 'itunes' };
    albumHits++;
  }
  console.log(`[album ${i + 1}/${targets.albums.length}] ${a.artist} - ${a.title}: ${hit ? 'OK' : 'miss'}`);
  await sleep(350);
}

const tracks = {};
let trackHits = 0;
for (const [i, t] of targets.tracks.entries()) {
  const data = await search(`${t.artist} ${t.title}`, 'song');
  let hit = null;
  if (data?.results?.length) {
    hit = data.results.find(r => artistMatches(r.artistName, t.artist) && titleMatches(r.trackName, t.title))
       ?? data.results.find(r => artistMatches(r.artistName, t.artist));
  }
  const key = `${t.artist.toLowerCase()}|||${t.title.toLowerCase()}`;
  if (hit?.artworkUrl100) {
    tracks[key] = { thumb: hiRes(hit.artworkUrl100), source: 'itunes' };
    trackHits++;
  }
  console.log(`[track ${i + 1}/${targets.tracks.length}] ${t.artist} - ${t.title}: ${hit ? 'OK' : 'miss'}`);
  await sleep(350);
}

const outDir = 'C:/Users/kevin/OneDrive/Escritorio/NovaMusicScan/Sources/nova-music-dashboard/src/data';
fs.writeFileSync(outDir + '/album_images.json', JSON.stringify(albums, null, 2) + '\n');
fs.writeFileSync(outDir + '/track_images.json', JSON.stringify(tracks, null, 2) + '\n');
console.log(`\nDONE. Albums: ${albumHits}/${targets.albums.length} | Tracks: ${trackHits}/${targets.tracks.length}`);
