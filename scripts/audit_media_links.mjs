/* eslint-disable no-console */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'src', 'data', 'music_dna_compiled.json');
const linksPath = path.join(root, 'src', 'data', 'artist_media_links.json');

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function namesFor(entry) {
  return [entry.artist, ...(entry.aliases ?? [])].filter(Boolean);
}

function hasSpotify(entry) {
  return Boolean(entry?.spotifyArtistUrl || entry?.spotifyAlbumUrl || entry?.spotifyTrackUrl);
}

function hasYoutubeEmbed(entry) {
  return Boolean(entry?.officialAudioUrl || entry?.youtubeVideoUrl || entry?.youtubePlaylistUrl);
}

function hasYoutube(entry) {
  return Boolean(hasYoutubeEmbed(entry) || entry?.youtubeChannelUrl || entry?.livePerformanceUrl);
}

function findMediaEntry(links, artistName) {
  const normalizedArtist = normalize(artistName);
  return links.find(entry => namesFor(entry).some(name => normalize(name) === normalizedArtist));
}

function pct(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

const URL_FIELDS = [
  'spotifyArtistUrl',
  'spotifyAlbumUrl',
  'spotifyTrackUrl',
  'youtubeChannelUrl',
  'youtubeVideoUrl',
  'youtubePlaylistUrl',
  'officialAudioUrl',
  'livePerformanceUrl',
  'officialSiteUrl',
  'wikipediaEnUrl',
  'wikipediaEsUrl',
];

function invalidUrls(entry) {
  return URL_FIELDS.flatMap(field => {
    const value = entry?.[field];
    if (!value) return [];

    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
        ? []
        : [{ artist: entry.artist, field, value, reason: `unsupported ${parsed.protocol} protocol` }];
    } catch {
      return [{ artist: entry.artist, field, value, reason: 'malformed URL' }];
    }
  });
}

const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 100;
const strict = process.argv.includes('--strict');
const data = JSON.parse(await readFile(dataPath, 'utf8'));
const links = JSON.parse(await readFile(linksPath, 'utf8'));
const duplicateArtists = links
  .map(entry => normalize(entry.artist))
  .filter((artist, index, all) => artist && all.indexOf(artist) !== index);
const brokenUrls = links.flatMap(invalidUrls);
const rows = data.top_artists.slice(0, limit).map((artist, index) => {
  const media = findMediaEntry(links, artist.name);

  return {
    rank: index + 1,
    artist: artist.name,
    plays: artist.plays,
    media,
    hasProfile: Boolean(media),
    hasSpotify: hasSpotify(media),
    hasYoutube: hasYoutube(media),
    hasEmbed: hasYoutubeEmbed(media),
    confidence: media?.mediaConfidence ?? 'none',
  };
});

const total = rows.length;
const profileCount = rows.filter(row => row.hasProfile).length;
const spotifyCount = rows.filter(row => row.hasSpotify).length;
const youtubeCount = rows.filter(row => row.hasYoutube).length;
const embedCount = rows.filter(row => row.hasEmbed).length;
const searchOnlyCount = rows.filter(row => row.confidence === 'search').length;

console.log(`Media audit for top ${total} artists`);
console.log(`Profiles: ${profileCount}/${total} (${pct(profileCount, total)}%)`);
console.log(`Spotify verified: ${spotifyCount}/${total} (${pct(spotifyCount, total)}%)`);
console.log(`YouTube verified: ${youtubeCount}/${total} (${pct(youtubeCount, total)}%)`);
console.log(`Embeddable YouTube: ${embedCount}/${total} (${pct(embedCount, total)}%)`);
console.log(`Search-only fallback profiles: ${searchOnlyCount}/${total} (${pct(searchOnlyCount, total)}%)`);
console.log(`Malformed or unsupported URLs: ${brokenUrls.length}`);
console.log(`Duplicate artist profiles: ${duplicateArtists.length}`);

const missingProfiles = rows.filter(row => !row.hasProfile);
const missingYoutube = rows.filter(row => !row.hasYoutube);

if (missingProfiles.length) {
  console.log('\nMissing profiles:');
  for (const row of missingProfiles) {
    console.log(`${row.rank}. ${row.artist} (${row.plays} plays)`);
  }
}

if (missingYoutube.length) {
  console.log('\nPending verified YouTube:');
  for (const row of missingYoutube) {
    console.log(`${row.rank}. ${row.artist} [${row.confidence}]`);
  }
}

if (brokenUrls.length) {
  console.log('\nBroken URL records:');
  for (const issue of brokenUrls) {
    console.log(`${issue.artist} · ${issue.field}: ${issue.reason} (${issue.value})`);
  }
}

if (duplicateArtists.length) {
  console.log('\nDuplicate artist profiles:');
  for (const artist of [...new Set(duplicateArtists)]) console.log(artist);
}

if (strict) {
  const failures = [
    profileCount < total && `profile coverage is ${profileCount}/${total}`,
    spotifyCount < Math.ceil(total * 0.9) && `Spotify coverage is ${spotifyCount}/${total}; expected at least 90%`,
    youtubeCount < Math.ceil(total * 0.95) && `YouTube coverage is ${youtubeCount}/${total}; expected at least 95%`,
    embedCount < Math.ceil(total * 0.95) && `embeddable YouTube coverage is ${embedCount}/${total}; expected at least 95%`,
    searchOnlyCount > 0 && `${searchOnlyCount} profiles still use search-only fallbacks`,
    brokenUrls.length > 0 && `${brokenUrls.length} URL records are malformed or use unsupported protocols`,
    duplicateArtists.length > 0 && `${duplicateArtists.length} artist profiles are duplicated`,
  ].filter(Boolean);

  if (failures.length) {
    console.error('\nStrict media-link audit failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log('\nStrict media-link audit passed.');
  }
}
