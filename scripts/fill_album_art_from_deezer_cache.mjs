// Fills remaining album covers from the Deezer responses already on disk.
//
// The genre harvest fetched every artist's album list to read genre_id, and
// those same responses carry cover_xl - 47,997 covers across 4,574 artists,
// sitting in scripts/.cache/deezer_albums. This pass spends no network at all;
// it only reads what a previous pass already paid for.
//
// Cover Art Archive runs first and stays preferred: it joins on the MusicBrainz
// release-group MBID, which cannot match the wrong record. This is the fallback
// for the releases CAA has no image for - live albums, regional editions and
// the discographies of artists who only just entered the top 100.
//
// Matching is exact on the album title after normalisation. A cover is a claim
// about which record you are looking at, so a near-miss is worse than a blank
// tile: "Live at Wacken" and "Live at Wacken Open Air" are different releases.
//
// Merges into album_images.json; existing entries are never overwritten.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chooseArtistByName, exactName } from './lib/artistNameMatch.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src', 'data');
const ARTIST_CACHE = path.join(ROOT, 'scripts', '.cache', 'deezer_artists');
const ALBUM_CACHE = path.join(ROOT, 'scripts', '.cache', 'deezer_albums');
const ALBUM_ART_PATH = path.join(DATA, 'album_images.json');
const RESIDUE_PATH = path.join(ROOT, 'scripts', 'album_art_deezer_residue.json');

const DRY_RUN = process.argv.includes('--dry-run');

/** Deezer serves the MD5 of the empty string when a release has no artwork. */
const DEEZER_EMPTY_MD5 = 'd41d8cd98f00b204e9800998ecf8427e';

const read = file => JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));
const artKey = (artist, title) => `${String(artist).toLowerCase()}|||${String(title).toLowerCase()}`;

/**
 * Album titles disagree on punctuation and edition suffixes far more than
 * artist names do. Normalising the decoration but never the words keeps
 * "Sempiternal (Deluxe Edition)" matching "Sempiternal" while leaving
 * "Live at Wacken" and "Live at Wacken Open Air" apart.
 */
function albumKey(title) {
  return exactName(title)
    .replace(/\s*[([]\s*(deluxe|remaster(ed)?|expanded|special|anniversary|bonus)[^)\]]*[)\]]/gi, '')
    .replace(/\s*-\s*(deluxe|remaster(ed)?|expanded)\b.*$/i, '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim();
}

const compiled = read('music_dna_compiled.json');
const knowledge = read('offline_artist_knowledge.json');
const albumArt = read('album_images.json');

// Everything the museum can put on screen, same set the coverage report uses.
const wanted = new Map();
for (const album of compiled.top_albums ?? []) {
  wanted.set(artKey(album.artist, album.title), { artist: album.artist, title: album.title });
}
for (const artist of knowledge.artists) {
  for (const title of artist.archive?.topAlbums ?? []) {
    wanted.set(artKey(artist.name, title), { artist: artist.name, title });
  }
  for (const group of artist.releaseGroups ?? []) {
    wanted.set(artKey(artist.name, group.title), { artist: artist.name, title: group.title });
  }
}
const missing = [...wanted.entries()].filter(([key]) => !albumArt[key]);

console.log('Album art from the cached Deezer responses');
console.log(`  displayable albums : ${wanted.size}`);
console.log(`  already covered    : ${wanted.size - missing.length}`);
console.log(`  to resolve here    : ${missing.length}`);

const artistCachePath = name => path.join(
  ARTIST_CACHE, `${Buffer.from(name, 'utf8').toString('base64url').slice(0, 120)}.json`,
);

const UA = 'NovaMusicLab/1.0 (+https://github.com/LiriothTeltanion/NovaMusicLab)';
const DELAY_MS = 340;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let liveRequests = 0;

/**
 * The genre harvest only fetched album lists for artists it could not classify,
 * so the cache covers the long tail and misses precisely the top-100 names that
 * need covers here. Anything absent is fetched once and cached, which is around
 * forty requests rather than the several thousand a cold run would cost.
 */
async function deezerArtistId(artistName) {
  const cached = artistCachePath(artistName);
  let candidates = null;

  if (fs.existsSync(cached)) {
    try { candidates = JSON.parse(fs.readFileSync(cached, 'utf8')); } catch { /* partial write */ }
  }
  if (!candidates) {
    try {
      const url = `https://api.deezer.com/search/artist?limit=5&q=${encodeURIComponent(artistName)}`;
      const response = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!response.ok) return null;
      candidates = (await response.json()).data ?? [];
      fs.mkdirSync(ARTIST_CACHE, { recursive: true });
      fs.writeFileSync(cached, JSON.stringify(candidates));
      liveRequests += 1;
      await sleep(DELAY_MS);
    } catch { return null; }
  }

  return chooseArtistByName(artistName, candidates, {
    tieBreak: matches => {
      const sorted = [...matches].sort((a, b) => (b.nb_fan || 0) - (a.nb_fan || 0));
      const [top, second] = sorted;
      return (top.nb_fan || 0) >= Math.max(1000, (second.nb_fan || 0) * 5) ? top : null;
    },
  }).artist;
}

/** One album list per artist, indexed by normalised album title. */
const albumsByArtist = new Map();
async function albumsFor(artistName) {
  if (albumsByArtist.has(artistName)) return albumsByArtist.get(artistName);

  let index = null;
  const artist = await deezerArtistId(artistName);

  if (artist) {
    const albumFile = path.join(ALBUM_CACHE, `artist-${artist.id}-albums.json`);
    let body = null;

    if (fs.existsSync(albumFile)) {
      try { body = JSON.parse(fs.readFileSync(albumFile, 'utf8')); } catch { /* partial write */ }
    }
    if (!body && !DRY_RUN) {
      try {
        const response = await fetch(`https://api.deezer.com/artist/${artist.id}/albums?limit=100`, {
          headers: { 'User-Agent': UA },
        });
        if (response.ok) {
          body = await response.json();
          fs.mkdirSync(ALBUM_CACHE, { recursive: true });
          fs.writeFileSync(albumFile, JSON.stringify(body));
          liveRequests += 1;
          await sleep(DELAY_MS);
        }
      } catch { /* leave unresolved */ }
    }

    if (body) {
      index = new Map();
      for (const album of body.data ?? []) {
        const cover = album.cover_xl || album.cover_big;
        if (!cover || cover.includes(DEEZER_EMPTY_MD5)) continue;
        const key = albumKey(album.title);
        // Keep the first, which Deezer returns most-recent-first; a later
        // reissue should not displace the entry already chosen.
        if (key && !index.has(key)) index.set(key, cover);
      }
    }
  }

  albumsByArtist.set(artistName, index);
  return index;
}

let added = 0;
const residue = [];
for (const [key, album] of missing) {
  const index = await albumsFor(album.artist);
  if (!index) { residue.push({ ...album, reason: 'no cached Deezer albums for this artist' }); continue; }

  const cover = index.get(albumKey(album.title));
  if (!cover) { residue.push({ ...album, reason: 'no album with this exact title' }); continue; }

  albumArt[key] = { thumb: cover, source: 'deezer' };
  added += 1;
}

console.log('');
console.log(`  covers added       : ${added}`);
console.log(`  still missing      : ${residue.length}`);
console.log(`  live requests      : ${liveRequests}`);

if (DRY_RUN) {
  console.log('  --dry-run: nothing written.');
  residue.slice(0, 10).forEach(entry => console.log(`    ${entry.artist} — ${entry.title}  (${entry.reason})`));
  process.exit(0);
}

const sorted = Object.fromEntries(Object.keys(albumArt).sort().map(key => [key, albumArt[key]]));
fs.writeFileSync(ALBUM_ART_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
fs.writeFileSync(RESIDUE_PATH, `${JSON.stringify(residue, null, 2)}\n`);
console.log(`  album_images.json  : ${Object.keys(sorted).length} keys`);
