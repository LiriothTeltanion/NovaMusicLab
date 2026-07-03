// Pass 3: fill remaining art gaps using artist aliases + Deezer as a second
// public source (api.deezer.com, no key), and extend track coverage from the
// top 50 to all 100 top tracks. Dev-time only; results are baked into static
// JSON. Existing good entries are never overwritten.
//
// Run from the repo root: node scripts/fetch_art_pass3.mjs
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('src/data/music_dna_compiled.json', 'utf8'));
const albums = JSON.parse(fs.readFileSync('src/data/album_images.json', 'utf8'));
const tracks = JSON.parse(fs.readFileSync('src/data/track_images.json', 'utf8'));
const artists = JSON.parse(fs.readFileSync('src/data/artist_images.json', 'utf8'));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Store-side renames / romanizations: our-name -> alternate names accepted in results
const ARTIST_ALIASES = {
  'machine gun kelly': ['mgk'],
  'slaves': ['rain city drive'],           // band renamed; old catalog rehosted
  'היהודים': ['hayehudim', 'ha-yehudim'],
  "ג'ירפות": ['girafot'],
  'thekidszn': ['the kidszn', 'kidszn'],
  'nothingnowhere.': ['nothing,nowhere.', 'nothing nowhere'],
};

const norm = (s) => (s || '')
  .toLowerCase()
  .replace(/\s*\([^)]*\)\s*/g, ' ')
  .replace(/[^\p{L}\p{N}\s]/gu, '')
  .replace(/\s+/g, ' ')
  .trim();

const namesFor = (artist) => [artist, ...(ARTIST_ALIASES[artist.toLowerCase()] ?? [])];

const artistMatches = (candidate, ourArtist) =>
  namesFor(ourArtist).some(n => {
    const a = norm(candidate), b = norm(n);
    return a === b || a.includes(b) || b.includes(a);
  });

const titleMatches = (a, b) => {
  const na = norm(a), nb = norm(b);
  return na === nb || na.includes(nb) || nb.includes(na);
};

const cleanTerm = (s) => s.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();

async function getJson(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'NovaMusicLab-dev-art-fetch/1.0' } });
      if (res.status === 403 || res.status === 429) { await sleep(15000); continue; }
      if (!res.ok) return null;
      return await res.json();
    } catch { await sleep(4000); }
  }
  return null;
}

const itunesHiRes = (u) => u ? u.replace('100x100bb.jpg', '600x600bb.jpg') : null;

// ---------- Deezer ----------
async function deezerAlbum(artist, title) {
  for (const name of namesFor(artist)) {
    const q = `artist:"${cleanTerm(name)}" album:"${cleanTerm(title)}"`;
    const d = await getJson(`https://api.deezer.com/search/album?q=${encodeURIComponent(q)}&limit=5`);
    const hit = d?.data?.find(r => artistMatches(r.artist?.name, artist) && titleMatches(r.title, title));
    if (hit?.cover_xl || hit?.cover_big) return hit.cover_xl ?? hit.cover_big;
    await sleep(250);
  }
  // loose fallback: plain search, still validated
  const d = await getJson(`https://api.deezer.com/search/album?q=${encodeURIComponent(cleanTerm(artist + ' ' + title))}&limit=8`);
  const hit = d?.data?.find(r => artistMatches(r.artist?.name, artist) && titleMatches(r.title, title));
  return hit?.cover_xl ?? hit?.cover_big ?? null;
}

async function deezerTrack(artist, title) {
  for (const name of namesFor(artist)) {
    const q = `artist:"${cleanTerm(name)}" track:"${cleanTerm(title)}"`;
    const d = await getJson(`https://api.deezer.com/search/track?q=${encodeURIComponent(q)}&limit=5`);
    const hit = d?.data?.find(r => artistMatches(r.artist?.name, artist) && titleMatches(r.title, title));
    if (hit?.album?.cover_xl || hit?.album?.cover_big) return hit.album.cover_xl ?? hit.album.cover_big;
    await sleep(250);
  }
  return null;
}

// ---------- iTunes (with aliases) ----------
async function itunesAlbum(artist, title) {
  for (const name of namesFor(artist)) {
    const d = await getJson(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanTerm(name + ' ' + title))}&entity=album&limit=8`);
    const hit = d?.results?.find(r => artistMatches(r.artistName, artist) && titleMatches(r.collectionName, title));
    if (hit?.artworkUrl100) return itunesHiRes(hit.artworkUrl100);
    await sleep(300);
  }
  return null;
}

async function itunesTrack(artist, title) {
  for (const name of namesFor(artist)) {
    const d = await getJson(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanTerm(name + ' ' + title))}&entity=song&limit=8`);
    const hit = d?.results?.find(r => artistMatches(r.artistName, artist) && titleMatches(r.trackName, title));
    if (hit?.artworkUrl100) return itunesHiRes(hit.artworkUrl100);
    await sleep(300);
  }
  return null;
}

// ---------- Albums ----------
let newAlbums = 0;
for (const a of data.top_albums) {
  const key = `${a.artist.toLowerCase()}|||${a.title.toLowerCase()}`;
  if (albums[key]) continue;
  let url = await deezerAlbum(a.artist, a.title);
  let source = 'deezer';
  if (!url) { url = await itunesAlbum(a.artist, a.title); source = 'itunes'; }
  if (url) { albums[key] = { thumb: url, source }; newAlbums++; }
  console.log(`[album] ${a.artist} - ${a.title}: ${url ? 'OK (' + source + ')' : 'miss'}`);
  await sleep(300);
}

// ---------- Tracks: ALL 100 top tracks ----------
let newTracks = 0;
for (const t of data.top_tracks) {
  const key = `${t.artist.toLowerCase()}|||${t.title.toLowerCase()}`;
  if (tracks[key]) continue;
  // cheap win: if the same-key album art exists, CoverArt already falls back to
  // it at runtime - skip fetching a duplicate
  if (albums[key]) continue;
  let url = await deezerTrack(t.artist, t.title);
  let source = 'deezer';
  if (!url) { url = await itunesTrack(t.artist, t.title); source = 'itunes'; }
  if (url) { tracks[key] = { thumb: url, source }; newTracks++; }
  console.log(`[track] ${t.artist} - ${t.title}: ${url ? 'OK (' + source + ')' : 'miss'}`);
  await sleep(300);
}

// ---------- "Som" artist photo via unambiguous album lookup ----------
if (!artists['som']) {
  const d = await getJson(`https://api.deezer.com/search/album?q=${encodeURIComponent('album:"The Shape of Everything"')}&limit=10`);
  const hit = d?.data?.find(r => norm(r.artist?.name) === 'som' && titleMatches(r.title, 'The Shape of Everything'));
  if (hit?.artist?.id) {
    const art = await getJson(`https://api.deezer.com/artist/${hit.artist.id}`);
    if (art?.picture_xl || art?.picture_big) {
      artists['som'] = { thumb: art.picture_xl ?? art.picture_big, source: 'deezer' };
      console.log('[artist] Som: OK (deezer, disambiguated via album)');
    }
  } else {
    console.log('[artist] Som: still unresolved');
  }
}

fs.writeFileSync('src/data/album_images.json', JSON.stringify(albums, null, 2) + '\n');
fs.writeFileSync('src/data/track_images.json', JSON.stringify(tracks, null, 2) + '\n');
fs.writeFileSync('src/data/artist_images.json', JSON.stringify(artists, null, 2) + '\n');
console.log(`\nPASS3 DONE. Albums +${newAlbums} (${Object.keys(albums).length}/100) | Tracks +${newTracks} (map ${Object.keys(tracks).length}) | Som: ${artists['som'] ? 'resolved' : 'pending'}`);
