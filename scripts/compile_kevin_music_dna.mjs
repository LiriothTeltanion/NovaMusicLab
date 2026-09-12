import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const defaultOutputPath = path.join(repoRoot, 'src', 'data', 'music_dna_compiled.json');
const defaultGenreCatalogOutputPath = path.join(repoRoot, 'src', 'data', 'music_dna_genre_catalog.json');

function writeLine(message = '') {
  process.stdout.write(`${message}\n`);
}

function printUsage() {
  writeLine(`
Usage:
  npm run compile:data -- --source-dir <export-directory> [options]

Options:
  --lastfm-file <csv>        Last.fm export outside the source directory
  --youtube-file <html|json> YouTube watch history outside the source directory
  --require-sources a,b,c    Abort unless every named source resolved to data
                             (lastfm | spotify | youtube)
  --flagship                 Stamp this dataset as the museum's own archive
  --enrichment-generated-at <iso>  Override the carried-forward enrichment date
  --output <path>            Dataset path (default src/data/music_dna_compiled.json)
  --catalog-output <path>    Genre catalogue path; derived from --output if omitted

The export directory can contain any combination of:
  one Last.fm CSV at the export root (or an explicit --lastfm-file)
  my_spotify_data/Spotify Extended Streaming History/Streaming_History_Audio_*.json
  historial de videos/historial de reproducciones.html (or an explicit --youtube-file)

A missing source is only a warning, so a two-source archive compiles cleanly and
looks correct. Use --require-sources to make that impossible.
`);
}

function optionValue(args, index, option) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a path.`);
  }
  return value;
}

function parseArguments(args) {
  if (args.includes('--help') || args.includes('-h')) {
    return { help: true };
  }

  let sourceDir = '';
  let lastfmFilePath = null;
  let youtubeFilePath = null;
  let requiredSources = [];
  let flagship = false;
  let enrichmentGeneratedAt = null;
  let outputPath = defaultOutputPath;
  let genreCatalogOutputPath = defaultGenreCatalogOutputPath;
  let outputWasCustomized = false;
  let catalogOutputWasCustomized = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--source-dir') {
      sourceDir = path.resolve(process.cwd(), optionValue(args, index, argument));
      index += 1;
    } else if (argument === '--lastfm-file') {
      lastfmFilePath = path.resolve(process.cwd(), optionValue(args, index, argument));
      index += 1;
    } else if (argument === '--youtube-file') {
      youtubeFilePath = path.resolve(process.cwd(), optionValue(args, index, argument));
      index += 1;
    } else if (argument === '--require-sources') {
      requiredSources = optionValue(args, index, argument)
        .split(',')
        .map(name => name.trim().toLowerCase())
        .filter(Boolean);
      index += 1;
    } else if (argument === '--flagship') {
      flagship = true;
    } else if (argument === '--enrichment-generated-at') {
      enrichmentGeneratedAt = optionValue(args, index, argument);
      index += 1;
    } else if (argument === '--output') {
      outputPath = path.resolve(process.cwd(), optionValue(args, index, argument));
      outputWasCustomized = true;
      index += 1;
    } else if (argument === '--catalog-output') {
      genreCatalogOutputPath = path.resolve(process.cwd(), optionValue(args, index, argument));
      catalogOutputWasCustomized = true;
      index += 1;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  if (!sourceDir) {
    throw new Error('An explicit --source-dir is required. Run with --help for the expected layout.');
  }

  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`Source directory does not exist or is not a directory: ${sourceDir}`);
  }
  if (lastfmFilePath && (!fs.existsSync(lastfmFilePath) || !fs.statSync(lastfmFilePath).isFile())) {
    throw new Error(`Last.fm CSV does not exist or is not a file: ${lastfmFilePath}`);
  }
  if (youtubeFilePath && (!fs.existsSync(youtubeFilePath) || !fs.statSync(youtubeFilePath).isFile())) {
    throw new Error(`YouTube history does not exist or is not a file: ${youtubeFilePath}`);
  }

  const KNOWN_SOURCES = new Set(['lastfm', 'spotify', 'youtube']);
  const unknownRequired = requiredSources.filter(name => !KNOWN_SOURCES.has(name));
  if (unknownRequired.length) {
    throw new Error(`--require-sources accepts lastfm, spotify, youtube. Unknown: ${unknownRequired.join(', ')}`);
  }

  if (outputWasCustomized && !catalogOutputWasCustomized) {
    const extension = path.extname(outputPath);
    const basename = path.basename(outputPath, extension);
    genreCatalogOutputPath = path.join(path.dirname(outputPath), `${basename}_genre_catalog${extension || '.json'}`);
  }

  return {
    help: false,
    sourceDir,
    lastfmFilePath,
    youtubeFilePath,
    requiredSources,
    flagship,
    enrichmentGeneratedAt,
    outputPath,
    genreCatalogOutputPath,
  };
}

function readOptionalFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[${label}] Not found: ${filePath}`);
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  writeLine(`[${label}] Read ${path.basename(filePath)} (${(content.length / 1024 / 1024).toFixed(2)} MB)`);
  return content;
}

function readSpotifyExports(sourceDir) {
  const spotifyDir = path.join(sourceDir, 'my_spotify_data', 'Spotify Extended Streaming History');
  if (!fs.existsSync(spotifyDir)) {
    console.warn(`[SPOTIFY] Not found: ${spotifyDir}`);
    return [];
  }

  const filenames = fs.readdirSync(spotifyDir)
    .filter((filename) => filename.startsWith('Streaming_History_Audio_') && filename.endsWith('.json'))
    .sort();

  writeLine(`[SPOTIFY] Found ${filenames.length} audio history file(s).`);
  return filenames.map((filename) => readOptionalFile(path.join(spotifyDir, filename), 'SPOTIFY')).filter(Boolean);
}

function findLastfmFile(sourceDir, explicitPath) {
  if (explicitPath) return explicitPath;

  const candidates = fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && path.extname(entry.name).toLowerCase() === '.csv')
    .map(entry => path.join(sourceDir, entry.name))
    .sort((left, right) => left.localeCompare(right));

  if (candidates.length > 1) {
    throw new Error(
      `Multiple root-level CSV files were found. Select the Last.fm export explicitly with --lastfm-file: ${candidates.map(candidate => path.basename(candidate)).join(', ')}`,
    );
  }

  return candidates[0] ?? null;
}

/**
 * Stamps the three fields the parser deliberately cannot know.
 *
 * `narrative_scope`, `enrichmentGeneratedAt` and `recentPulseSyncedAt` are not
 * properties of a parsed upload - they are properties of THIS dataset being the
 * museum's own archive. The parser must never emit them: a visitor's upload
 * that declared itself "flagship" would inherit Kevin's editorial profile,
 * which LivingArtistAtlas gates on exactly that field.
 *
 * So they are applied here, behind --flagship, rather than left to a second
 * command someone can forget. Forgetting produces a dataset that looks correct
 * and fails three audits later, which is the knowledge:manifest trap again.
 */
function applyFlagshipStamps(compiledData, options) {
  if (!options.flagship) return;

  compiledData.narrative_scope = 'flagship';

  const freshness = compiledData.snapshot_freshness ?? {};

  // Read from the same file audit_public_bundle_privacy.mjs compares against,
  // so the two cannot drift apart.
  const pulsePath = path.join(repoRoot, 'src', 'data', 'recent_pulse.json');
  if (fs.existsSync(pulsePath)) {
    const pulse = JSON.parse(fs.readFileSync(pulsePath, 'utf8'));
    if (pulse.synced_at) freshness.recentPulseSyncedAt = pulse.synced_at;
  }

  // Describes when artist_enrichment.json was authored, which recompiling does
  // not change - so it is carried forward rather than reset to null.
  if (options.enrichmentGeneratedAt) {
    freshness.enrichmentGeneratedAt = options.enrichmentGeneratedAt;
  } else if (fs.existsSync(defaultOutputPath)) {
    const previous = JSON.parse(fs.readFileSync(defaultOutputPath, 'utf8'));
    const carried = previous.snapshot_freshness?.enrichmentGeneratedAt;
    if (carried) freshness.enrichmentGeneratedAt = carried;
  }

  compiledData.snapshot_freshness = freshness;
  writeLine(
    `[FLAGSHIP] narrative_scope=flagship · enrichment=${freshness.enrichmentGeneratedAt ?? 'null'} · recentPulse=${freshness.recentPulseSyncedAt ?? 'null'}`,
  );
}

async function loadParser() {
  const vite = await createServer({
    root: repoRoot,
    configFile: false,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    return await vite.ssrLoadModule('/src/utils/parser.ts');
  } finally {
    await vite.close();
  }
}

async function compileData(options) {
  const lastfmFilePath = findLastfmFile(options.sourceDir, options.lastfmFilePath);
  const lastfmText = lastfmFilePath
    ? readOptionalFile(lastfmFilePath, 'LAST.FM')
    : null;
  if (!lastfmFilePath) console.warn('[LAST.FM] No root-level CSV was found; continuing with other sources.');
  const spotifyJsonTexts = readSpotifyExports(options.sourceDir);
  // A Takeout does not unpack into the legacy layout - it lands under
  // "Takeout/YouTube y YouTube Music/historial de videos/" - so --youtube-file
  // exists for the same reason --lastfm-file does.
  const youtubePath = options.youtubeFilePath
    ?? path.join(options.sourceDir, 'historial de videos', 'historial de reproducciones.html');
  const youtubeText = readOptionalFile(youtubePath, 'YOUTUBE');
  const youtubeIsJson = Boolean(youtubeText) && path.extname(youtubePath).toLowerCase() === '.json';

  const csvTexts = lastfmText ? [lastfmText] : [];
  // Takeout offers watch-history as HTML or JSON. parseStreamingJsonRows
  // dispatches Spotify then ListenBrainz then YouTube per row, so the JSON form
  // rides the same channel as the Spotify exports.
  const youtubeHtmlTexts = youtubeText && !youtubeIsJson ? [youtubeText] : [];
  const streamingJsonTexts = youtubeIsJson ? [...spotifyJsonTexts, youtubeText] : spotifyJsonTexts;

  if (!csvTexts.length && !streamingJsonTexts.length && !youtubeHtmlTexts.length) {
    throw new Error('No supported export files were found in the selected source directory.');
  }

  // Missing sources are only warnings above, so a two-source archive compiles
  // cleanly and the rebuilt `project` string is the only visible tell. This
  // makes that failure loud instead.
  const resolved = {
    lastfm: csvTexts.length > 0,
    spotify: spotifyJsonTexts.length > 0,
    youtube: Boolean(youtubeText),
  };
  const missing = options.requiredSources.filter(name => !resolved[name]);
  if (missing.length) {
    throw new Error(
      `--require-sources demanded ${options.requiredSources.join(', ')} but these resolved to nothing: ${missing.join(', ')}.`,
    );
  }

  writeLine('\n[COMPILING] Loading the shared parser through Vite...');
  const { parseMusicSources } = await loadParser();
  if (typeof parseMusicSources !== 'function') {
    throw new Error('The shared parser could not be loaded.');
  }

  const compiledData = parseMusicSources({
    csvTexts,
    spotifyJsonTexts: streamingJsonTexts,
    youtubeHtmlTexts,
  });
  applyFlagshipStamps(compiledData, options);
  const metrics = compiledData.core_metrics;
  const genreCatalog = compiledData.artist_genre_catalog;
  if (!Array.isArray(genreCatalog)) {
    throw new Error('The shared parser did not produce artist_genre_catalog.');
  }

  const catalogKeys = new Set(genreCatalog.map(artist => artist.artistKey));
  const catalogPlays = genreCatalog.reduce((sum, artist) => sum + artist.plays, 0);
  if (genreCatalog.length !== metrics.unique_artists || catalogKeys.size !== genreCatalog.length) {
    throw new Error(`Genre catalog identity invariant failed: ${genreCatalog.length} rows, ${catalogKeys.size} unique keys, ${metrics.unique_artists} expected artists.`);
  }
  if (catalogPlays !== metrics.total_plays) {
    throw new Error(`Genre catalog play invariant failed: ${catalogPlays} catalog plays, ${metrics.total_plays} expected.`);
  }

  // The full catalog is intentionally emitted as its own lazy asset. Keeping it
  // out of music_dna_compiled.json prevents every dashboard consumer from
  // parsing thousands of long-tail artist rows before the genre studio opens.
  const { artist_genre_catalog: _catalog, ...dashboardData } = compiledData;
  const unclassified = genreCatalog.filter(artist => artist.source === 'unclassified');
  const unclassifiedPlays = unclassified.reduce((sum, artist) => sum + artist.plays, 0);

  writeLine('\n=== COMPILATION SUMMARY ===');
  writeLine(`- Project Name:       ${compiledData.project}`);
  writeLine(`- Total Plays:        ${metrics.total_plays.toLocaleString()}`);
  writeLine(`- Unique Artists:     ${metrics.unique_artists.toLocaleString()}`);
  writeLine(`- Unique Tracks:      ${metrics.unique_tracks.toLocaleString()}`);
  writeLine(`- Unique Albums:      ${metrics.unique_albums.toLocaleString()}`);
  writeLine(`- Listening Hours:    ${Math.round(metrics.listening_hours).toLocaleString()} hours`);
  writeLine(`- Top Artist:         ${compiledData.top_artists[0]?.name ?? 'N/A'} (${compiledData.top_artists[0]?.plays ?? 0} plays)`);
  writeLine(`- Top Track:          ${compiledData.top_tracks[0]?.title ?? 'N/A'} by ${compiledData.top_tracks[0]?.artist ?? 'N/A'} (${compiledData.top_tracks[0]?.plays ?? 0} plays)`);
  writeLine(`- Genre Catalog:      ${genreCatalog.length.toLocaleString()} artists (${catalogPlays.toLocaleString()} plays)`);
  writeLine(`- Unclassified:       ${unclassified.length.toLocaleString()} artists (${unclassifiedPlays.toLocaleString()} plays)`);

  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.mkdirSync(path.dirname(options.genreCatalogOutputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, `${JSON.stringify(dashboardData, null, 2)}\n`, 'utf8');
  fs.writeFileSync(options.genreCatalogOutputPath, `${JSON.stringify(genreCatalog, null, 2)}\n`, 'utf8');
  writeLine(`\n[SUCCESS] Compiled dataset written to: ${options.outputPath}`);
  writeLine(`[SUCCESS] Genre catalog written to: ${options.genreCatalogOutputPath}`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  await compileData(options);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n[ERROR] Dataset compilation failed: ${message}`);
  process.exitCode = 1;
});
