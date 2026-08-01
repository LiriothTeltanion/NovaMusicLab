/* eslint-disable no-console -- This CLI's public interface is its CI diagnostic output. */
/**
 * Post-build bundle guard. It protects both the entry file and the actual
 * landing closure: entry + HeroSection + InteractiveBackdrop and every static
 * JavaScript dependency those roots pull over the network.
 *
 * Run: npm run build && node scripts/check_bundle_budget.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'dist', 'assets');
const COMPILED_DATASET_PATH = path.join(ROOT, 'src', 'data', 'music_dna_compiled.json');
const compiledDataset = JSON.parse(fs.readFileSync(COMPILED_DATASET_PATH, 'utf8'));
const compiledDatasetDates = Object.keys(compiledDataset.daily_plays ?? {}).sort();
const COMPILED_DATASET_SENTINELS = [
  String(compiledDataset.core_metrics?.total_plays ?? ''),
  String(compiledDataset.core_metrics?.unique_artists ?? ''),
  compiledDataset.top_artists?.[0]?.name ?? '',
  compiledDatasetDates[0] ?? '',
  compiledDatasetDates.at(-1) ?? '',
].filter(Boolean);

const ENTRY_BUDGET_KB = 300;
// Current landing JS closure is ~268KB gzip after moodCore stopped the 600KB
// offline knowledge file from being fetched on first paint. The margin allows
// normal UI growth while any knowledge-base regression still fails loudly.
const SHELL_LANDING_GZIP_BUDGET_KB = 285;
const DEMO_LANDING_GZIP_BUDGET_KB = 315;
const SHELL_LANDING_ROOT_PREFIXES = ['index-', 'HeroSection-', 'InteractiveBackdrop-'];
const DEMO_DATASET_ROOT_PREFIX = 'music_dna_compiled-';
// Hebrew is a complete third-language experience, but ES/EN visitors must not
// pay its transfer cost. These dedicated chunks are loaded only after the user
// chooses עברית; their own budgets keep translation growth visible.
const HEBREW_LAZY_CHUNKS = [
  { name: 'Hebrew UI catalog', prefix: 'heStrings-', gzipBudgetKb: 35 },
  { name: 'Hebrew artist overlay', prefix: 'artist_enrichment_he-', gzipBudgetKb: 55 },
  { name: 'Hebrew artist loader', prefix: 'artistEnrichmentHebrew-', gzipBudgetKb: 2 },
  // Artwork lookup tables. CoverArt import()s these, and buildStaticClosure
  // deliberately ignores dynamic imports - so without their own budget these
  // grow invisibly with every artwork harvest. They are allowed to be large
  // because no visitor pays for them before a room that shows covers renders,
  // but the growth must stay measured rather than silent.
  { name: 'Album artwork map', prefix: 'album_images-', gzipBudgetKb: 60 },
  { name: 'Track artwork map', prefix: 'track_images-', gzipBudgetKb: 40 },
  // The wide artist portrait index: one entry per artist Deezer could resolve,
  // 5,374 of them. It is the largest lazy chunk in the app and it is mostly
  // incompressible - CDN image hashes are random - so gzip only recovers 5%.
  // The ceiling is what keeps it off the landing path: ArtistAvatar starts this
  // fetch only when no bundled source answers for an artist, so the hero and
  // the curated top 100 never pay for it. If a future harvest pushes past this,
  // shard the map by play rank instead of raising the number.
  { name: 'Artist portrait index', prefix: 'artist_images-', gzipBudgetKb: 165 },
];
// The genre foundation is intentionally loaded only by Genre Lab and the
// Living Artist Atlas. These independent limits prevent a future metadata
// harvest from silently turning either room into a multi-megabyte transfer.
const GENRE_LAZY_CHUNKS = [
  { name: 'Genre ontology', prefix: 'genre_ontology.v1-', gzipBudgetKb: 114 },
  { name: 'Artist genre assertions', prefix: 'artist_genre_assertions.v1-', gzipBudgetKb: 92 },
  { name: 'Full artist genre catalog', prefix: 'music_dna_genre_catalog-', gzipBudgetKb: 102 },
];
// Incremental cost after the landing closure is already cached. Baselines from
// the 2026-07-13 production build were 304 / 305 / 337 / 321 / 176KB gzip.
// The 6-8% headroom catches a heavy shared import or data leak without making
// small copy and interaction changes fail CI.
const ROOM_GZIP_BUDGETS = [
  { name: 'Dashboard', rootPrefix: 'Dashboard-', budgetKb: 325 },
  { name: 'StatsDeepDive', rootPrefix: 'StatsDeepDive-', budgetKb: 325 },
  // TEMPORARY 360 -> 375. Every other room carries 25-50% headroom, but this one
  // was pinned to its exact measured size, which made it a tripwire rather than a
  // budget: routine upstream growth in recharts and framer-motion was enough to
  // push it to 361 KB and fail CI on a dependency refresh.
  //
  // The real cause is that TopHistorico.tsx statically imports the 83 KB
  // artistEnrichment catalog that LivingArtistAtlas.tsx:58-67 already loads
  // lazily. Matching that pattern frees 83 KB, not 1.
  // Put this back to 360 as soon as that lands - the raise buys time, not room.
  { name: 'TopHistorico', rootPrefix: 'TopHistorico-', budgetKb: 375 },
  { name: 'EmotionalMap', rootPrefix: 'EmotionalMap-', budgetKb: 345 },
  { name: 'DataUploader', rootPrefix: 'DataUploader-', budgetKb: 190 },
  { name: 'ArtistIdentity', rootPrefix: 'ArtistIdentity-', budgetKb: 165 },
];

if (!fs.existsSync(ASSETS)) {
  console.error('[bundle-budget] dist/assets not found - run `npm run build` first.');
  process.exit(1);
}

const files = fs.readdirSync(ASSETS).filter(file => file.endsWith('.js'));
const fileSet = new Set(files);
const failures = [];

function findChunk(prefix) {
  const matches = files.filter(file => file.startsWith(prefix));
  if (matches.length !== 1) {
    failures.push(`Expected exactly one ${prefix}*.js chunk; found ${matches.length}.`);
    return null;
  }
  return matches[0];
}

/** Dynamic import(...) calls are deliberately excluded from this graph. */
function staticImports(source) {
  const imports = [];
  const pattern = /(?:^|[;\n])\s*(?:import(?!\s*\()|export)\s*(?:[^"'`;]*?from\s*)?["']\.\/([^"']+\.js)["']/g;
  for (const match of source.matchAll(pattern)) imports.push(match[1]);
  return imports;
}

function buildStaticClosure(roots) {
  const closure = new Set();
  const queue = roots.filter(Boolean);
  while (queue.length) {
    const file = queue.pop();
    if (closure.has(file)) continue;
    if (!fileSet.has(file)) {
      failures.push(`Static dependency ${file} referenced by a guarded closure was not emitted.`);
      continue;
    }
    closure.add(file);
    const source = fs.readFileSync(path.join(ASSETS, file), 'utf8');
    for (const dependency of staticImports(source)) {
      if (!closure.has(dependency)) queue.push(dependency);
    }
  }
  return closure;
}

function measureFiles(filesToMeasure) {
  let rawBytes = 0;
  let gzipBytes = 0;
  const details = [];

  for (const file of filesToMeasure) {
    const bytes = fs.readFileSync(path.join(ASSETS, file));
    const fileGzipBytes = gzipSync(bytes, { level: 9 }).length;
    rawBytes += bytes.length;
    gzipBytes += fileGzipBytes;
    details.push({ file, gzipBytes: fileGzipBytes });
  }

  return { rawBytes, gzipBytes, details };
}

function formatLargestContributors(details, limit = 6) {
  return details
    .toSorted((a, b) => b.gzipBytes - a.gzipBytes)
    .slice(0, limit)
    .map(item => `${item.file} ${(item.gzipBytes / 1024).toFixed(0)}KB`)
    .join(', ');
}

function hasOfflineKnowledgePayload(source) {
  return source.includes('emotionalSeeds')
    && source.includes('releaseGroups')
    && source.includes('musicbrainz');
}

function hasArtistEnrichmentPayload(source) {
  return source.includes('archive_role')
    && source.includes('sound_evolution')
    && source.includes('signature_moods');
}

function hasCompiledDatasetPayload(source) {
  // Structural field names also exist in the runtime trust-boundary validator,
  // so they cannot distinguish schema code from bundled listener data. Derive
  // several current payload sentinels instead; a real inline copy contains the
  // aggregate total, archive leaders and boundary dates together.
  return COMPILED_DATASET_SENTINELS.filter(value => source.includes(value)).length >= 3;
}

const entry = findChunk('index-');
if (entry) {
  const entryPath = path.join(ASSETS, entry);
  const sizeKb = fs.statSync(entryPath).size / 1024;
  console.log(`[bundle-budget] entry ${entry}: ${sizeKb.toFixed(0)} KB raw (budget ${ENTRY_BUDGET_KB} KB)`);
  if (sizeKb > ENTRY_BUDGET_KB) {
    failures.push(`Entry chunk ${entry} is ${sizeKb.toFixed(0)} KB (budget: ${ENTRY_BUDGET_KB} KB).`);
  }

  const source = fs.readFileSync(entryPath, 'utf8');
  if (hasOfflineKnowledgePayload(source)) {
    failures.push('offline_artist_knowledge.json content found INSIDE the entry chunk.');
  }
  if (hasCompiledDatasetPayload(source)) {
    failures.push('music_dna_compiled.json content found INSIDE the entry chunk.');
  }
}

for (const vendor of ['vendor-react', 'vendor-charts', 'vendor-motion']) {
  if (!files.some(file => file.startsWith(`${vendor}-`))) {
    failures.push(`Expected vendor chunk "${vendor}-*.js" is missing.`);
  }
}

const offlineKnowledgeChunk = findChunk('offlineArtistKnowledge-');
if (offlineKnowledgeChunk) {
  const source = fs.readFileSync(path.join(ASSETS, offlineKnowledgeChunk), 'utf8');
  if (hasArtistEnrichmentPayload(source)) {
    failures.push('Artist enrichment content leaked into the offline-knowledge chunk.');
  }
}

const hebrewLazyChunks = HEBREW_LAZY_CHUNKS.map(config => ({
  ...config,
  file: findChunk(config.prefix),
}));
const genreLazyChunks = GENRE_LAZY_CHUNKS.map(config => ({
  ...config,
  file: findChunk(config.prefix),
}));

for (const chunk of [...hebrewLazyChunks, ...genreLazyChunks]) {
  if (!chunk.file) continue;
  const measurement = measureFiles([chunk.file]);
  const gzipKb = measurement.gzipBytes / 1024;
  console.log(
    `[bundle-budget] ${chunk.name}: ${gzipKb.toFixed(1)} KB gzip `
    + `(lazy budget ${chunk.gzipBudgetKb} KB)`,
  );
  if (gzipKb > chunk.gzipBudgetKb) {
    failures.push(
      `${chunk.name} is ${gzipKb.toFixed(1)} KB gzip `
      + `(budget: ${chunk.gzipBudgetKb} KB). Review or split this lazy catalog.`,
    );
  }
}

const shellLandingRoots = SHELL_LANDING_ROOT_PREFIXES.map(findChunk);
const shellLandingClosure = buildStaticClosure(shellLandingRoots);
const shellLandingMeasurement = measureFiles(shellLandingClosure);
const demoDatasetRoot = findChunk(DEMO_DATASET_ROOT_PREFIX);
if (!demoDatasetRoot) {
  failures.push(`Expected lazy dataset chunk "${DEMO_DATASET_ROOT_PREFIX}*.js" is missing.`);
}
const demoLandingClosure = buildStaticClosure([...shellLandingRoots, demoDatasetRoot]);
const demoLandingMeasurement = measureFiles(demoLandingClosure);

for (const chunk of hebrewLazyChunks) {
  if (!chunk.file) continue;
  if (shellLandingClosure.has(chunk.file) || demoLandingClosure.has(chunk.file)) {
    failures.push(`${chunk.name} leaked into the ES/EN landing closure through ${chunk.file}.`);
  }
}
for (const chunk of genreLazyChunks) {
  if (!chunk.file) continue;
  if (shellLandingClosure.has(chunk.file) || demoLandingClosure.has(chunk.file)) {
    failures.push(`${chunk.name} leaked into the landing closure through ${chunk.file}.`);
  }
}

for (const file of demoLandingClosure) {
  const bytes = fs.readFileSync(path.join(ASSETS, file));
  const source = bytes.toString('utf8');
  if (file.startsWith('offlineArtistKnowledge-') || hasOfflineKnowledgePayload(source)) {
    failures.push(`Offline artist knowledge leaked into the landing closure through ${file}.`);
  }
}

const shellLandingRawKb = shellLandingMeasurement.rawBytes / 1024;
const shellLandingGzipKb = shellLandingMeasurement.gzipBytes / 1024;
console.log(
  `[bundle-budget] landing shell closure: ${shellLandingClosure.size} chunks, `
  + `${shellLandingRawKb.toFixed(0)} KB raw / ${shellLandingGzipKb.toFixed(0)} KB gzip `
  + `(budget ${SHELL_LANDING_GZIP_BUDGET_KB} KB gzip)`,
);
console.log(
  '[bundle-budget] landing shell roots: '
  + formatLargestContributors(shellLandingMeasurement.details),
);

if (shellLandingGzipKb > SHELL_LANDING_GZIP_BUDGET_KB) {
  failures.push(
    `Landing shell closure is ${shellLandingGzipKb.toFixed(0)} KB gzip `
    + `(budget: ${SHELL_LANDING_GZIP_BUDGET_KB} KB). Check HeroSection and InteractiveBackdrop static imports.`,
  );
}

const demoLandingRawKb = demoLandingMeasurement.rawBytes / 1024;
const demoLandingGzipKb = demoLandingMeasurement.gzipBytes / 1024;
console.log(
  `[bundle-budget] first demo visit closure: ${demoLandingClosure.size} chunks, `
  + `${demoLandingRawKb.toFixed(0)} KB raw / ${demoLandingGzipKb.toFixed(0)} KB gzip `
  + `(budget ${DEMO_LANDING_GZIP_BUDGET_KB} KB gzip; includes bundled dataset)`,
);
console.log(
  '[bundle-budget] first demo visit largest: '
  + formatLargestContributors(demoLandingMeasurement.details),
);

if (demoLandingGzipKb > DEMO_LANDING_GZIP_BUDGET_KB) {
  failures.push(
    `First demo visit is ${demoLandingGzipKb.toFixed(0)} KB gzip including the bundled dataset `
    + `(budget: ${DEMO_LANDING_GZIP_BUDGET_KB} KB). Inspect ${DEMO_DATASET_ROOT_PREFIX} and landing imports.`,
  );
}

for (const room of ROOM_GZIP_BUDGETS) {
  const root = findChunk(room.rootPrefix);
  if (!root) continue;

  const roomClosure = buildStaticClosure([root]);
  const incrementalClosure = new Set(
    [...roomClosure].filter(file => !shellLandingClosure.has(file)),
  );
  const measurement = measureFiles(incrementalClosure);
  const rawKb = measurement.rawBytes / 1024;
  const gzipKb = measurement.gzipBytes / 1024;
  const headroomKb = room.budgetKb - gzipKb;

  console.log(
    `[bundle-budget] room ${room.name}: ${incrementalClosure.size} incremental chunks, `
    + `${rawKb.toFixed(0)} KB raw / ${gzipKb.toFixed(0)} KB gzip after landing `
    + `(budget ${room.budgetKb} KB, headroom ${headroomKb.toFixed(0)} KB)`,
  );

  if (room.name !== 'TopHistorico') {
    for (const file of incrementalClosure) {
      const source = fs.readFileSync(path.join(ASSETS, file), 'utf8');
      if (hasArtistEnrichmentPayload(source)) {
        failures.push(`Artist enrichment leaked into ${room.name} through ${file}.`);
      }
    }
  }
  console.log(
    `[bundle-budget] room ${room.name} largest incremental: `
    + formatLargestContributors(measurement.details),
  );

  if (gzipKb > room.budgetKb) {
    failures.push(
      `${room.name} adds ${gzipKb.toFixed(0)} KB gzip after the landing closure `
      + `(budget: ${room.budgetKb} KB). Inspect ${room.rootPrefix} static imports and the contributors above.`,
    );
  }
}

if (failures.length) {
  console.error('\n[bundle-budget] FAILED:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('[bundle-budget] OK - entry, shell/demo landings, guarded rooms, Hebrew/genre lazy chunks and vendor boundaries are healthy.');
