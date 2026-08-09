// Keeps the three numbers in the share surfaces equal to the three numbers the
// hero counts up.
//
// The link preview is the first screen of the whole project: a friend tapping a
// WhatsApp link sees only the card, and the only claim it makes is "N plays, N
// tracks, N artist entries". Those numbers were typed by hand into index.html
// and again into src/utils/i18n.ts, and the comment above the second copy
// literally asked the next person to keep them in step with the first. They did
// not stay in step. After the archive refresh the card advertised 80,550 plays
// while the hero counted up to 82,661 two seconds later.
//
// So they are generated now. src/data/share_metrics.json is the single source
// both runtime surfaces read; the sentences in index.html and metrics in the
// editable social SVG are written from the reviewed data contracts below.
// --check re-renders everything and fails if the working tree disagrees, which
// is what CI runs.
//
//   node scripts/sync_share_metrics.mjs          rewrite
//   node scripts/sync_share_metrics.mjs --check  verify, exit 1 on drift
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSocialPreviewFacts } from './lib/socialPreviewFacts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COMPILED = path.join(ROOT, 'src', 'data', 'music_dna_compiled.json');
const METRICS = path.join(ROOT, 'src', 'data', 'share_metrics.json');
const PUBLIC_MANIFEST = path.join(ROOT, 'src', 'data', 'public_dataset_manifest.json');
const INDEX_HTML = path.join(ROOT, 'index.html');
const SOCIAL_PREVIEW_SVG = path.join(ROOT, 'assets', 'social', 'nova-music-lab-social-preview.svg');

const CHECK = process.argv.includes('--check');

/**
 * Exactly the three figures HeroSection animates - total_plays, unique_tracks
 * and unique_artists off core_metrics. The point of this script is that the
 * card and the hero cannot disagree, so it reads the same fields the hero does.
 */
function readMetrics() {
  const compiled = JSON.parse(fs.readFileSync(COMPILED, 'utf8'));
  const core = compiled.core_metrics ?? {};
  const metrics = {
    plays: Number(core.total_plays),
    tracks: Number(core.unique_tracks),
    artists: Number(core.unique_artists),
  };

  for (const [key, value] of Object.entries(metrics)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`core_metrics gave no usable ${key}: ${JSON.stringify(core[key])}`);
    }
  }
  return metrics;
}

/**
 * index.html is one document with one language, and link scrapers read it
 * before any JavaScript runs, so its copy lives here rather than in the app's
 * i18n layer. The trilingual <title>/<meta> swap at runtime is separate and
 * reads share_metrics.json through src/utils/i18n.ts.
 */
const HTML_TEMPLATES = {
  description: '{plays} plays. {tracks} tracks. {artists} artist entries. Explore an honest 11-year historical snapshot as a living museum, then build one privately from your own archive.',
  'og:description': '{plays} plays. {tracks} tracks. {artists} artist entries. Explore the eras, obsessions and artist stories — then build yours from files processed on your device.',
  'twitter:description': '{plays} plays. {tracks} tracks. {artists} artist entries. Explore the eras, obsessions and artist stories — then build yours from files processed on your device.',
};

const render = (template, metrics) => template
  .replace('{plays}', metrics.plays.toLocaleString('en-US'))
  .replace('{tracks}', metrics.tracks.toLocaleString('en-US'))
  .replace('{artists}', metrics.artists.toLocaleString('en-US'));

/** Escapes only what breaks a double-quoted HTML attribute. */
const attr = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/**
 * Matches the tag by its own name or property, never by the old number, so a
 * copy edit does not silently stop the sync from finding its target.
 */
function replaceMeta(html, key, value) {
  const attribute = key.startsWith('og:') ? 'property' : 'name';
  const pattern = new RegExp(
    `(<meta\\s+${attribute}="${key}"\\s+content=")[^"]*(")`,
  );
  if (!pattern.test(html)) {
    throw new Error(`index.html has no <meta ${attribute}="${key}"> to update.`);
  }
  return html.replace(pattern, `$1${attr(value)}$2`);
}

function replaceSvgText(svg, id, value) {
  const pattern = new RegExp(`(<text\\b[^>]*\\bid="${id}"[^>]*>)[^<]*(</text>)`);
  if (!pattern.test(svg)) {
    throw new Error(`social preview SVG has no <text id="${id}"> to update.`);
  }
  const escaped = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return svg.replace(pattern, `$1${escaped}$2`);
}

const metrics = readMetrics();
const publicManifest = JSON.parse(fs.readFileSync(PUBLIC_MANIFEST, 'utf8'));
const socialFacts = buildSocialPreviewFacts(metrics, publicManifest);

const metricsJson = `${JSON.stringify(metrics, null, 2)}\n`;
let html = fs.readFileSync(INDEX_HTML, 'utf8');
for (const [key, template] of Object.entries(HTML_TEMPLATES)) {
  html = replaceMeta(html, key, render(template, metrics));
}
const socialSvgOnDisk = fs.readFileSync(SOCIAL_PREVIEW_SVG, 'utf8');
const socialSvg = replaceSvgText(socialSvgOnDisk, 'archive-metrics', socialFacts.metricsLabel);

const drift = [];
const onDisk = fs.existsSync(METRICS) ? fs.readFileSync(METRICS, 'utf8') : null;
if (onDisk !== metricsJson) drift.push('src/data/share_metrics.json');
if (fs.readFileSync(INDEX_HTML, 'utf8') !== html) drift.push('index.html');
if (socialSvgOnDisk !== socialSvg) drift.push('assets/social/nova-music-lab-social-preview.svg');

console.log(`[share-metrics] ${metrics.plays.toLocaleString('en-US')} plays · ${metrics.tracks.toLocaleString('en-US')} tracks · ${metrics.artists.toLocaleString('en-US')} artist entries`);

if (CHECK) {
  if (drift.length) {
    console.error(`[share-metrics] FAILED - these no longer match the compiled archive: ${drift.join(', ')}`);
    console.error('[share-metrics] run: node scripts/sync_share_metrics.mjs');
    process.exit(1);
  }
  console.log('[share-metrics] OK - the link preview states the same numbers the hero counts.');
  process.exit(0);
}

if (!drift.length) {
  console.log('[share-metrics] already in sync, nothing written.');
  process.exit(0);
}

fs.writeFileSync(METRICS, metricsJson);
fs.writeFileSync(INDEX_HTML, html);
fs.writeFileSync(SOCIAL_PREVIEW_SVG, socialSvg);
console.log(`[share-metrics] updated ${drift.join(', ')}`);
