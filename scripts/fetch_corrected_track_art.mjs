// Adds cover art for the tracks that replaced wrongly-attributed EmotionalMap
// entries (verified via the verify-emotionalmap-attributions and
// discover-emotionalmap-replacements workflows), plus Magnolia Park - Tokyo,
// whose attribution was independently confirmed correct but never got art in
// the original curated-track-art pass. Same Deezer+iTunes pattern as
// fetch_curated_track_art.mjs. Dev-time only; writes into track_images.json.
//
// Run from the repo root: node scripts/fetch_corrected_track_art.mjs
import fs from 'node:fs';

const tracks = JSON.parse(fs.readFileSync('src/data/track_images.json', 'utf8'));

// Already verified with art URLs by the discovery workflow - added directly,
// no re-fetch needed.
const VERIFIED_DIRECT = {
  'alcest|||kodama': { thumb: 'https://cdn-images.dzcdn.net/images/cover/e7ae442da2ad54106a682cd27f1d6f3c/1000x1000-000000-80-0-0.jpg', source: 'deezer' },
  'nothingnowhere.|||trauma factory': { thumb: 'https://cdn-images.dzcdn.net/images/cover/3bbf58c20ecd9527199f42930662a880/500x500-000000-80-0-0.jpg', source: 'deezer' },
  'slaves|||to better days': { thumb: 'https://cdn-images.dzcdn.net/images/cover/f715aa08d64a1a8f0654d607a9df8ec2/1000x1000-000000-80-0-0.jpg', source: 'deezer' },
  'dance with the dead|||near dark': { thumb: 'https://cdn-images.dzcdn.net/images/cover/9d9f792a5b18b6ba418681e7a2e92e8c/1000x1000-000000-80-0-0.jpg', source: 'deezer' },
  'all time low|||last young renegade': { thumb: 'https://cdn-images.dzcdn.net/images/cover/ceba654d1b1f12686a9b1f55ef9b1db8/1000x1000-000000-80-0-0.jpg', source: 'deezer' },
};

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

let added = 0;
for (const [key, value] of Object.entries(VERIFIED_DIRECT)) {
  if (tracks[key]) { console.log(`[skip] ${key}: already covered`); continue; }
  const ok = await checkUrl(value.thumb);
  if (!ok) { console.log(`[fail] ${key}: URL did not verify, skipping`); continue; }
  tracks[key] = value;
  added++;
  console.log(`[direct] ${key}: OK (${value.source})`);
}

// Magnolia Park - Tokyo: attribution confirmed correct (ISRC USEP42212005),
// but the earlier curated-track-art pass never found art for it - retry here.
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const norm = (s) => (s || '').toLowerCase().replace(/\s*\([^)]*\)\s*/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
const artistMatches = (a, b) => { const x = norm(a), y = norm(b); return x === y || x.includes(y) || y.includes(x); };
const titleMatches = (a, b) => { const x = norm(a), y = norm(b); return x === y || x.includes(y) || y.includes(x); };

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

const magnoliaKey = 'magnolia park|||tokyo';
if (tracks[magnoliaKey]) {
  console.log(`[skip] ${magnoliaKey}: already covered`);
} else {
  const q = `artist:"Magnolia Park" track:"Tokyo"`;
  const d = await getJson(`https://api.deezer.com/search/track?q=${encodeURIComponent(q)}&limit=5`);
  const hit = d?.data?.find(r => artistMatches(r.artist?.name, 'Magnolia Park') && titleMatches(r.title, 'Tokyo'));
  let url = hit?.album?.cover_xl ?? hit?.album?.cover_big ?? null;
  let source = 'deezer';
  if (!url) {
    const it = await getJson(`https://itunes.apple.com/search?term=${encodeURIComponent('Magnolia Park Tokyo')}&entity=song&limit=8`);
    const ihit = it?.results?.find(r => artistMatches(r.artistName, 'Magnolia Park') && titleMatches(r.trackName, 'Tokyo'));
    if (ihit?.artworkUrl100) { url = itunesHiRes(ihit.artworkUrl100); source = 'itunes'; }
  }
  if (url) {
    tracks[magnoliaKey] = { thumb: url, source };
    added++;
    console.log(`[fetch] ${magnoliaKey}: OK (${source})`);
  } else {
    console.log(`[fetch] ${magnoliaKey}: MISS`);
  }
}

fs.writeFileSync('src/data/track_images.json', JSON.stringify(tracks, null, 2) + '\n');
console.log(`\nAdded ${added} track art entries.`);
