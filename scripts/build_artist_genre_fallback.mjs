// Derives the compact runtime genre fallback from the MusicBrainz observations.
//
// Two files exist on purpose, mirroring how the artist knowledge manifest feeds
// artist_open_primary_images.json:
//   artist_genre_observations.json  rich, dev-side: MBIDs, vote counts,
//                                   provenance. Feeds the assertion builder.
//   artist_genre_fallback.json      flat key -> label. This is the only one the
//                                   browser loads, so the museum never ships
//                                   MusicBrainz vote counts to a visitor.
//
// The parser consults artist_meta.json first, so nothing here can ever override
// a curated genre - it only fills silence.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src', 'data');
const OBSERVATIONS_PATH = path.join(DATA, 'artist_genre_observations.json');
const DEEZER_PATH = path.join(DATA, 'artist_genre_observations_deezer.json');
const CURATED_PATH = path.join(DATA, 'artist_meta.json');
const OUTPUT_PATH = path.join(DATA, 'artist_genre_fallback.json');

// How many genres to keep per artist. The curated file writes at most two
// ("Post-Metal / Post-Rock"), and matching that keeps one visual grammar.
const LABELS_PER_ARTIST = 2;
// Below this many MusicBrainz votes a genre is one person's opinion, not a
// consensus, and the museum should stay silent rather than repeat it.
const MIN_VOTES = 1;

// MusicBrainz stores genre names in lower case, and a naive capitalisation
// prints "Contemporary R&b", "Drum And Bass" and "Ebm" onto the museum walls.
// Initialisms keep their casing; small joining words stay lower unless they
// open the label.
const INITIALISMS = new Set(['r&b', 'edm', 'idm', 'ebm', 'uk', 'us', 'dj', 'nwobhm', 'fm', 'j', 'k']);
const MINOR_WORDS = new Set(['and', 'of', 'the', 'n']);

function titleCase(value) {
  return value
    .split(/(\s+|-|\/)/)
    .map((part, index) => {
      const lower = part.toLowerCase();
      if (INITIALISMS.has(lower)) return lower === 'r&b' ? 'R&B' : lower.toUpperCase();
      if (index > 0 && MINOR_WORDS.has(lower)) return lower;
      return /^[a-z]/.test(part) ? part[0].toUpperCase() + part.slice(1) : part;
    })
    .join('');
}

const readArtists = filePath => (fs.existsSync(filePath)
  ? JSON.parse(fs.readFileSync(filePath, 'utf8')).artists ?? {}
  : {});

const musicbrainz = readArtists(OBSERVATIONS_PATH);
const deezer = readArtists(DEEZER_PATH);

if (!Object.keys(musicbrainz).length && !Object.keys(deezer).length) {
  console.log('No observations yet - run a fetch_artist_genres_* script first.');
  process.exit(0);
}

const curated = JSON.parse(fs.readFileSync(CURATED_PATH, 'utf8'));
const curatedKeys = new Set(Object.keys(curated).map(k => k.normalize('NFC').trim().toLowerCase()));

const fallback = {};
const fromProvider = { musicbrainz: 0, deezer: 0 };
let skippedCurated = 0;
let skippedThin = 0;

function labelsFor(entry) {
  return (entry.genres ?? [])
    .filter(genre => (genre.votes ?? genre.albums ?? 1) >= MIN_VOTES)
    .slice(0, LABELS_PER_ARTIST)
    .map(genre => titleCase(genre.name));
}

// Precedence, most specific first. MusicBrainz names thousands of genres and
// joins the ontology by id; Deezer names 22 and is a fallback for the artists
// MusicBrainz has no tag for at all. Whichever wins, artist_meta.json wins over
// both - a hand-written genre is never one lookup away from a machine reading.
for (const [provider, source] of [['musicbrainz', musicbrainz], ['deezer', deezer]]) {
  for (const [key, entry] of Object.entries(source)) {
    if (curatedKeys.has(key)) { skippedCurated += 1; continue; }
    if (fallback[key]) continue;

    const labels = labelsFor(entry);
    if (!labels.length) { skippedThin += 1; continue; }
    fallback[key] = labels.join(' / ');
    fromProvider[provider] += 1;
  }
}

const sorted = Object.fromEntries(Object.keys(fallback).sort().map(k => [k, fallback[k]]));
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(sorted, null, 2)}\n`);

console.log('Artist genre fallback');
console.log(`  MusicBrainz observations: ${Object.keys(musicbrainz).length}`);
console.log(`  Deezer observations     : ${Object.keys(deezer).length}`);
console.log(`  skipped (curated wins)  : ${skippedCurated}`);
console.log(`  skipped (no consensus)  : ${skippedThin}`);
console.log(`  from MusicBrainz        : ${fromProvider.musicbrainz}`);
console.log(`  from Deezer             : ${fromProvider.deezer}`);
console.log(`  fallback entries        : ${Object.keys(sorted).length}`);
