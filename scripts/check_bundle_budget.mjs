/**
 * Post-build bundle budget guard. Fails the build when a known regression
 * class reappears:
 *  1. The app entry chunk (index-*.js) exceeding its budget - this caught
 *     nobody twice already (InteractiveBackdrop eager import: 398->968KB;
 *     museum wave: 457->627KB) because nothing failed loudly.
 *  2. The offline knowledge base or the bundled dataset leaking INTO the
 *     entry chunk instead of staying in their own lazy chunks.
 *  3. Vendor chunks disappearing (someone dropping the codeSplitting config).
 *
 * Run: npm run build && node scripts/check_bundle_budget.mjs
 * CI runs this via `npm run build:check`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'dist', 'assets');

// Margin over the current ~210KB entry so routine app growth doesn't cry
// wolf, but any data-file or heavy-library leak (the dataset chunk alone is
// ~100KB) fails loudly.
const ENTRY_BUDGET_KB = 300;

if (!fs.existsSync(ASSETS)) {
  console.error('[bundle-budget] dist/assets not found - run `npm run build` first.');
  process.exit(1);
}

const files = fs.readdirSync(ASSETS).filter(f => f.endsWith('.js'));
const entry = files.find(f => /^index-[\w-]+\.js$/.test(f));
const failures = [];

if (!entry) {
  failures.push('No index-*.js entry chunk found in dist/assets.');
} else {
  const entryPath = path.join(ASSETS, entry);
  const sizeKb = fs.statSync(entryPath).size / 1024;
  console.log(`[bundle-budget] entry ${entry}: ${sizeKb.toFixed(0)} KB (budget ${ENTRY_BUDGET_KB} KB)`);
  if (sizeKb > ENTRY_BUDGET_KB) {
    failures.push(`Entry chunk ${entry} is ${sizeKb.toFixed(0)} KB (budget: ${ENTRY_BUDGET_KB} KB). ` +
      'Check for a new eager import of a data-backed module (emotionalEngine/offlineArtistKnowledge/music_dna_compiled).');
  }

  const source = fs.readFileSync(entryPath, 'utf8');
  // Fingerprints of the two heavy data modules that must stay lazily chunked.
  // These strings exist in the JSON payloads, not in ordinary app code.
  if (source.includes('"emotionalSeeds"')) {
    failures.push('offline_artist_knowledge.json content found INSIDE the entry chunk - it must stay a lazy chunk.');
  }
  if (source.includes('"cross_source_duplicates"') && source.includes('"artist_origin_countries"')) {
    failures.push('music_dna_compiled.json content found INSIDE the entry chunk - the default dataset must load via loadDefaultDataset().');
  }
}

for (const vendor of ['vendor-react', 'vendor-charts', 'vendor-motion']) {
  if (!files.some(f => f.startsWith(vendor + '-'))) {
    failures.push(`Expected vendor chunk "${vendor}-*.js" is missing - was the codeSplitting config removed from vite.config.ts?`);
  }
}

if (!files.some(f => f.startsWith('offlineArtistKnowledge-'))) {
  failures.push('offlineArtistKnowledge-*.js lazy chunk is missing - the knowledge base may have been absorbed into another chunk.');
}

if (failures.length) {
  console.error('\n[bundle-budget] FAILED:');
  for (const f of failures) console.error(' - ' + f);
  process.exit(1);
}
console.log('[bundle-budget] OK - entry within budget, data chunks properly split, vendor chunks present.');
