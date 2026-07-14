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
  npm run compile:data -- --source-dir <export-directory> [--output <dataset-path>] [--catalog-output <catalog-path>]

The export directory can contain any combination of:
  kevincusnir.csv
  my_spotify_data/Spotify Extended Streaming History/Streaming_History_Audio_*.json
  historial de videos/historial de reproducciones.html
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
  let outputPath = defaultOutputPath;
  let genreCatalogOutputPath = defaultGenreCatalogOutputPath;
  let outputWasCustomized = false;
  let catalogOutputWasCustomized = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--source-dir') {
      sourceDir = path.resolve(process.cwd(), optionValue(args, index, argument));
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

  if (outputWasCustomized && !catalogOutputWasCustomized) {
    const extension = path.extname(outputPath);
    const basename = path.basename(outputPath, extension);
    genreCatalogOutputPath = path.join(path.dirname(outputPath), `${basename}_genre_catalog${extension || '.json'}`);
  }

  return { help: false, sourceDir, outputPath, genreCatalogOutputPath };
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
  const lastfmText = readOptionalFile(path.join(options.sourceDir, 'kevincusnir.csv'), 'LAST.FM');
  const spotifyJsonTexts = readSpotifyExports(options.sourceDir);
  const youtubeText = readOptionalFile(
    path.join(options.sourceDir, 'historial de videos', 'historial de reproducciones.html'),
    'YOUTUBE',
  );

  const csvTexts = lastfmText ? [lastfmText] : [];
  const youtubeHtmlTexts = youtubeText ? [youtubeText] : [];

  if (!csvTexts.length && !spotifyJsonTexts.length && !youtubeHtmlTexts.length) {
    throw new Error('No supported export files were found in the selected source directory.');
  }

  writeLine('\n[COMPILING] Loading the shared parser through Vite...');
  const { parseMusicSources } = await loadParser();
  if (typeof parseMusicSources !== 'function') {
    throw new Error('The shared parser could not be loaded.');
  }

  const compiledData = parseMusicSources({ csvTexts, spotifyJsonTexts, youtubeHtmlTexts });
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
