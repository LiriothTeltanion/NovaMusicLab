import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'src', 'data');

const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const jsonOutput = args.has('--json');
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 100;

function write(line = '') {
  process.stdout.write(`${line}\n`);
}

async function readJson(relativePath) {
  const raw = await readFile(path.join(root, relativePath), 'utf8');
  return JSON.parse(raw);
}

async function readText(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/&/g, 'and')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

function dataKey(value) {
  return String(value ?? '').toLowerCase();
}

function catalogKey(artist, title) {
  return `${String(artist).toLowerCase()}|||${String(title).toLowerCase()}`;
}

function percent(value, total) {
  return total ? Math.round((value / total) * 1000) / 10 : 0;
}

function ratio(value, total) {
  return `${value}/${total} (${percent(value, total)}%)`;
}

function topList(items, formatter, max = 12) {
  return items.slice(0, max).map(formatter);
}

function mediaNames(entry) {
  return [entry.artist, ...(entry.aliases ?? [])].filter(Boolean);
}

function hasSpotify(entry) {
  return Boolean(entry?.spotifyArtistUrl || entry?.spotifyAlbumUrl || entry?.spotifyTrackUrl);
}

function hasYoutube(entry) {
  return Boolean(
    entry?.officialAudioUrl
    || entry?.youtubeVideoUrl
    || entry?.youtubePlaylistUrl
    || entry?.youtubeChannelUrl
    || entry?.livePerformanceUrl
  );
}

function hasYoutubeEmbed(entry) {
  return Boolean(entry?.officialAudioUrl || entry?.youtubeVideoUrl || entry?.youtubePlaylistUrl);
}

function getByNormalizedName(entries, name, namesForEntry) {
  const target = normalize(name);
  return entries.find(entry => namesForEntry(entry).some(candidate => normalize(candidate) === target));
}

function wikimediaFileKey(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'commons.wikimedia.org' && parsed.pathname.startsWith('/wiki/Special:FilePath/')) {
      return decodeURIComponent(parsed.pathname.replace('/wiki/Special:FilePath/', ''))
        .replace(/_/g, ' ')
        .toLowerCase();
    }
    if (parsed.hostname === 'upload.wikimedia.org') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      const last = decodeURIComponent(parts.at(-1) ?? '').replace(/^\d+px-/, '');
      return last.replace(/_/g, ' ').toLowerCase();
    }
  } catch {
    return url;
  }
  return url;
}

function buildFlagSet(flagSource) {
  return new Set(
    [...flagSource.matchAll(/^\s{2}'([^']+)':\s\(/gm)]
      .map(match => match[1])
      .filter(country => !country.endsWith('_alt')),
  );
}

function summarizeCoverage(rows) {
  return {
    total: rows.length,
    passed: rows.filter(row => row.ok).length,
    missing: rows.filter(row => !row.ok),
  };
}

const [
  musicData,
  artistImages,
  artistGallery,
  artistMeta,
  artistEnrichment,
  artistMediaLinks,
  offlineKnowledge,
  trackImages,
  albumImages,
  flagSource,
] = await Promise.all([
  readJson('src/data/music_dna_compiled.json'),
  readJson('src/data/artist_images.json'),
  readJson('src/data/artist_gallery.json'),
  readJson('src/data/artist_meta.json'),
  readJson('src/data/artist_enrichment.json'),
  readJson('src/data/artist_media_links.json'),
  readJson('src/data/offline_artist_knowledge.json'),
  readJson('src/data/track_images.json'),
  readJson('src/data/album_images.json'),
  readText('src/components/FlagArt.tsx'),
]);

const topArtists = musicData.top_artists.slice(0, limit);
const topTracks = musicData.top_tracks.slice(0, limit);
const topAlbums = musicData.top_albums.slice(0, limit);
const normalizedTopArtists = topArtists.map((artist, index) => ({
  ...artist,
  rank: index + 1,
  key: dataKey(artist.name),
  normalized: normalize(artist.name),
}));
const enrichmentProfiles = Array.isArray(artistEnrichment)
  ? artistEnrichment
  : Object.values(artistEnrichment);
const knowledgeArtists = offlineKnowledge.artists ?? [];
const flagCountries = buildFlagSet(flagSource);
const errors = [];
const warnings = [];

const artistImageRows = normalizedTopArtists.map(artist => ({
  artist,
  ok: Boolean(artistImages[artist.key] ?? artistImages[artist.normalized]),
}));
const galleryRows = normalizedTopArtists.map(artist => ({
  artist,
  ok: Boolean((artistGallery[artist.key] ?? artistGallery[artist.normalized])?.length),
  count: (artistGallery[artist.key] ?? artistGallery[artist.normalized])?.length ?? 0,
}));
const enrichmentRows = normalizedTopArtists.map(artist => ({
  artist,
  ok: Boolean(getByNormalizedName(enrichmentProfiles, artist.name, profile => [profile.name, ...(profile.aliases ?? [])])),
}));
const offlineRows = normalizedTopArtists.map(artist => ({
  artist,
  ok: Boolean(getByNormalizedName(knowledgeArtists, artist.name, knowledge => [
    knowledge.name,
    knowledge.normalizedName,
    knowledge.musicbrainz?.name,
    knowledge.wikidata?.label,
  ].filter(Boolean))),
}));
const mediaRows = normalizedTopArtists.map(artist => {
  const entry = getByNormalizedName(artistMediaLinks, artist.name, mediaNames);
  return {
    artist,
    entry,
    ok: Boolean(entry),
    spotify: hasSpotify(entry),
    youtube: hasYoutube(entry),
    youtubeEmbed: hasYoutubeEmbed(entry),
    confidence: entry?.mediaConfidence ?? 'missing',
  };
});
const trackRows = topTracks.map(track => ({
  track,
  key: catalogKey(track.artist, track.title),
  ok: Boolean(trackImages[catalogKey(track.artist, track.title)]),
}));
const albumRows = topAlbums.map(album => ({
  album,
  key: catalogKey(album.artist, album.title),
  ok: Boolean(albumImages[catalogKey(album.artist, album.title)]),
}));

const countries = [...new Set([
  ...topArtists.map(artist => artist.country),
  ...Object.values(artistMeta).map(meta => meta.country),
  ...knowledgeArtists.map(artist => artist.archive?.country),
].filter(Boolean))].sort();
const missingFlags = countries.filter(country => !flagCountries.has(country));
if (missingFlags.length) {
  errors.push(`Missing hand-authored flags: ${missingFlags.join(', ')}`);
}

const countryMismatches = normalizedTopArtists
  .map(artist => {
    const meta = artistMeta[artist.key] ?? artistMeta[artist.normalized];
    return meta && meta.country !== artist.country
      ? { artist: artist.name, archiveCountry: artist.country, metaCountry: meta.country }
      : null;
  })
  .filter(Boolean);
if (countryMismatches.length) {
  warnings.push(`Country mismatches: ${countryMismatches.map(row => `${row.artist} (${row.archiveCountry} vs ${row.metaCountry})`).join(', ')}`);
}

const odeonMeta = artistMeta.odeon;
const odeonTop = normalizedTopArtists.find(artist => artist.normalized === 'odeon');
if (odeonMeta?.country !== 'Brazil' || odeonTop?.country !== 'Brazil') {
  errors.push('Odeon country correction regressed; expected Brazil in top data and artist_meta.');
}

const suspiciousGalleryPattern = /fileicon|newly_released_slaves|cargo_of_newly_released_slaves|slavery/i;
const invalidGalleryRows = [];
const duplicateGalleryRows = [];
const suspiciousGalleryRows = [];
for (const [artist, photos] of Object.entries(artistGallery)) {
  const seen = new Set();
  for (const photo of photos) {
    if (!/^https:\/\//.test(photo.url) || !photo.source) {
      invalidGalleryRows.push({ artist, url: photo.url, source: photo.source });
    }
    const fileKey = wikimediaFileKey(photo.url);
    if (seen.has(photo.url) || seen.has(`file:${fileKey}`)) {
      duplicateGalleryRows.push({ artist, url: photo.url });
    }
    seen.add(photo.url);
    seen.add(`file:${fileKey}`);
    if (artist === 'slaves' && suspiciousGalleryPattern.test(photo.url)) {
      suspiciousGalleryRows.push({ artist, url: photo.url });
    }
  }
}
if (invalidGalleryRows.length) {
  errors.push(`Invalid gallery rows: ${invalidGalleryRows.length}`);
}
if (duplicateGalleryRows.length) {
  errors.push(`Duplicate gallery photos: ${duplicateGalleryRows.length}`);
}
if (suspiciousGalleryRows.length) {
  errors.push(`Suspicious Slaves gallery URLs: ${suspiciousGalleryRows.map(row => row.url).join(', ')}`);
}
const slavesGallery = artistGallery.slaves ?? [];
if (!slavesGallery.some(photo => photo.url.includes('Slaves_American_band.jpg'))) {
  errors.push('Slaves gallery is missing the verified Wikimedia band photo.');
}

const artistImageCoverage = summarizeCoverage(artistImageRows);
const galleryCoverage = summarizeCoverage(galleryRows);
const enrichmentCoverage = summarizeCoverage(enrichmentRows);
const offlineCoverage = summarizeCoverage(offlineRows);
const mediaCoverage = summarizeCoverage(mediaRows);
const spotifyCoverage = mediaRows.filter(row => row.spotify).length;
const youtubeCoverage = mediaRows.filter(row => row.youtube).length;
const youtubeEmbedCoverage = mediaRows.filter(row => row.youtubeEmbed).length;
const trackCoverage = summarizeCoverage(trackRows);
const albumCoverage = summarizeCoverage(albumRows);

if (artistImageCoverage.passed < topArtists.length) {
  errors.push(`Primary artist image coverage below target: ${ratio(artistImageCoverage.passed, topArtists.length)}`);
}
if (galleryCoverage.passed < topArtists.length) {
  errors.push(`Artist gallery coverage below target: ${ratio(galleryCoverage.passed, topArtists.length)}`);
}
if (offlineCoverage.passed < topArtists.length) {
  errors.push(`Offline knowledge coverage below target: ${ratio(offlineCoverage.passed, topArtists.length)}`);
}
if (albumCoverage.passed < topAlbums.length) {
  errors.push(`Album art coverage below target: ${ratio(albumCoverage.passed, topAlbums.length)}`);
}
if (percent(trackCoverage.passed, topTracks.length) < 90) {
  errors.push(`Track art coverage under 90%: ${ratio(trackCoverage.passed, topTracks.length)}`);
}

const searchOnlyMedia = mediaRows.filter(row => row.confidence === 'search');
const singlePhotoArtists = galleryRows.filter(row => row.count === 1);
const enrichmentMissing = enrichmentCoverage.missing;
const mediaMissing = mediaCoverage.missing;
const youtubeMissing = mediaRows.filter(row => !row.youtube);
const trackMissing = trackCoverage.missing;

if (enrichmentMissing.length) {
  warnings.push(`Curated artist enrichment still missing for ${enrichmentMissing.length}/${topArtists.length} top artists.`);
}
if (mediaMissing.length) {
  warnings.push(`Curated media profiles missing for ${mediaMissing.length}/${topArtists.length} top artists.`);
}
if (trackMissing.length) {
  warnings.push(`Track art missing for ${trackMissing.length}/${topTracks.length} top tracks.`);
}
if (singlePhotoArtists.length) {
  warnings.push(`Single-photo artist galleries: ${singlePhotoArtists.length}; prioritize these for richer dossiers.`);
}

const dataFiles = await Promise.all(
  [
    'music_dna_compiled.json',
    'offline_artist_knowledge.json',
    'artist_enrichment.json',
    'artist_gallery.json',
    'artist_media_links.json',
    'track_images.json',
    'album_images.json',
  ].map(async file => {
    const raw = await readFile(path.join(dataDir, file));
    return { file, kb: Math.round((raw.byteLength / 1024) * 10) / 10 };
  }),
);

const report = {
  generatedAt: new Date().toISOString(),
  strict,
  auditedLimit: limit,
  counts: {
    topArtists: topArtists.length,
    topTracks: topTracks.length,
    topAlbums: topAlbums.length,
    artistImages: Object.keys(artistImages).length,
    artistGalleries: Object.keys(artistGallery).length,
    galleryPhotos: Object.values(artistGallery).reduce((sum, photos) => sum + photos.length, 0),
    artistMeta: Object.keys(artistMeta).length,
    artistEnrichment: enrichmentProfiles.length,
    mediaProfiles: artistMediaLinks.length,
    offlineKnowledge: knowledgeArtists.length,
    trackImages: Object.keys(trackImages).length,
    albumImages: Object.keys(albumImages).length,
  },
  coverage: {
    primaryArtistImages: ratio(artistImageCoverage.passed, topArtists.length),
    artistGalleries: ratio(galleryCoverage.passed, topArtists.length),
    curatedArtistEnrichment: ratio(enrichmentCoverage.passed, topArtists.length),
    offlineKnowledge: ratio(offlineCoverage.passed, topArtists.length),
    mediaProfiles: ratio(mediaCoverage.passed, topArtists.length),
    spotifyVerified: ratio(spotifyCoverage, topArtists.length),
    youtubeVerified: ratio(youtubeCoverage, topArtists.length),
    youtubeEmbeddable: ratio(youtubeEmbedCoverage, topArtists.length),
    trackArt: ratio(trackCoverage.passed, topTracks.length),
    albumArt: ratio(albumCoverage.passed, topAlbums.length),
  },
  quality: {
    missingFlags,
    countryMismatches,
    invalidGalleryRows,
    duplicateGalleryRows,
    suspiciousGalleryRows,
    slavesGallery,
    singlePhotoArtists: topList(singlePhotoArtists, row => row.artist.name, 20),
    searchOnlyMedia: topList(searchOnlyMedia, row => row.artist.name, 20),
  },
  priorities: {
    enrichment: topList(enrichmentMissing, row => `${row.artist.name} (#${row.artist.rank})`, 25),
    mediaProfiles: topList(mediaMissing, row => row.artist.name, 25),
    youtube: topList(youtubeMissing, row => `${row.artist.name} [${row.confidence}]`, 25),
    trackArt: topList(trackMissing, row => `${row.track.artist} - ${row.track.title}`, 25),
  },
  dataFiles,
  warnings,
  errors,
};

if (jsonOutput) {
  write(JSON.stringify(report, null, 2));
} else {
  write('Nova Music Lab data-quality audit');
  write('=================================');
  write(`Mode: ${strict ? 'strict' : 'report'} | Top limit: ${limit}`);
  write('');
  write('Core coverage');
  for (const [label, value] of Object.entries(report.coverage)) {
    write(`- ${label}: ${value}`);
  }
  write('');
  write('Data inventory');
  for (const [label, value] of Object.entries(report.counts)) {
    write(`- ${label}: ${value}`);
  }
  write('');
  write('Quality guardrails');
  write(`- Missing hand-authored flags: ${missingFlags.length ? missingFlags.join(', ') : 'none'}`);
  write(`- Country mismatches: ${countryMismatches.length ? countryMismatches.map(row => `${row.artist}: ${row.archiveCountry} vs ${row.metaCountry}`).join('; ') : 'none'}`);
  write(`- Suspicious Slaves gallery rows: ${suspiciousGalleryRows.length ? suspiciousGalleryRows.length : 'none'}`);
  write(`- Duplicate gallery photos: ${duplicateGalleryRows.length ? duplicateGalleryRows.length : 'none'}`);
  write(`- Invalid gallery rows: ${invalidGalleryRows.length ? invalidGalleryRows.length : 'none'}`);
  write('');
  write('Next priority targets');
  write(`- Curated enrichment gaps: ${report.priorities.enrichment.join(', ') || 'none'}`);
  write(`- Missing media profiles: ${report.priorities.mediaProfiles.join(', ') || 'none'}`);
  write(`- Pending YouTube verification: ${report.priorities.youtube.join(', ') || 'none'}`);
  write(`- Missing track art: ${report.priorities.trackArt.join(', ') || 'none'}`);
  write(`- Single-photo galleries: ${report.quality.singlePhotoArtists.join(', ') || 'none'}`);
  write('');
  write('Largest data files');
  for (const row of dataFiles.sort((a, b) => b.kb - a.kb)) {
    write(`- ${row.file}: ${row.kb} KB`);
  }
  if (warnings.length) {
    write('');
    write('Warnings');
    for (const warning of warnings) write(`- ${warning}`);
  }
  if (errors.length) {
    write('');
    write('Errors');
    for (const error of errors) write(`- ${error}`);
  }
}

if (strict && errors.length) {
  process.exitCode = 1;
}
