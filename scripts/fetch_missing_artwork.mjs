import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../src/data');

const compiledPath = path.join(dataDir, 'music_dna_compiled.json');
const trackImagesPath = path.join(dataDir, 'track_images.json');
const albumImagesPath = path.join(dataDir, 'album_images.json');

const compiled = JSON.parse(fs.readFileSync(compiledPath, 'utf8'));
const trackImages = JSON.parse(fs.readFileSync(trackImagesPath, 'utf8'));
const albumImages = JSON.parse(fs.readFileSync(albumImagesPath, 'utf8'));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

const hiRes = (u) => u ? u.replace('100x100bb.jpg', '600x600bb.jpg') : null;

async function searchITunes(term, entity) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=${entity}&limit=5`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'NovaMusicLab-dev-art-fetch/1.0' } });
      if (res.status === 403 || res.status === 429) {
        console.log(`  iTunes rate-limited (${res.status}), backing off 15s...`);
        await sleep(15000);
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.log(`  iTunes fetch error: ${e.message}, retrying...`);
      await sleep(3000);
    }
  }
  return null;
}

async function searchDeezer(term, type) {
  const url = `https://api.deezer.com/search/${type}?q=${encodeURIComponent(term)}&limit=5`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'NovaMusicLab-dev-art-fetch/1.0' } });
      if (res.status === 403 || res.status === 429) {
        await sleep(10000);
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      await sleep(3000);
    }
  }
  return null;
}

console.log('=== STARTING ARTWORK EXTRACTION FOR MISSING TOP ITEMS ===');

// 1. Process Albums
console.log('\n--- Auditing Album Art Gaps ---');
let albumAdded = 0;
let albumSkipped = 0;
const topAlbums = compiled.top_albums.slice(0, 100);

for (const [idx, album] of topAlbums.entries()) {
  const key = `${album.artist.toLowerCase()}|||${album.title.toLowerCase()}`;
  
  if (albumImages[key]) {
    albumSkipped++;
    continue;
  }

  // Rain City Drive vs Slaves mapping check
  if (album.artist.toLowerCase() === 'rain city drive') {
    const slavesKey = `slaves|||${album.title.toLowerCase()}`;
    if (albumImages[slavesKey]) {
      albumImages[key] = albumImages[slavesKey];
      console.log(`[album-alias] ${album.artist} - ${album.title} -> copied from Slaves`);
      albumAdded++;
      continue;
    }
  }

  console.log(`[album ${idx + 1}/${topAlbums.length}] Fetching: ${album.artist} - ${album.title}`);
  
  // Try iTunes first
  let url = null;
  let source = 'itunes';
  const itData = await searchITunes(`${album.artist} ${album.title}`, 'album');
  
  if (itData?.results?.length) {
    // BOTH artist and title must match. A same-artist-any-title fallback would
    // attach a different release's cover, which this project explicitly bans
    // ("wrong art is worse than no art") - leave a genuine gap instead.
    const hit = itData.results.find(r => artistMatches(r.artistName, album.artist) && titleMatches(r.collectionName, album.title));
    if (hit?.artworkUrl100) {
      url = hiRes(hit.artworkUrl100);
    }
  }

  // Try Deezer fallback
  if (!url) {
    const dzData = await searchDeezer(`artist:"${album.artist}" album:"${album.title}"`, 'album');
    if (dzData?.data?.length) {
      const hit = dzData.data.find(r => artistMatches(r.artist?.name, album.artist) && titleMatches(r.title, album.title));
      if (hit?.cover_xl || hit?.cover_big) {
        url = hit.cover_xl || hit.cover_big;
        source = 'deezer';
      }
    }
  }

  if (url) {
    albumImages[key] = { thumb: url, source };
    console.log(`  -> Success! Saved from ${source}`);
    albumAdded++;
  } else {
    console.log(`  -> Missed (No artwork found)`);
  }
  
  await sleep(400);
}

// 2. Process Tracks
console.log('\n--- Auditing Track Art Gaps ---');
let trackAdded = 0;
let trackSkipped = 0;
const topTracks = compiled.top_tracks.slice(0, 100);

for (const [idx, track] of topTracks.entries()) {
  const key = `${track.artist.toLowerCase()}|||${track.title.toLowerCase()}`;
  
  if (trackImages[key]) {
    trackSkipped++;
    continue;
  }

  // Rain City Drive vs Slaves mapping check
  if (track.artist.toLowerCase() === 'rain city drive') {
    const slavesKey = `slaves|||${track.title.toLowerCase()}`;
    if (trackImages[slavesKey]) {
      trackImages[key] = trackImages[slavesKey];
      console.log(`[track-alias] ${track.artist} - ${track.title} -> copied from Slaves`);
      trackAdded++;
      continue;
    }
  }

  console.log(`[track ${idx + 1}/${topTracks.length}] Fetching: ${track.artist} - ${track.title}`);
  
  // Try iTunes first
  let url = null;
  let source = 'itunes';
  const itData = await searchITunes(`${track.artist} ${track.title}`, 'song');
  
  if (itData?.results?.length) {
    // BOTH artist and title must match - same rule as albums above.
    const hit = itData.results.find(r => artistMatches(r.artistName, track.artist) && titleMatches(r.trackName, track.title));
    if (hit?.artworkUrl100) {
      url = hiRes(hit.artworkUrl100);
    }
  }

  // Try Deezer fallback
  if (!url) {
    const dzData = await searchDeezer(`artist:"${track.artist}" track:"${track.title}"`, 'track');
    if (dzData?.data?.length) {
      const hit = dzData.data.find(r => artistMatches(r.artist?.name, track.artist) && titleMatches(r.title, track.title));
      if (hit?.album?.cover_xl || hit?.album?.cover_big) {
        url = hit.album.cover_xl || hit.album.cover_big;
        source = 'deezer';
      }
    }
  }

  if (url) {
    trackImages[key] = { thumb: url, source };
    console.log(`  -> Success! Saved from ${source}`);
    trackAdded++;
  } else {
    console.log(`  -> Missed (No artwork found)`);
  }
  
  await sleep(400);
}

// Write back
fs.writeFileSync(albumImagesPath, JSON.stringify(albumImages, null, 2) + '\n');
fs.writeFileSync(trackImagesPath, JSON.stringify(trackImages, null, 2) + '\n');

console.log('\n=== COMPLETED ARTWORK ENRICHMENT ===');
console.log(`- Albums:  ${albumAdded} added, ${albumSkipped} skipped`);
console.log(`- Tracks:  ${trackAdded} added, ${trackSkipped} skipped`);
