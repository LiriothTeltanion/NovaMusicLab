import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GENERIC_ARTIST_PERCENT_BUDGET,
  GENERIC_GENRES,
  GENERIC_PLAY_PERCENT_BUDGET,
  HIGH_CONFIDENCE_GENRE_CORRECTIONS,
  REJECTED_GENRE_EVIDENCE,
} from './artist_truth_policy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'src', 'data');
const ANALYSIS_TIME_ZONE = 'Asia/Jerusalem';

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

function exactIdentityKey(value) {
  return String(value ?? '').normalize('NFC').trim();
}

function catalogKey(artist, title) {
  return `${String(artist).toLowerCase()}|||${String(title).toLowerCase()}`;
}

function percent(value, total) {
  return total ? Math.round((value / total) * 1000) / 10 : 0;
}

function isCalendarDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function dateKeyInTimeZone(date, timeZone = ANALYSIS_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function sumRows(rows, valueForRow) {
  return rows.reduce((sum, row) => sum + valueForRow(row), 0);
}

function sumByYear(rows, yearForRow, valueForRow) {
  const totals = new Map();
  for (const row of rows) {
    const year = yearForRow(row);
    totals.set(year, (totals.get(year) ?? 0) + valueForRow(row));
  }
  return totals;
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

function gallerySubject(url) {
  try {
    return normalize(decodeURIComponent(new URL(url).pathname));
  } catch {
    return normalize(url);
  }
}

function isOpenMediaPhoto(photo) {
  if (photo.source === 'wikipedia' || photo.source === 'wikimedia') return true;
  try {
    const host = new URL(photo.url).hostname.toLowerCase();
    return host === 'upload.wikimedia.org' || host === 'commons.wikimedia.org';
  } catch {
    return false;
  }
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
  artistGenreCatalog,
  artistImages,
  artistGallery,
  artistGalleryIdentityPolicy,
  artistMeta,
  artistEnrichment,
  artistMediaLinks,
  offlineKnowledge,
  trackImages,
  albumImages,
  artistIdentityRegistry,
  flagSource,
  dataQualityCenterSource,
] = await Promise.all([
  readJson('src/data/music_dna_compiled.json'),
  readJson('src/data/music_dna_genre_catalog.json'),
  readJson('src/data/artist_images.json'),
  readJson('src/data/artist_gallery.json'),
  readJson('src/data/artist_gallery_identity_policy.json'),
  readJson('src/data/artist_meta.json'),
  readJson('src/data/artist_enrichment.json'),
  readJson('src/data/artist_media_links.json'),
  readJson('src/data/offline_artist_knowledge.json'),
  readJson('src/data/track_images.json'),
  readJson('src/data/album_images.json'),
  readJson('src/data/artist_identity_registry.json'),
  readText('src/components/FlagArt.tsx'),
  readText('src/components/DataQualityCenter.tsx'),
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
const genreCatalogRows = Array.isArray(artistGenreCatalog) ? artistGenreCatalog : [];
const invalidGenreCatalogRows = genreCatalogRows.filter(row => (
  !row
  || typeof row !== 'object'
  || typeof row.artistKey !== 'string'
  || !row.artistKey.trim()
  || typeof row.name !== 'string'
  || row.artistKey !== row.name.normalize('NFC').trim()
  || !Number.isInteger(row.plays)
  || row.plays <= 0
  || typeof row.automaticGenre !== 'string'
  || !row.automaticGenre.trim()
  || typeof row.automaticFamily !== 'string'
  || !row.automaticFamily.trim()
  || typeof row.country !== 'string'
  || !row.country.trim()
  || !['catalog', 'unclassified'].includes(row.source)
  || (row.source === 'unclassified'
    && (row.automaticGenre !== 'Unclassified' || row.automaticFamily !== 'Unclassified'))
));
const genreCatalogKeys = new Set(genreCatalogRows.map(row => row.artistKey));
const genreCatalogPlays = sumRows(genreCatalogRows, row => Number(row.plays) || 0);
const genreCatalogByKey = new Map(genreCatalogRows.map(row => [row.artistKey, row]));
const genreCatalogUnclassified = genreCatalogRows.filter(row => row.source === 'unclassified');
const genreCatalogUnclassifiedPlays = sumRows(genreCatalogUnclassified, row => row.plays);
const genreCatalogFamilyPlays = new Map();
for (const row of genreCatalogRows) {
  genreCatalogFamilyPlays.set(
    row.automaticFamily,
    (genreCatalogFamilyPlays.get(row.automaticFamily) ?? 0) + row.plays,
  );
}
const compiledGenrePlays = new Map(musicData.top_genres.map(row => [row.name, row.plays]));
const genreFamilyMismatches = [...new Set([
  ...genreCatalogFamilyPlays.keys(),
  ...compiledGenrePlays.keys(),
])]
  .map(family => ({
    family,
    catalog: genreCatalogFamilyPlays.get(family) ?? 0,
    compiled: compiledGenrePlays.get(family) ?? 0,
  }))
  .filter(row => row.catalog !== row.compiled);
const topArtistGenreCatalogMismatches = topArtists
  .map(artist => {
    const catalog = genreCatalogByKey.get(exactIdentityKey(artist.name));
    return catalog
      && catalog.plays === artist.plays
      && catalog.automaticGenre === artist.genre
      && catalog.country === artist.country
      ? null
      : { artist: artist.name, catalog, compiled: artist };
  })
  .filter(Boolean);
const enrichmentProfiles = Array.isArray(artistEnrichment)
  ? artistEnrichment
  : Object.values(artistEnrichment);
const knowledgeArtists = offlineKnowledge.artists ?? [];
const knowledgeByExactName = new Map(
  knowledgeArtists
    .filter(artist => artist.name)
    .map(artist => [String(artist.name).normalize('NFC').trim(), artist]),
);
const knowledgeByName = new Map();
for (const artist of knowledgeArtists) {
  for (const candidate of [
    artist.name,
    artist.normalizedName,
  ].filter(Boolean)) {
    const key = normalize(candidate);
    if (!knowledgeByName.has(key)) knowledgeByName.set(key, artist);
  }
}
for (const artist of knowledgeArtists) {
  for (const candidate of [artist.musicbrainz?.name, artist.wikidata?.label].filter(Boolean)) {
    const key = normalize(candidate);
    if (!knowledgeByName.has(key)) knowledgeByName.set(key, artist);
  }
}
const flagCountries = buildFlagSet(flagSource);
const errors = [];
const warnings = [];

if (!Array.isArray(artistGenreCatalog)) {
  errors.push('Artist genre catalog is not an array.');
}
if (Object.hasOwn(musicData, 'artist_genre_catalog')) {
  errors.push('music_dna_compiled.json embeds artist_genre_catalog; keep the long-tail catalog in its lazy asset.');
}
if (invalidGenreCatalogRows.length) {
  errors.push(`Invalid artist genre catalog rows: ${invalidGenreCatalogRows.length}.`);
}
if (genreCatalogRows.length !== musicData.core_metrics.unique_artists) {
  errors.push(`Artist genre catalog count diverges: ${genreCatalogRows.length} rows, ${musicData.core_metrics.unique_artists} unique artists.`);
}
if (genreCatalogKeys.size !== genreCatalogRows.length) {
  errors.push(`Duplicate artist genre catalog keys: ${genreCatalogRows.length - genreCatalogKeys.size}.`);
}
if (genreCatalogPlays !== musicData.core_metrics.total_plays) {
  errors.push(`Artist genre catalog plays diverge: ${genreCatalogPlays} catalog, ${musicData.core_metrics.total_plays} core.`);
}
if (genreFamilyMismatches.length) {
  errors.push(`Artist genre family totals diverge: ${genreFamilyMismatches.map(row => `${row.family} (${row.catalog}/${row.compiled})`).join(', ')}.`);
}
if (topArtistGenreCatalogMismatches.length) {
  errors.push(`Top artists are not synchronized with the genre catalog: ${topArtistGenreCatalogMismatches.map(row => row.artist).join(', ')}.`);
}

const dailySource = musicData.daily_plays ?? {};
const invalidDailyDates = Object.keys(dailySource).filter(dateKey => !isCalendarDateKey(dateKey));
const invalidDailyValues = Object.entries(dailySource).filter(([, plays]) => (
  !Number.isInteger(plays) || plays < 0
));
const dailyRows = Object.entries(dailySource)
  .filter(([dateKey, plays]) => isCalendarDateKey(dateKey) && Number.isInteger(plays) && plays >= 0)
  .sort(([left], [right]) => left.localeCompare(right));
const monthlyRows = musicData.monthly_activity ?? [];
const yearlyRows = musicData.yearly_eras ?? [];
const invalidMonthlyRows = monthlyRows.filter(row => (
  !Number.isInteger(row.year)
  || !Number.isInteger(row.month)
  || row.month < 0
  || row.month > 11
  || !Number.isInteger(row.plays)
  || row.plays < 0
));
const invalidYearlyRows = yearlyRows.filter(row => (
  !Number.isInteger(row.year) || !Number.isInteger(row.plays) || row.plays < 0
));
const duplicateMonths = monthlyRows
  .map(row => `${row.year}-${String(row.month + 1).padStart(2, '0')}`)
  .filter((key, index, rows) => rows.indexOf(key) !== index);
const duplicateYears = yearlyRows
  .map(row => row.year)
  .filter((year, index, rows) => rows.indexOf(year) !== index);
const dataMinDate = dailyRows[0]?.[0] ?? null;
const dataMaxDate = dailyRows.at(-1)?.[0] ?? null;
const currentDate = dateKeyInTimeZone(new Date());
const dailyTotal = sumRows(dailyRows, ([, plays]) => plays);
const monthlyTotal = sumRows(monthlyRows, row => row.plays);
const yearlyTotal = sumRows(yearlyRows, row => row.plays);
const activeDays = dailyRows.filter(([, plays]) => plays > 0).length;
const dailyByYear = sumByYear(dailyRows, ([dateKey]) => Number(dateKey.slice(0, 4)), ([, plays]) => plays);
const monthlyByYear = sumByYear(monthlyRows, row => row.year, row => row.plays);
const yearlyByYear = sumByYear(yearlyRows, row => row.year, row => row.plays);
const aggregateYears = [...new Set([
  ...dailyByYear.keys(),
  ...monthlyByYear.keys(),
  ...yearlyByYear.keys(),
])].sort((left, right) => left - right);
const yearlyAggregateMismatches = aggregateYears
  .map(year => ({
    year,
    daily: dailyByYear.get(year) ?? 0,
    monthly: monthlyByYear.get(year) ?? 0,
    yearly: yearlyByYear.get(year) ?? 0,
  }))
  .filter(row => row.daily !== row.monthly || row.daily !== row.yearly);
const generatedDate = Number.isNaN(Date.parse(musicData.generated_at))
  ? null
  : dateKeyInTimeZone(new Date(musicData.generated_at));
const daysSinceDataMax = dataMaxDate
  ? Math.floor((Date.parse(`${currentDate}T00:00:00Z`) - Date.parse(`${dataMaxDate}T00:00:00Z`)) / 86_400_000)
  : null;
const latestYear = dataMaxDate ? Number(dataMaxDate.slice(0, 4)) : null;
const latestPeriodStatus = !dataMaxDate || !latestYear
  ? 'unknown'
  : dataMaxDate === `${latestYear}-12-31`
    ? 'complete'
    : latestYear === Number(currentDate.slice(0, 4))
      ? 'ytd'
      : 'partial';
const fullArchivePlays = musicData.core_metrics.total_plays;
const globalTop100 = musicData.top_artists.slice(0, 100);
const globalTop100Plays = sumRows(globalTop100, artist => artist.plays);
const globalCoverage = {
  topArtistCount: globalTop100.length,
  archiveArtistCount: musicData.core_metrics.unique_artists,
  top100Plays: globalTop100Plays,
  outsideTop100Plays: fullArchivePlays - globalTop100Plays,
  archivePlays: fullArchivePlays,
  top100PlayCoveragePct: percent(globalTop100Plays, fullArchivePlays),
};

if (invalidDailyDates.length) errors.push(`Invalid daily date keys: ${invalidDailyDates.join(', ')}`);
if (invalidDailyValues.length) errors.push(`Invalid daily play values: ${invalidDailyValues.length}`);
if (invalidMonthlyRows.length) errors.push(`Invalid monthly rows: ${invalidMonthlyRows.length}`);
if (invalidYearlyRows.length) errors.push(`Invalid yearly rows: ${invalidYearlyRows.length}`);
if (duplicateMonths.length) errors.push(`Duplicate monthly rows: ${[...new Set(duplicateMonths)].join(', ')}`);
if (duplicateYears.length) errors.push(`Duplicate yearly rows: ${[...new Set(duplicateYears)].join(', ')}`);
if (!dataMinDate || !dataMaxDate) errors.push('Daily date bounds are unavailable.');
if (dataMaxDate && dataMaxDate > currentDate) {
  errors.push(`Future daily data detected: ${dataMaxDate} is after ${currentDate} in ${ANALYSIS_TIME_ZONE}.`);
}
if (!generatedDate) errors.push(`Invalid generated_at timestamp: ${musicData.generated_at}`);
if (generatedDate && dataMaxDate && generatedDate < dataMaxDate) {
  errors.push(`generated_at (${generatedDate}) predates data_max_date (${dataMaxDate}).`);
}
if (dailyTotal !== fullArchivePlays || monthlyTotal !== fullArchivePlays || yearlyTotal !== fullArchivePlays) {
  errors.push(`Aggregate totals diverge: daily ${dailyTotal}, monthly ${monthlyTotal}, yearly ${yearlyTotal}, core ${fullArchivePlays}.`);
}
if (yearlyAggregateMismatches.length) {
  errors.push(`Year-level aggregate drift: ${yearlyAggregateMismatches.map(row => `${row.year} (${row.daily}/${row.monthly}/${row.yearly})`).join(', ')}`);
}
if (activeDays !== musicData.core_metrics.active_days) {
  errors.push(`Active-day count diverges: daily ${activeDays}, core ${musicData.core_metrics.active_days}.`);
}
if (globalTop100Plays > fullArchivePlays || globalTop100.length > musicData.core_metrics.unique_artists) {
  errors.push(`Invalid global top-100 coverage: ${globalTop100Plays}/${fullArchivePlays} plays, ${globalTop100.length}/${musicData.core_metrics.unique_artists} artists.`);
}

const artistIdentityRows = artistIdentityRegistry.identities.map(identity => {
  const canonicalKey = exactIdentityKey(identity.canonical);
  const aliasKeys = new Set(identity.aliases.map(exactIdentityKey));
  const knowledge = knowledgeByExactName.get(canonicalKey)
    ?? knowledgeByName.get(normalize(identity.canonical));
  const registeredMbid = identity.evidence?.musicbrainz?.id;
  const registeredQid = identity.evidence?.wikidata?.id;
  const canonicalRows = musicData.top_artists.filter(artist => exactIdentityKey(artist.name) === canonicalKey);
  const leaks = [
    ...musicData.top_artists.map(artist => ({ view: 'top_artists', name: artist.name })),
    ...musicData.top_tracks.map(track => ({ view: 'top_tracks', name: track.artist })),
    ...musicData.top_albums.map(album => ({ view: 'top_albums', name: album.artist })),
    ...(musicData.yearly_eras ?? []).map(era => ({ view: 'yearly_eras', name: era.top_artist })),
    ...(musicData.sessions ?? []).map(session => ({ view: 'sessions', name: session.top_artist })),
    ...(musicData.obsessions ?? []).map(obsession => ({ view: 'obsessions', name: obsession.artist })),
  ].filter(row => aliasKeys.has(exactIdentityKey(row.name)));
  const evidenceOk = Boolean(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(registeredMbid ?? '')
    && /^Q[1-9]\d*$/.test(registeredQid ?? '')
    && registeredMbid === knowledge?.musicbrainz?.id
    && registeredQid === knowledge?.wikidata?.id,
  );

  return {
    canonical: identity.canonical,
    aliases: identity.aliases,
    canonicalRows: canonicalRows.length,
    canonicalPlays: canonicalRows[0]?.plays ?? 0,
    evidenceOk,
    evidence: {
      registeredMbid,
      registeredQid,
      knowledgeMbid: knowledge?.musicbrainz?.id,
      knowledgeQid: knowledge?.wikidata?.id,
    },
    leaks,
    ok: canonicalRows.length === 1 && leaks.length === 0 && evidenceOk,
  };
});
const artistIdentityFailures = artistIdentityRows.filter(row => !row.ok);
if (artistIdentityFailures.length) {
  errors.push(`Canonical artist identity splits: ${artistIdentityFailures.map(row => {
    const leaks = row.leaks.map(leak => `${leak.name} in ${leak.view}`).join(', ') || 'none';
    return `${row.canonical} (canonical rows ${row.canonicalRows}, aliases ${leaks}, evidence ${row.evidenceOk ? 'ok' : 'missing'})`;
  }).join('; ')}`);
}

function knowledgeForArtist(name) {
  return knowledgeByExactName.get(String(name).normalize('NFC').trim())
    ?? knowledgeByName.get(normalize(name));
}

const knowledgeSummaryArtists = musicData.top_artists;
const knowledgeMatches = knowledgeSummaryArtists.filter(artist => {
  const knowledge = knowledgeForArtist(artist.name);
  return Boolean(knowledge?.musicbrainz || knowledge?.curated);
});
const currentKnowledgeSummary = {
  source: 'offline_artist_knowledge',
  generated_at: offlineKnowledge.meta?.generatedAt ?? null,
  cache_artist_count: knowledgeArtists.length,
  wikidata_profile_count: knowledgeArtists.filter(artist => artist.wikidata?.id).length,
  wikidata_description_count: knowledgeArtists.filter(artist => artist.wikidata?.description).length,
  wikidata_website_count: knowledgeArtists.filter(artist => artist.wikidata?.officialWebsites?.length).length,
  wikidata_image_count: knowledgeArtists.filter(artist => artist.wikidata?.images?.length).length,
  total_artists: knowledgeSummaryArtists.length,
  matched_artists: knowledgeMatches.length,
  unmatched_artists: knowledgeSummaryArtists.length - knowledgeMatches.length,
  match_rate_pct: percent(knowledgeMatches.length, knowledgeSummaryArtists.length),
  matched_plays: sumRows(knowledgeMatches, artist => artist.plays),
  matched_play_rate_pct: percent(
    sumRows(knowledgeMatches, artist => artist.plays),
    sumRows(knowledgeSummaryArtists, artist => artist.plays),
  ),
};
const embeddedKnowledgeSummary = musicData.knowledge_summary ?? null;
const knowledgeSummaryFields = Object.keys(currentKnowledgeSummary);
const embeddedKnowledgeDrift = embeddedKnowledgeSummary
  ? knowledgeSummaryFields
      .filter(field => embeddedKnowledgeSummary[field] !== currentKnowledgeSummary[field])
      .map(field => ({
        field,
        embedded: embeddedKnowledgeSummary[field],
        current: currentKnowledgeSummary[field],
      }))
  : [];
const uiUsesLiveKnowledge = /const\s+knowledgeSummary\s*=\s*buildOfflineArtistKnowledgeSummary\(data\.top_artists\)/
  .test(dataQualityCenterSource)
  && !/const\s+knowledgeSummary\s*=\s*data\.knowledge_summary/.test(dataQualityCenterSource);

if (!uiUsesLiveKnowledge) {
  errors.push('DataQualityCenter is not guarded against a stale embedded knowledge_summary.');
}
if (embeddedKnowledgeDrift.length && uiUsesLiveKnowledge) {
  warnings.push(`Embedded knowledge_summary is legacy (${embeddedKnowledgeDrift.map(row => row.field).join(', ')}); UI synchronization is protected by the live offline source.`);
}

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
  ok: Boolean(knowledgeForArtist(artist.name)),
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
// 'Unknown' is a deliberate pseudo-country (artists whose base is genuinely
// unverified) - FlagArt renders its globe/generated fallback for it by design.
const missingFlags = countries.filter(country => country !== 'Unknown' && !flagCountries.has(country));
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
  errors.push(`Compiled/canonical country mismatches: ${countryMismatches.map(row => `${row.artist} (${row.archiveCountry} vs ${row.metaCountry})`).join(', ')}`);
}

const genreMismatches = normalizedTopArtists
  .map(artist => {
    const meta = artistMeta[artist.key] ?? artistMeta[artist.normalized];
    return meta && meta.genre !== artist.genre
      ? { artist: artist.name, archiveGenre: artist.genre, metaGenre: meta.genre }
      : null;
  })
  .filter(Boolean);
if (genreMismatches.length) {
  errors.push(`Compiled/canonical genre mismatches: ${genreMismatches.map(row => `${row.artist} (${row.archiveGenre} vs ${row.metaGenre})`).join(', ')}`);
}

const offlineArchiveMismatches = normalizedTopArtists
  .map(artist => {
    const knowledge = knowledgeForArtist(artist.name);
    if (!knowledge?.archive) return null;
    const countryMatches = knowledge.archive.country === artist.country;
    const genreMatches = knowledge.archive.genre === artist.genre;
    return countryMatches && genreMatches
      ? null
      : {
          artist: artist.name,
          compiledCountry: artist.country,
          offlineCountry: knowledge.archive.country,
          compiledGenre: artist.genre,
          offlineGenre: knowledge.archive.genre,
        };
  })
  .filter(Boolean);
if (offlineArchiveMismatches.length) {
  errors.push(`Offline archive metadata is stale for: ${offlineArchiveMismatches.map(row => row.artist).join(', ')}. Run node scripts/sync_offline_archive_metadata.mjs --write after recompiling.`);
}

// Wikidata country evidence is independent from artist_meta and the compiled
// archive. A single asserted country is strong enough to reject a stale
// catch-all fallback; multi-country artists remain intentionally unresolved.
const countryEvidenceRows = normalizedTopArtists.map(artist => {
  const knowledge = knowledgeForArtist(artist.name);
  const wikidataCountries = Array.from(new Set(
    (knowledge?.wikidata?.countries ?? []).map(country => String(country).trim()).filter(Boolean),
  ));
  const expectedCountry = wikidataCountries.length === 1 ? wikidataCountries[0] : undefined;
  const meta = artistMeta[artist.key] ?? artistMeta[artist.normalized];
  return {
    artist: artist.name,
    rank: artist.rank,
    plays: artist.plays,
    archiveCountry: artist.country,
    metaCountry: meta?.country,
    wikidataCountries,
    expectedCountry,
    archiveMatches: !expectedCountry || normalize(artist.country) === normalize(expectedCountry),
    metaMatches: !expectedCountry || normalize(meta?.country) === normalize(expectedCountry),
  };
});
const countryEvidenceConflicts = countryEvidenceRows.filter(row => (
  row.expectedCountry && (!row.archiveMatches || !row.metaMatches)
));
if (countryEvidenceConflicts.length) {
  errors.push(`Wikidata country conflicts: ${countryEvidenceConflicts.map(row => `${row.artist} (${row.archiveCountry}/${row.metaCountry} vs ${row.expectedCountry})`).join(', ')}`);
}

// Genre corrections require explicit, artist-specific MusicBrainz evidence.
// This prevents noisy tags such as locations, event names and homonyms from
// silently becoming product-facing metadata.
const genreEvidenceRows = HIGH_CONFIDENCE_GENRE_CORRECTIONS
  .filter(rule => normalizedTopArtists.some(candidate => candidate.normalized === normalize(rule.artist)))
  .map(rule => {
    const artist = normalizedTopArtists.find(candidate => candidate.normalized === normalize(rule.artist));
    const knowledge = knowledgeForArtist(rule.artist);
    const musicBrainzTags = new Set((knowledge?.musicbrainz?.tags ?? []).map(normalize));
    const wikidataGenres = new Set((knowledge?.wikidata?.genres ?? []).map(normalize));
    const missingMusicBrainzTags = rule.musicBrainzTags.filter(tag => !musicBrainzTags.has(normalize(tag)));
    const missingWikidataGenres = (rule.wikidataGenres ?? []).filter(tag => !wikidataGenres.has(normalize(tag)));
    const meta = artist ? artistMeta[artist.key] ?? artistMeta[artist.normalized] : undefined;
    return {
      artist: rule.artist,
      rank: artist?.rank,
      expectedGenre: rule.genre,
      archiveGenre: artist?.genre,
      metaGenre: meta?.genre,
      musicBrainzTags: rule.musicBrainzTags,
      wikidataGenres: rule.wikidataGenres ?? [],
      missingMusicBrainzTags,
      missingWikidataGenres,
      evidenceOk: Boolean(knowledge) && !missingMusicBrainzTags.length && !missingWikidataGenres.length,
      metadataOk: Boolean(artist && meta && artist.genre === rule.genre && meta.genre === rule.genre),
    };
  });
const missingGenreEvidence = genreEvidenceRows.filter(row => !row.evidenceOk);
const highConfidenceGenreMismatches = genreEvidenceRows.filter(row => row.evidenceOk && !row.metadataOk);
if (missingGenreEvidence.length) {
  errors.push(`Genre policy lost its source evidence: ${missingGenreEvidence.map(row => row.artist).join(', ')}`);
}
if (highConfidenceGenreMismatches.length) {
  errors.push(`High-confidence genre corrections missing: ${highConfidenceGenreMismatches.map(row => `${row.artist} (expected ${row.expectedGenre}, found ${row.archiveGenre}/${row.metaGenre})`).join(', ')}`);
}

const genericGenreRows = normalizedTopArtists.filter(artist => GENERIC_GENRES.has(normalize(artist.genre)));
const topArtistPlays = normalizedTopArtists.reduce((sum, artist) => sum + artist.plays, 0);
const genericGenrePlays = genericGenreRows.reduce((sum, artist) => sum + artist.plays, 0);
const genericArtistPercent = percent(genericGenreRows.length, normalizedTopArtists.length);
const genericPlayPercent = percent(genericGenrePlays, topArtistPlays);
const genericGenreBudget = {
  artists: genericGenreRows.length,
  artistPercent: genericArtistPercent,
  artistPercentBudget: GENERIC_ARTIST_PERCENT_BUDGET,
  plays: genericGenrePlays,
  playPercent: genericPlayPercent,
  playPercentBudget: GENERIC_PLAY_PERCENT_BUDGET,
  withinBudget: genericArtistPercent <= GENERIC_ARTIST_PERCENT_BUDGET
    && genericPlayPercent <= GENERIC_PLAY_PERCENT_BUDGET,
};
if (!genericGenreBudget.withinBudget) {
  errors.push(`Generic genre budget exceeded: ${genericGenreRows.length}/${normalizedTopArtists.length} artists (${genericArtistPercent}% > ${GENERIC_ARTIST_PERCENT_BUDGET}%) and ${genericGenrePlays}/${topArtistPlays} plays (${genericPlayPercent}% > ${GENERIC_PLAY_PERCENT_BUDGET}%).`);
}
if (genericGenreRows.length) {
  warnings.push(`Generic genres remain for ${genericGenreRows.length}/${normalizedTopArtists.length} artists (${genericPlayPercent}% of top-${normalizedTopArtists.length} plays); keep them unresolved until trustworthy evidence exists.`);
}

const odeonMeta = artistMeta.odeon;
const odeonTop = normalizedTopArtists.find(artist => artist.normalized === 'odeon');
if (odeonMeta?.country !== 'Brazil' || odeonTop?.country !== 'Brazil') {
  errors.push('Odeon country correction regressed; expected Brazil in top data and artist_meta.');
}

const suspiciousGalleryPattern = /fileicon|newly_released_slaves|cargo_of_newly_released_slaves|slavery/i;
const galleryArtifactPattern = /file-type-icons|fileicon|\.pdf(?:\/|\.|$)|\.stl(?:\/|\.|$)/i;
const invalidGalleryRows = [];
const duplicateGalleryRows = [];
const suspiciousGalleryRows = [];
const galleryArtifactRows = [];
const galleryIdentityViolations = [];
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
    if (galleryArtifactPattern.test(photo.url)) {
      galleryArtifactRows.push({ artist, url: photo.url });
    }
  }
}

if (artistGalleryIdentityPolicy.schemaVersion !== 1
  || !Array.isArray(artistGalleryIdentityPolicy.rules)) {
  errors.push('Artist gallery identity policy is missing or unsupported.');
} else {
  for (const rule of artistGalleryIdentityPolicy.rules) {
    const allowedSubjects = (rule.allowedOpenMediaSubjects ?? []).map(normalize);
    const requiredSubjects = (rule.requiredOpenMediaSubjects ?? []).map(normalize);
    const approvedDirectAssets = rule.approvedDirectAssets ?? [];

    for (const forbiddenKey of rule.forbiddenGalleryKeys ?? []) {
      if (Object.hasOwn(artistGallery, forbiddenKey)) {
        galleryIdentityViolations.push({
          identity: rule.identity,
          galleryKey: forbiddenKey,
          reason: 'forbidden alias gallery key',
          url: null,
        });
      }
    }

    for (const galleryKey of rule.galleryKeys ?? []) {
      const photos = artistGallery[galleryKey];
      if (!Array.isArray(photos) || photos.length === 0) {
        galleryIdentityViolations.push({
          identity: rule.identity,
          galleryKey,
          reason: 'missing trusted gallery/fallback',
          url: null,
        });
        continue;
      }

      for (const photo of photos.filter(isOpenMediaPhoto)) {
        const subject = gallerySubject(photo.url);
        if (!allowedSubjects.some(allowed => subject.includes(allowed))) {
          galleryIdentityViolations.push({
            identity: rule.identity,
            galleryKey,
            reason: 'open-media subject is not identity-approved',
            url: photo.url,
          });
        }
      }

      for (const photo of photos.filter(candidate => !isOpenMediaPhoto(candidate))) {
        if (!approvedDirectAssets.some(asset => (
          asset.source === photo.source && photo.url.includes(asset.urlToken)
        ))) {
          galleryIdentityViolations.push({
            identity: rule.identity,
            galleryKey,
            reason: 'direct-provider asset is not identity-approved',
            url: photo.url,
          });
        }
      }

      for (const required of requiredSubjects) {
        if (!photos.some(photo => isOpenMediaPhoto(photo) && gallerySubject(photo.url).includes(required))) {
          galleryIdentityViolations.push({
            identity: rule.identity,
            galleryKey,
            reason: `missing required open-media subject: ${required}`,
            url: null,
          });
        }
      }

      for (const requiredSource of rule.requiredDirectSources ?? []) {
        if (!photos.some(photo => (
          photo.source === requiredSource
          && approvedDirectAssets.some(asset => (
            asset.source === photo.source && photo.url.includes(asset.urlToken)
          ))
        ))) {
          galleryIdentityViolations.push({
            identity: rule.identity,
            galleryKey,
            reason: `missing trusted ${requiredSource} fallback`,
            url: null,
          });
        }
      }
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
if (galleryArtifactRows.length) {
  errors.push(`Non-photographic gallery artifacts: ${galleryArtifactRows.map(row => row.url).join(', ')}`);
}
if (galleryIdentityViolations.length) {
  errors.push(`Ambiguous artist gallery identity violations: ${galleryIdentityViolations.map(row => (
    `${row.galleryKey} (${row.reason}${row.url ? `: ${row.url}` : ''})`
  )).join('; ')}`);
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
    'music_dna_genre_catalog.json',
    'offline_artist_knowledge.json',
    'artist_enrichment.json',
    'artist_gallery.json',
    'artist_media_links.json',
    'track_images.json',
    'album_images.json',
    'artist_identity_registry.json',
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
    canonicalArtistIdentities: artistIdentityRows.length,
    genreCatalogArtists: genreCatalogRows.length,
    genreCatalogUnclassifiedArtists: genreCatalogUnclassified.length,
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
    top100ArchivePlays: ratio(globalTop100Plays, fullArchivePlays),
    genreCatalog: ratio(genreCatalogPlays, fullArchivePlays),
    unclassifiedGenrePlays: ratio(genreCatalogUnclassifiedPlays, fullArchivePlays),
  },
  dataTrust: {
    analysisTimeZone: ANALYSIS_TIME_ZONE,
    currentDate,
    dataMinDate,
    dataMaxDate,
    generatedDate,
    daysSinceDataMax,
    latestPeriodStatus,
    totals: {
      daily: dailyTotal,
      monthly: monthlyTotal,
      yearly: yearlyTotal,
      core: fullArchivePlays,
    },
    activeDays: {
      daily: activeDays,
      core: musicData.core_metrics.active_days,
    },
    yearlyAggregateMismatches,
    globalCoverage,
    genreCatalog: {
      artists: genreCatalogRows.length,
      uniqueKeys: genreCatalogKeys.size,
      plays: genreCatalogPlays,
      unclassifiedArtists: genreCatalogUnclassified.length,
      unclassifiedPlays: genreCatalogUnclassifiedPlays,
      unclassifiedPlayPct: percent(genreCatalogUnclassifiedPlays, fullArchivePlays),
      invalidRows: invalidGenreCatalogRows.length,
      familyMismatches: genreFamilyMismatches,
      topArtistMismatches: topArtistGenreCatalogMismatches.map(row => row.artist),
    },
  },
  quality: {
    knowledgeSummary: {
      sourceOfTruth: 'offline_artist_knowledge.json',
      uiUsesLiveKnowledge,
      uiSummarySynchronized: uiUsesLiveKnowledge && currentKnowledgeSummary.matched_artists === knowledgeMatches.length,
      current: currentKnowledgeSummary,
      embeddedDrift: embeddedKnowledgeDrift,
    },
    missingFlags,
    countryMismatches,
    genreMismatches,
    offlineArchiveMismatches,
    countryEvidence: {
      singleCountryProfiles: countryEvidenceRows.filter(row => row.expectedCountry).length,
      conflicts: countryEvidenceConflicts,
    },
    genreEvidence: {
      policyCorrections: genreEvidenceRows.length,
      verifiedCorrections: genreEvidenceRows.filter(row => row.evidenceOk && row.metadataOk).length,
      missingEvidence: missingGenreEvidence,
      mismatches: highConfidenceGenreMismatches,
      rejected: REJECTED_GENRE_EVIDENCE,
    },
    genericGenreBudget,
    artistIdentity: {
      policy: artistIdentityRegistry.matching_policy,
      verified: artistIdentityRows.filter(row => row.ok).length,
      identities: artistIdentityRows,
    },
    genericGenreArtists: topList(genericGenreRows, row => ({
      artist: row.name,
      rank: row.rank,
      plays: row.plays,
      genre: row.genre,
      musicBrainzTags: knowledgeForArtist(row.name)?.musicbrainz?.tags ?? [],
    }), 100),
    invalidGalleryRows,
    duplicateGalleryRows,
    suspiciousGalleryRows,
    galleryArtifactRows,
    galleryIdentityViolations,
    slavesGallery,
    singlePhotoArtists: topList(singlePhotoArtists, row => row.artist.name, 20),
    searchOnlyMedia: topList(searchOnlyMedia, row => row.artist.name, 20),
  },
  priorities: {
    enrichment: topList(enrichmentMissing, row => `${row.artist.name} (#${row.artist.rank})`, 25),
    mediaProfiles: topList(mediaMissing, row => row.artist.name, 25),
    youtube: topList(youtubeMissing, row => `${row.artist.name} [${row.confidence}]`, 25),
    trackArt: topList(trackMissing, row => `${row.track.artist} - ${row.track.title}`, 25),
    genericGenres: topList(genericGenreRows, row => `${row.name} (#${row.rank})`, 25),
    unclassifiedArtists: topList(
      genreCatalogUnclassified,
      row => `${row.name} (${row.plays} plays)`,
      25,
    ),
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
  write('Data trust');
  write(`- Observed period: ${dataMinDate ?? 'unknown'} → ${dataMaxDate ?? 'unknown'} (${latestPeriodStatus}, ${ANALYSIS_TIME_ZONE})`);
  write(`- Freshness: ${daysSinceDataMax ?? 'unknown'} days since latest observed event; generated ${generatedDate ?? 'invalid'}`);
  write(`- Aggregate invariant: daily ${dailyTotal} = monthly ${monthlyTotal} = yearly ${yearlyTotal} = core ${fullArchivePlays}`);
  write(`- Active-day invariant: ${activeDays} daily = ${musicData.core_metrics.active_days} core`);
  write(`- Top-100 global coverage: ${globalTop100Plays}/${fullArchivePlays} plays (${globalCoverage.top100PlayCoveragePct}%); ${globalCoverage.outsideTop100Plays} outside top 100`);
  write(`- Genre catalog invariant: ${genreCatalogRows.length}/${musicData.core_metrics.unique_artists} artists, ${genreCatalogPlays}/${fullArchivePlays} plays, ${genreCatalogKeys.size} unique keys`);
  write(`- Unclassified genre queue: ${genreCatalogUnclassified.length} artists, ${genreCatalogUnclassifiedPlays} plays (${percent(genreCatalogUnclassifiedPlays, fullArchivePlays)}%)`);
  write(`- Knowledge summary source: ${uiUsesLiveKnowledge ? 'live offline archive (synchronized)' : 'unsafe embedded snapshot'}`);
  write('');
  write('Data inventory');
  for (const [label, value] of Object.entries(report.counts)) {
    write(`- ${label}: ${value}`);
  }
  write('');
  write('Quality guardrails');
  write(`- Missing hand-authored flags: ${missingFlags.length ? missingFlags.join(', ') : 'none'}`);
  write(`- Country mismatches: ${countryMismatches.length ? countryMismatches.map(row => `${row.artist}: ${row.archiveCountry} vs ${row.metaCountry}`).join('; ') : 'none'}`);
  write(`- Offline archive metadata drift: ${offlineArchiveMismatches.length ? offlineArchiveMismatches.map(row => row.artist).join(', ') : 'none'}`);
  write(`- Wikidata country conflicts: ${countryEvidenceConflicts.length ? countryEvidenceConflicts.map(row => `${row.artist}: ${row.archiveCountry}/${row.metaCountry} vs ${row.expectedCountry}`).join('; ') : 'none'}`);
  write(`- High-confidence genre corrections: ${genreEvidenceRows.filter(row => row.evidenceOk && row.metadataOk).length}/${genreEvidenceRows.length} verified`);
  write(`- Rejected suspicious genre evidence: ${REJECTED_GENRE_EVIDENCE.map(row => `${row.artist}: ${row.tags.join(', ')}`).join('; ') || 'none'}`);
  write(`- Generic genre budget: ${genericGenreRows.length}/${normalizedTopArtists.length} artists (${genericArtistPercent}% / ${GENERIC_ARTIST_PERCENT_BUDGET}% max), ${genericGenrePlays}/${topArtistPlays} plays (${genericPlayPercent}% / ${GENERIC_PLAY_PERCENT_BUDGET}% max)`);
  write(`- Canonical artist identities: ${report.quality.artistIdentity.verified}/${report.quality.artistIdentity.identities.length} verified`);
  write(`- Suspicious Slaves gallery rows: ${suspiciousGalleryRows.length ? suspiciousGalleryRows.length : 'none'}`);
  write(`- Non-photographic gallery artifacts: ${galleryArtifactRows.length ? galleryArtifactRows.length : 'none'}`);
  write(`- Ambiguous-name gallery identity violations: ${galleryIdentityViolations.length ? galleryIdentityViolations.length : 'none'}`);
  write(`- Duplicate gallery photos: ${duplicateGalleryRows.length ? duplicateGalleryRows.length : 'none'}`);
  write(`- Invalid gallery rows: ${invalidGalleryRows.length ? invalidGalleryRows.length : 'none'}`);
  write('');
  write('Next priority targets');
  write(`- Curated enrichment gaps: ${report.priorities.enrichment.join(', ') || 'none'}`);
  write(`- Missing media profiles: ${report.priorities.mediaProfiles.join(', ') || 'none'}`);
  write(`- Pending YouTube verification: ${report.priorities.youtube.join(', ') || 'none'}`);
  write(`- Missing track art: ${report.priorities.trackArt.join(', ') || 'none'}`);
  write(`- Generic genres awaiting trustworthy evidence: ${report.priorities.genericGenres.join(', ') || 'none'}`);
  write(`- Highest-impact unclassified artists: ${report.priorities.unclassifiedArtists.join(', ') || 'none'}`);
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
