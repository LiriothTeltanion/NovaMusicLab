// Fills cover art for hand-picked rooms. Emotional Map signatures are public
// editorial choices; personal obsession peaks and annual headlines are opt-in
// because fetching them discloses those artist/track pairs to Deezer/iTunes.
// Dev-time only; writes verified exact/alias matches into track_images.json.
//
// Public signatures only:
//   node scripts/fetch_curated_track_art.mjs
// Include private-history-derived room rows after explicit consent:
//   node scripts/fetch_curated_track_art.mjs --include-personal-rooms
import fs from 'node:fs';

const tracks = JSON.parse(fs.readFileSync('src/data/track_images.json', 'utf8'));
const data = JSON.parse(fs.readFileSync('src/data/music_dna_compiled.json', 'utf8'));
const INCLUDE_PERSONAL_ROOMS = process.argv.includes('--include-personal-rooms');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const ARTIST_ALIASES = {
  'slaves': ['rain city drive'],
  "h.e.a.t": ['heat'],
  'hayehudim': ['היהודים', 'ha-yehudim'],
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

async function deezerTrack(artist, title) {
  for (const name of namesFor(artist)) {
    const q = `artist:"${cleanTerm(name)}" track:"${cleanTerm(title)}"`;
    const d = await getJson(`https://api.deezer.com/search/track?q=${encodeURIComponent(q)}&limit=5`);
    const hit = d?.data?.find(r => artistMatches(r.artist?.name, artist) && titleMatches(r.title, title));
    if (hit?.album?.cover_xl || hit?.album?.cover_big) return hit.album.cover_xl ?? hit.album.cover_big;
    await sleep(250);
  }
  const d = await getJson(`https://api.deezer.com/search/track?q=${encodeURIComponent(cleanTerm(artist + ' ' + title))}&limit=8`);
  const hit = d?.data?.find(r => artistMatches(r.artist?.name, artist) && titleMatches(r.title, title));
  return hit?.album?.cover_xl ?? hit?.album?.cover_big ?? null;
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

const SIGNATURE_PAIRS = [
  ['Alcest', 'Shellstar'],
  ['nothingnowhere.', 'Great Mass of Color'],
  ['Hammock', 'Love Who Loves You Back'],
  ['The Word Alive', 'Prayers'],
  ['Slaves', 'Red Clouds'],
  ['Odeon', 'Ritual'],
  ['All Time Low', 'THICC THICCLY'],
  ['Aries', 'Aperol Spritz'],
  ['TesseracT', 'Of Matter - Proxy'],
  ['Hammock', 'The Journey'],
  ['Corbin Karasu', 'Midnight Relief'],
  ['Astral Wonder', 'Candyland'],
  ['H.E.A.T', 'Back to Life'],
  ['Bad Omens', 'Just Pretend'],
  ['Falling In Reverse', 'Popular Monster'],
  ['Carpenter Brut', 'Turbo Killer'],
  ['Dance With the Dead', 'Vampires'],
  ['The Midnight', 'Neo Tokyo'],
  ['Perturbator', 'Roller Mobster'],
  ['Holding Absence', 'Wilt'],
];

const featuredPairs = [
  ...SIGNATURE_PAIRS,
  ...(INCLUDE_PERSONAL_ROOMS
    ? [
        ...(data.obsessions ?? []).map(row => [row.artist, row.track]),
        ...(data.yearly_eras ?? []).map(row => [row.top_artist, row.top_track]),
      ]
    : []),
].filter(([artist, title]) => artist && title);

const PAIRS = [...new Map(
  featuredPairs.map(pair => [`${norm(pair[0])}|||${norm(pair[1])}`, pair]),
).values()];

let filled = 0;
if (!INCLUDE_PERSONAL_ROOMS) {
  console.log('[privacy] Personal Obsessions and Annual Summary rows are excluded. Pass --include-personal-rooms only after explicit consent.');
}
for (const [artist, title] of PAIRS) {
  const key = `${artist.toLowerCase()}|||${title.toLowerCase()}`;
  if (tracks[key]) { console.log(`[skip] ${artist} - ${title}: already covered`); continue; }
  let url = await deezerTrack(artist, title);
  let source = 'deezer';
  if (!url) { url = await itunesTrack(artist, title); source = 'itunes'; }
  if (url) { tracks[key] = { thumb: url, source }; filled++; }
  console.log(`[track] ${artist} - ${title}: ${url ? 'OK (' + source + ')' : 'MISS'}`);
  await sleep(300);
}

fs.writeFileSync('src/data/track_images.json', JSON.stringify(tracks, null, 2) + '\n');
console.log(`\nFilled ${filled}/${PAIRS.length} curated track covers.`);
