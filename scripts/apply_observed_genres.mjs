// Folds the MusicBrainz observation layer into the committed genre catalogue.
//
// Why this exists rather than just re-running compile:data - the honest reason:
// compile:data rebuilds the catalogue from Kevin's raw Last.fm and Spotify
// exports, and those exports are deliberately not in the repository. The
// catalogue is a committed artefact whose raw inputs cannot be replayed here,
// so the only way to reach it is to transform it in place.
//
// That makes drift the danger: if this script re-implemented the parser's genre
// rules, the catalogue would slowly stop matching what the app computes for a
// visitor's own upload. So it does not re-implement anything. It loads
// normalizeGenre from src/utils/analytics.ts through Vite - the same trick
// compile_kevin_music_dna.mjs uses to load the parser - and applies the same
// function the browser applies.
//
// Only rows the catalogue itself calls 'unclassified' are touched. A curated
// row is never rewritten, and plays, names and keys are never modified.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src', 'data');
const CATALOG_PATH = path.join(DATA, 'music_dna_genre_catalog.json');
const FALLBACK_PATH = path.join(DATA, 'artist_genre_fallback.json');
const COMPILED_PATH = path.join(DATA, 'music_dna_compiled.json');

const CHECK_ONLY = process.argv.includes('--check');

async function loadAnalytics() {
  const vite = await createServer({
    root: ROOT,
    configFile: false,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true },
  });
  try {
    return await vite.ssrLoadModule('/src/utils/analytics.ts');
  } finally {
    await vite.close();
  }
}

const { normalizeGenre } = await loadAnalytics();

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const rows = Array.isArray(catalog) ? catalog : catalog.artists;
const fallback = JSON.parse(fs.readFileSync(FALLBACK_PATH, 'utf8'));
const key = value => String(value ?? '').normalize('NFC').trim().toLowerCase();

const totalPlays = rows.reduce((sum, row) => sum + (row.plays || 0), 0);
const classifiedPlaysBefore = rows
  .filter(row => row.source !== 'unclassified')
  .reduce((sum, row) => sum + (row.plays || 0), 0);

let upgraded = 0;
let upgradedPlays = 0;
let refamilied = 0;
const familyCounts = new Map();

for (const row of rows) {
  if (row.source === 'unclassified') {
    const label = fallback[key(row.name)];
    if (label) {
      row.automaticGenre = label;
      row.source = 'observed';
      upgraded += 1;
      upgradedPlays += row.plays || 0;
      familyCounts.set(normalizeGenre(label), (familyCounts.get(normalizeGenre(label)) ?? 0) + 1);
    }
  }

  // Every row's family is re-derived, not only the new ones. automaticFamily is
  // a cached result of normalizeGenre, so whenever that function learns a new
  // family the stored catalogue is stale by definition - and a stale cache here
  // is what kept 122 curated artists labelled Alternative in the museum long
  // after their genres had been written down correctly.
  const family = normalizeGenre(row.automaticGenre);
  if (family !== row.automaticFamily) {
    row.automaticFamily = family;
    refamilied += 1;
  }
}

const classifiedPlaysAfter = classifiedPlaysBefore + upgradedPlays;
const pct = value => `${(value / totalPlays * 100).toFixed(1)}%`;

// top_genres is the play-weighted aggregate the museum charts read. It is a
// pure function of the catalogue - verified by replaying the committed
// aggregate with the previous normalizeGenre and matching it exactly - so it is
// recomputed here rather than left describing a taxonomy that no longer exists.
const compiled = JSON.parse(fs.readFileSync(COMPILED_PATH, 'utf8'));
const familyPlays = new Map();
for (const row of rows) {
  familyPlays.set(row.automaticFamily, (familyPlays.get(row.automaticFamily) ?? 0) + (row.plays || 0));
}
const nextTopGenres = [...familyPlays.entries()]
  .map(([name, plays]) => ({ name, plays }))
  .sort((left, right) => right.plays - left.plays || left.name.localeCompare(right.name));

const playsBefore = compiled.top_genres.reduce((sum, genre) => sum + genre.plays, 0);
const playsAfter = nextTopGenres.reduce((sum, genre) => sum + genre.plays, 0);
if (playsBefore !== playsAfter) {
  console.error(`Refusing to write: top_genres total moved ${playsBefore} -> ${playsAfter}.`);
  console.error('Regrouping genres must never change how many plays the archive contains.');
  process.exit(1);
}

console.log('Observed genre application');
console.log(`  catalogue rows        : ${rows.length}`);
console.log(`  fallback entries      : ${Object.keys(fallback).length}`);
console.log(`  rows upgraded         : ${upgraded}`);
console.log(`  families re-derived   : ${refamilied}`);
console.log(`  play coverage         : ${pct(classifiedPlaysBefore)} -> ${pct(classifiedPlaysAfter)}`);
console.log(`  genre families        : ${compiled.top_genres.length} -> ${nextTopGenres.length}`);
console.log(`  plays accounted for   : ${playsAfter} (unchanged)`);
console.log('');
console.log('  top families after:');
nextTopGenres.slice(0, 12)
  .forEach(genre => console.log(`    ${String(genre.plays).padStart(6)}  ${genre.name}`));

const alternativeBefore = compiled.top_genres.find(genre => genre.name === 'Alternative')?.plays ?? 0;
const alternativeAfter = nextTopGenres.find(genre => genre.name === 'Alternative')?.plays ?? 0;
console.log('');
console.log(`  "Alternative" bucket  : ${alternativeBefore} -> ${alternativeAfter} plays`);

if (CHECK_ONLY) {
  console.log('\n  --check: nothing written.');
  process.exit(0);
}

compiled.top_genres = nextTopGenres;
fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
fs.writeFileSync(COMPILED_PATH, `${JSON.stringify(compiled, null, 2)}\n`);
console.log('\n  Catalogue and compiled dataset updated.');
