import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseMusicSources } from '../src/utils/parser.js';

// Resolve directory paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcesDir = path.resolve(__dirname, '../../'); // c:\Users\kevin\OneDrive\Escritorio\NovaMusicScan\Sources
const outputJsonPath = path.resolve(__dirname, '../src/data/music_dna_compiled.json');

console.log('=== STARTING OFFLINE MUSIC DATA COMPILATION ===');
console.log(`Sources Directory: ${sourcesDir}`);
console.log(`Target Output: ${outputJsonPath}\n`);

// 1. Load Last.fm CSV
const lastfmPath = path.join(sourcesDir, 'kevincusnir.csv');
let csvTexts: string[] = [];
if (fs.existsSync(lastfmPath)) {
  console.log(`[CSV] Reading Last.fm history from: ${lastfmPath}`);
  const csvText = fs.readFileSync(lastfmPath, 'utf8');
  csvTexts.push(csvText);
  console.log(`[CSV] Read Last.fm file (${(csvText.length / 1024 / 1024).toFixed(2)} MB)`);
} else {
  console.warn(`[CSV] Last.fm csv file not found at: ${lastfmPath}`);
}

// 2. Load Spotify Extended History JSONs
const spotifyDir = path.join(sourcesDir, 'my_spotify_data', 'Spotify Extended Streaming History');
let spotifyJsonTexts: string[] = [];
if (fs.existsSync(spotifyDir)) {
  console.log(`[SPOTIFY] Reading history directory: ${spotifyDir}`);
  const files = fs.readdirSync(spotifyDir).filter(f => f.startsWith('Streaming_History_Audio_') && f.endsWith('.json'));
  console.log(`[SPOTIFY] Found ${files.length} audio history files.`);
  
  files.forEach(f => {
    const filePath = path.join(spotifyDir, f);
    const content = fs.readFileSync(filePath, 'utf8');
    spotifyJsonTexts.push(content);
    console.log(`  Read ${f} (${(content.length / 1024 / 1024).toFixed(2)} MB)`);
  });
} else {
  console.warn(`[SPOTIFY] Spotify history directory not found at: ${spotifyDir}`);
}

// 3. Load YouTube Watch History HTML
const youtubePath = path.join(sourcesDir, 'historial de videos', 'historial de reproducciones.html');
let youtubeHtmlTexts: string[] = [];
if (fs.existsSync(youtubePath)) {
  console.log(`[YOUTUBE] Reading YouTube history from: ${youtubePath}`);
  const content = fs.readFileSync(youtubePath, 'utf8');
  youtubeHtmlTexts.push(content);
  console.log(`[YOUTUBE] Read YouTube watch history file (${(content.length / 1024 / 1024).toFixed(2)} MB)`);
} else {
  console.warn(`[YOUTUBE] YouTube watch history file not found at: ${youtubePath}`);
}

if (csvTexts.length === 0 && spotifyJsonTexts.length === 0 && youtubeHtmlTexts.length === 0) {
  console.error('\n[ERROR] No data files found! Please check that paths are correct.');
  process.exit(1);
}

// 4. Compile with aggregateData
console.log('\n[COMPILING] Running unified parser engine...');
try {
  const compiledData = parseMusicSources({
    csvTexts,
    spotifyJsonTexts,
    youtubeHtmlTexts,
  });

  // Verify compilation
  const metrics = compiledData.core_metrics;
  console.log('\n=== COMPILATION SUMMARY ===');
  console.log(`- Project Name:       ${compiledData.project}`);
  console.log(`- Total Plays:        ${metrics.total_plays.toLocaleString()}`);
  console.log(`- Unique Artists:     ${metrics.unique_artists.toLocaleString()}`);
  console.log(`- Unique Tracks:      ${metrics.unique_tracks.toLocaleString()}`);
  console.log(`- Unique Albums:      ${metrics.unique_albums.toLocaleString()}`);
  console.log(`- Listening Hours:    ${Math.round(metrics.listening_hours).toLocaleString()} hours`);
  console.log(`- Top Artist:         ${compiledData.top_artists[0]?.name || 'N/A'} (${compiledData.top_artists[0]?.plays} plays)`);
  console.log(`- Top Track:          ${compiledData.top_tracks[0]?.title || 'N/A'} by ${compiledData.top_tracks[0]?.artist || 'N/A'} (${compiledData.top_tracks[0]?.plays} plays)`);

  // Write output
  console.log(`\n[SAVE] Writing compiled database to: ${outputJsonPath}`);
  fs.writeFileSync(outputJsonPath, JSON.stringify(compiledData, null, 2), 'utf8');
  console.log('[SUCCESS] Compilation complete and default dataset updated!');
} catch (error) {
  console.error('\n[ERROR] Failed during dataset compilation:', error);
  process.exit(1);
}
