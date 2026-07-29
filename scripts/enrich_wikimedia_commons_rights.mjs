import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  commonsTitleForAsset,
  createCommonsMetadataCache,
  enrichManifestWithCommonsMetadata,
  fetchCommonsExtMetadata,
  mergeCommonsMetadataCache,
  normalizeCommonsTitleKey,
  sanitizeCommonsMetadataCache,
} from './lib/commonsExtMetadata.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MANIFEST = 'src/data/artist_knowledge_manifest.json';
const DEFAULT_CACHE = 'scripts/.cache/wikimedia-commons-extmetadata.v1.json';

function printHelp() {
  process.stdout.write(`Wikimedia Commons rights metadata enrichment

Safe defaults:
  - no network request unless --fetch is present
  - no manifest mutation unless --write is present
  - no image bytes are downloaded

Usage:
  node scripts/enrich_wikimedia_commons_rights.mjs
  node scripts/enrich_wikimedia_commons_rights.mjs --fetch [--limit 25]
  node scripts/enrich_wikimedia_commons_rights.mjs --write
  node scripts/enrich_wikimedia_commons_rights.mjs --fetch --write

Options:
  --fetch             Query the Wikimedia Commons API for missing cache entries.
  --refresh           Re-query cached titles too. Requires --fetch.
  --write             Atomically update the manifest from sanitized cached data.
  --limit <count>     Bound the number of titles queried in this run.
  --manifest <path>   Repo-relative manifest path (default: ${DEFAULT_MANIFEST}).
  --cache <path>      Repo-relative ignored cache path (default: ${DEFAULT_CACHE}).
  --help              Show this help.
`);
}

function parsePositiveInteger(value, flag) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${flag} requires a positive integer.`);
  return parsed;
}

function parseArgs(argv) {
  const options = {
    fetch: false,
    refresh: false,
    write: false,
    limit: null,
    manifest: DEFAULT_MANIFEST,
    cache: DEFAULT_CACHE,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--fetch') options.fetch = true;
    else if (argument === '--refresh') options.refresh = true;
    else if (argument === '--write') options.write = true;
    else if (argument === '--help' || argument === '-h') options.help = true;
    else if (argument === '--limit') options.limit = parsePositiveInteger(argv[++index], '--limit');
    else if (argument === '--manifest') options.manifest = argv[++index];
    else if (argument === '--cache') options.cache = argv[++index];
    else throw new Error(`Unknown option: ${argument}`);
  }

  if (options.refresh && !options.fetch) throw new Error('--refresh requires --fetch.');
  if (!options.manifest) throw new Error('--manifest requires a repo-relative path.');
  if (!options.cache) throw new Error('--cache requires a repo-relative path.');
  return options;
}

function resolveInsideRepo(relativePath, label) {
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${label} must be a file inside this repository.`);
  }
  return resolved;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readCache(filePath) {
  if (!fs.existsSync(filePath)) return createCommonsMetadataCache();
  const cache = readJson(filePath);
  return cache?.schemaVersion === 1 && cache?.provider === 'wikimedia-commons-api'
    ? sanitizeCommonsMetadataCache(cache)
    : createCommonsMetadataCache();
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporaryPath, filePath);
}

function uniqueCommonsTitles(manifest) {
  const titles = [];
  const seen = new Set();
  for (const asset of manifest.visualAssets ?? []) {
    const title = commonsTitleForAsset(asset);
    const key = normalizeCommonsTitleKey(title);
    if (!title || !key || seen.has(key)) continue;
    seen.add(key);
    titles.push(title);
  }
  return titles;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const manifestPath = resolveInsideRepo(options.manifest, 'Manifest path');
  const cachePath = resolveInsideRepo(options.cache, 'Cache path');
  const manifest = readJson(manifestPath);
  let cache = readCache(cachePath);
  const titles = uniqueCommonsTitles(manifest);
  const titlesToFetch = titles
    .filter(title => options.refresh || !cache.entries?.[normalizeCommonsTitleKey(title)])
    .slice(0, options.limit ?? titles.length);

  if (options.fetch && titlesToFetch.length > 0) {
    const fetchedAt = new Date().toISOString();
    process.stdout.write(
      `Querying metadata for ${titlesToFetch.length} public Commons file title(s); `
      + 'no image bytes or private listening data are sent.\n',
    );
    const fetchedEntries = await fetchCommonsExtMetadata(titlesToFetch, {
      fetchedAt,
      signal: AbortSignal.timeout(30_000),
    });
    cache = mergeCommonsMetadataCache(cache, fetchedEntries, fetchedAt);
    writeJsonAtomic(cachePath, cache);
  }

  const { manifest: enriched, stats } = enrichManifestWithCommonsMetadata(manifest, cache);
  if (options.write) {
    writeJsonAtomic(cachePath, cache);
    writeJsonAtomic(manifestPath, enriched);
  }

  const cachedTitleCount = Object.keys(cache.entries ?? {}).length;
  process.stdout.write(
    `Commons rights metadata: ${stats.matchedAssetCount}/${stats.commonsAssetCount} asset(s) matched, `
    + `${stats.changedAssetCount} proposed change(s), `
    + `${stats.unresolvedCommonsAssetCount} Commons asset(s) still unverified, `
    + `${cachedTitleCount} cached title(s).\n`,
  );

  if (!options.fetch && titlesToFetch.length > 0) {
    process.stdout.write(
      `${titlesToFetch.length} title(s) are not cached. Re-run with --fetch to allow the public API request.\n`,
    );
  }
  process.stdout.write(
    options.write
      ? `Manifest updated atomically: ${path.relative(root, manifestPath)}.\n`
      : 'Dry run complete; the manifest was not modified. Add --write only after reviewing the cache.\n',
  );
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
