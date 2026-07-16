import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fingerprintSourceFiles } from './lib/sourceFingerprint.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'src', 'data', 'artist_knowledge_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const errors = [];
const CACHE_STRATEGIES = new Set(['bundled', 'cache-first', 'remote-opt-in', 'remote-browser', 'no-store']);

function isHttps(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

if (manifest.meta?.schemaVersion !== 1) errors.push('Unsupported schema version.');
if (!Number.isFinite(Date.parse(manifest.meta?.generatedAt))) errors.push('Invalid generatedAt.');
if (!/^[a-f0-9]{64}$/.test(manifest.meta?.sourceFingerprint ?? '')) errors.push('Invalid source fingerprint.');
if (Array.isArray(manifest.meta?.sourceFiles)) {
  const existingSourceFiles = [];
  for (const relativePath of manifest.meta.sourceFiles) {
    const sourcePath = path.join(root, relativePath);
    if (!fs.existsSync(sourcePath)) {
      errors.push(`Missing manifest source: ${relativePath}.`);
      continue;
    }
    existingSourceFiles.push(relativePath);
  }
  if (
    existingSourceFiles.length === manifest.meta.sourceFiles.length
    && fingerprintSourceFiles(root, existingSourceFiles) !== manifest.meta.sourceFingerprint
  ) {
    errors.push('Manifest source fingerprint is stale; run npm run knowledge:manifest.');
  }
} else {
  errors.push('Manifest sourceFiles must be an array.');
}

const artistIds = new Set();
for (const artist of manifest.artists ?? []) {
  if (!artist.id || artistIds.has(artist.id)) errors.push(`Duplicate or missing artist id: ${artist.id}.`);
  artistIds.add(artist.id);
  if (artist.normalizedName !== artist.normalizedName?.trim().toLowerCase()) {
    errors.push(`Non-canonical artist name: ${artist.id}.`);
  }
  if (!artist.provenance?.length || artist.provenance.some(source => !isHttps(source.sourceUrl))) {
    errors.push(`Artist lacks HTTPS provenance: ${artist.id}.`);
  }
}

const assetIds = new Set();
for (const asset of manifest.visualAssets ?? []) {
  if (!asset.id || assetIds.has(asset.id)) errors.push(`Duplicate or missing asset id: ${asset.id}.`);
  assetIds.add(asset.id);
  if (!artistIds.has(asset.entityId)) errors.push(`Asset has unknown artist: ${asset.id}.`);
  if (!isHttps(asset.url) || !isHttps(asset.sourceUrl)) errors.push(`Asset has unsafe URL: ${asset.id}.`);
  if (!['verified', 'declared', 'unverified', 'restricted'].includes(asset.license?.status)) {
    errors.push(`Asset hides license state: ${asset.id}.`);
  }
  if (!asset.attribution?.label) errors.push(`Asset lacks attribution: ${asset.id}.`);
  for (const [field, value] of Object.entries(asset.dimensions ?? {})) {
    if (value !== null && (!Number.isFinite(value) || value <= 0)) {
      errors.push(`Asset has invalid ${field}: ${asset.id}.`);
    }
  }
  if (asset.focalPoint?.x < 0 || asset.focalPoint?.x > 1 || asset.focalPoint?.y < 0 || asset.focalPoint?.y > 1) {
    errors.push(`Asset focal point is invalid: ${asset.id}.`);
  }
  if (!CACHE_STRATEGIES.has(asset.cachePolicy?.strategy) || !asset.cachePolicy?.privacyImpact) {
    errors.push(`Asset lacks cache/privacy policy: ${asset.id}.`);
  }
  if (asset.cachePolicy?.strategy !== 'remote-browser') {
    errors.push(`Automatically loaded remote asset must declare remote-browser, not ${asset.cachePolicy?.strategy}: ${asset.id}.`);
  }
  if (asset.cachePolicy?.maxAgeDays !== null) {
    errors.push(`Browser-controlled remote asset cannot declare an app max age: ${asset.id}.`);
  }
  if (asset.cachePolicy?.privacyImpact !== 'third-party-request') {
    errors.push(`Remote asset must declare third-party-request privacy impact: ${asset.id}.`);
  }
}

for (const artist of manifest.artists ?? []) {
  for (const assetId of artist.visualAssetIds ?? []) {
    if (!assetIds.has(assetId)) errors.push(`${artist.id} references missing ${assetId}.`);
  }
}

const unresolved = (manifest.visualAssets ?? []).filter(asset => asset.license.status === 'unverified').length;
if (manifest.meta?.artistCount !== artistIds.size) errors.push('Stale artist count.');
if (manifest.meta?.visualAssetCount !== assetIds.size) errors.push('Stale visual asset count.');
if (manifest.meta?.assetsAwaitingLicenseReview !== unresolved) errors.push('Stale license review count.');

if (errors.length) {
  process.stderr.write(`Artist knowledge audit failed (${errors.length}):\n${errors.map(error => `- ${error}`).join('\n')}\n`);
  process.exitCode = 1;
} else {
  const activeArtists = new Set(manifest.visualAssets.map(asset => asset.entityId)).size;
  process.stdout.write(
    `Artist knowledge audit passed: ${artistIds.size} artists, ${assetIds.size} visual assets, `
    + `${activeArtists} artists with artwork, ${unresolved} explicit license-review items.\n`,
  );
}
