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

if (!fs.existsSync(OBSERVATIONS_PATH)) {
  console.log('No observations file yet - run fetch_artist_genres_musicbrainz.mjs first.');
  process.exit(0);
}

const observations = JSON.parse(fs.readFileSync(OBSERVATIONS_PATH, 'utf8'));
const curated = JSON.parse(fs.readFileSync(CURATED_PATH, 'utf8'));
const curatedKeys = new Set(Object.keys(curated).map(k => k.normalize('NFC').trim().toLowerCase()));

const fallback = {};
let skippedCurated = 0;
let skippedThin = 0;

for (const [key, entry] of Object.entries(observations.artists ?? {})) {
  // A curated genre always wins. Emitting a fallback for the same artist would
  // put a machine reading one lookup away from the hand-written one.
  if (curatedKeys.has(key)) { skippedCurated += 1; continue; }

  const labels = (entry.genres ?? [])
    .filter(genre => (genre.votes ?? 0) >= MIN_VOTES)
    .slice(0, LABELS_PER_ARTIST)
    .map(genre => titleCase(genre.name));

  if (!labels.length) { skippedThin += 1; continue; }
  fallback[key] = labels.join(' / ');
}

const sorted = Object.fromEntries(Object.keys(fallback).sort().map(k => [k, fallback[k]]));
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(sorted, null, 2)}\n`);

console.log('Artist genre fallback');
console.log(`  observations read     : ${Object.keys(observations.artists ?? {}).length}`);
console.log(`  skipped (curated wins): ${skippedCurated}`);
console.log(`  skipped (no consensus): ${skippedThin}`);
console.log(`  fallback entries      : ${Object.keys(sorted).length}`);
