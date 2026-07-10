import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'src', 'data', 'music_dna_compiled.json');
const outputPath = path.join(root, 'src', 'data', 'offline_artist_knowledge.json');
const cacheDir = path.join(root, 'scripts', '.cache', 'offline_artist_knowledge');

const MUSICBRAINZ_BASE = 'https://musicbrainz.org/ws/2';
const WIKIDATA_SPARQL_URL = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'NovaMusicLab/0.1 (offline artist knowledge builder; local development)';
const REQUEST_DELAY_MS = 1150;
const WIKIDATA_BATCH_SIZE = 45;

const ARTIST_QUERY_ALIASES = new Map([
  ['nothingnowhere', ['nothing,nowhere.', 'nothing nowhere']],
  ['slaves', ['Rain City Drive']],
  ['machine gun kelly', ['mgk']],
  ['mgk', ['machine gun kelly']],
  // Spotify transliterates Hebrew band names; MusicBrainz indexes the originals.
  ['hayehudim', ['היהודים']],
  ['girafot', ['גירפות', "ג'ירפות"]],
]);

const ARTIST_KNOWLEDGE_OVERRIDES = new Map([
  ['odeon', {
    skipMusicBrainz: true,
    curated: {
      name: 'Odeon',
      sourceName: 'Bandcamp / setlist.fm',
      sourceUrls: [
        'https://odeonsounds.bandcamp.com/album/game-2',
        'https://odeonsounds.bandcamp.com/track/swipe-up',
        'https://www.setlist.fm/setlists/odeon-5bd2b7e8.html',
      ],
      origin: 'Rio de Janeiro, Brazil',
      country: 'Brazil',
      description: 'Brazilian post-hardcore/electronic project with a visible Bandcamp catalog and live setlists in Brazil.',
      background: 'The local archive centers on game, loop, swipe up and dream, which point to a digital DIY alternative sound rather than the unrelated Italian electronic producer returned by broad MusicBrainz search.',
      tags: ['Brazilian alternative', 'post-hardcore', 'electronic rock', 'digital DIY', 'emo pop'],
      activeYears: ['2021'],
    },
    releaseGroups: [
      {
        id: 'curated-odeon-game',
        title: 'game',
        primaryType: 'Album',
        firstReleaseDate: '2022-09-09',
      },
    ],
  }],
]);

const COUNTRY_SYNONYMS = new Map([
  ['australia', ['au']],
  ['canada', ['ca']],
  ['france', ['fr']],
  ['germany', ['de']],
  ['israel', ['il']],
  ['japan', ['jp']],
  ['sweden', ['se']],
  ['united kingdom', ['gb', 'uk', 'england', 'scotland', 'wales']],
  ['united states', ['us', 'usa', 'united states of america']],
]);

const GENRE_KEYWORDS = [
  'alternative rock',
  'ambient',
  'blackgaze',
  'deathcore',
  'djent',
  'dream pop',
  'electronic',
  'emo',
  'hardcore',
  'hip hop',
  'industrial',
  'metalcore',
  'pop punk',
  'post hardcore',
  'post rock',
  'progressive metal',
  'reggae',
  'shoegaze',
  'synth',
];

const args = new Map(
  process.argv.slice(2).map(arg => {
    const [rawKey, ...rest] = arg.replace(/^--/, '').split('=');
    return [rawKey, rest.length ? rest.join('=') : 'true'];
  }),
);

const limitArg = args.get('limit');
const onlyArtist = args.get('artist');
const limit = limitArg && limitArg !== 'true' ? Number(limitArg) : undefined;

function normalizeCatalogName(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/&/g, 'and')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

function cacheName(url) {
  return `${Buffer.from(url).toString('base64url')}.json`;
}

function cacheHash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(message) {
  process.stdout.write(`${message}\n`);
}

async function fetchJson(url) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, cacheName(url));

  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  fs.writeFileSync(cachePath, JSON.stringify(json, null, 2));
  await sleep(REQUEST_DELAY_MS);
  return json;
}

async function fetchCachedJson(cacheKey, request) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, `${cacheKey}.json`);

  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }

  const json = await request();
  fs.writeFileSync(cachePath, JSON.stringify(json, null, 2));
  await sleep(REQUEST_DELAY_MS);
  return json;
}

function musicBrainzUrl(entity, params) {
  return `${MUSICBRAINZ_BASE}/${entity}?${new URLSearchParams({ ...params, fmt: 'json' })}`;
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter(item => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function artistSearchTerms(artist) {
  const normalized = normalizeCatalogName(artist.name);
  return Array.from(new Set([
    artist.name,
    ...(ARTIST_QUERY_ALIASES.get(normalized) ?? []),
  ]));
}

function normalizedCountryValues(country) {
  const normalized = normalizeCatalogName(country);
  return new Set([
    normalized,
    ...(COUNTRY_SYNONYMS.get(normalized) ?? []),
  ]);
}

function hasCountryMatch(candidate, artist) {
  const wantedCountries = normalizedCountryValues(artist.country);
  const candidateCountries = [
    candidate.country,
    candidate.area?.name,
    candidate['begin-area']?.name,
  ].map(normalizeCatalogName);

  return candidateCountries.some(country => wantedCountries.has(country));
}

function hasGenreSignal(candidate, artist) {
  const archiveGenre = normalizeCatalogName(artist.genre);
  const candidateText = normalizeCatalogName([
    candidate.disambiguation,
    candidate.type,
    candidate.area?.name,
    candidate['begin-area']?.name,
    ...(candidate.tags ?? []).map(tag => tag.name),
    ...(candidate.aliases ?? []).map(alias => alias.name),
  ].filter(Boolean).join(' '));

  return GENRE_KEYWORDS.some(keyword => archiveGenre.includes(keyword) && candidateText.includes(keyword));
}

function scoreArtistCandidate(candidate, artist) {
  const wanted = normalizeCatalogName(artist.name);
  const candidateName = normalizeCatalogName(candidate.name ?? '');
  const sortName = normalizeCatalogName(candidate['sort-name'] ?? '');
  const aliases = (candidate.aliases ?? []).map(alias => normalizeCatalogName(alias.name ?? ''));
  const exactName = candidateName === wanted || sortName === wanted;
  const aliasMatch = aliases.includes(wanted);
  const countryMatch = hasCountryMatch(candidate, artist);
  const genreMatch = hasGenreSignal(candidate, artist);
  const tagMatch = (candidate.tags ?? []).some(tag => normalizeCatalogName(artist.genre).includes(normalizeCatalogName(tag.name ?? '')));

  return (Number(candidate.score) || 0)
    + (exactName ? 80 : 0)
    + (aliasMatch ? 75 : 0)
    + (countryMatch ? 10 : 0)
    + (genreMatch ? 12 : 0)
    + (tagMatch ? 8 : 0)
    + (candidate.type === 'Group' || candidate.type === 'Person' ? 4 : 0);
}

async function findMusicBrainzArtist(artist) {
  const candidates = [];

  for (const term of artistSearchTerms(artist)) {
    const exactQuery = `artist:"${term.replaceAll('"', '')}"`;
    const json = await fetchJson(musicBrainzUrl('artist', {
      query: exactQuery,
      limit: '5',
    }));
    candidates.push(...(json.artists ?? []));
  }

  const uniqueCandidates = uniqueById(candidates);
  if (!uniqueCandidates.length) return undefined;

  return uniqueCandidates
    .map(candidate => ({ candidate, score: scoreArtistCandidate(candidate, artist) }))
    .sort((a, b) => b.score - a.score)[0]?.candidate;
}

async function fetchReleaseGroups(artistId) {
  const json = await fetchJson(musicBrainzUrl('release-group', {
    artist: artistId,
    type: 'album',
    limit: '25',
  }));

  return (json['release-groups'] ?? [])
    .filter(group => group['primary-type'] === 'Album')
    .map(group => ({
      id: group.id,
      title: group.title,
      primaryType: group['primary-type'] ?? 'Album',
      firstReleaseDate: group['first-release-date'] || undefined,
    }))
    .sort((a, b) => String(a.firstReleaseDate ?? '9999').localeCompare(String(b.firstReleaseDate ?? '9999')));
}

function compactMusicBrainzArtist(candidate) {
  if (!candidate) return undefined;

  return {
    id: candidate.id,
    score: Number(candidate.score) || 0,
    name: candidate.name,
    sortName: candidate['sort-name'],
    type: candidate.type,
    country: candidate.country,
    area: candidate.area?.name,
    beginArea: candidate['begin-area']?.name,
    lifeSpanBegin: candidate['life-span']?.begin,
    lifeSpanEnd: candidate['life-span']?.end,
    ended: Boolean(candidate['life-span']?.ended),
    disambiguation: candidate.disambiguation,
    aliases: Array.from(new Set((candidate.aliases ?? [])
      .map(alias => alias.name)
      .filter(Boolean)
      .slice(0, 12))),
    tags: Array.from(new Set((candidate.tags ?? [])
      .sort((a, b) => Math.abs(Number(b.count) || 0) - Math.abs(Number(a.count) || 0))
      .map(tag => tag.name)
      .filter(Boolean)
      .slice(0, 18))),
    isnis: candidate.isnis ?? [],
  };
}

function bindingValue(binding, key) {
  return binding?.[key]?.value || undefined;
}

function splitPipeList(value) {
  return Array.from(new Set(String(value || '')
    .split('|')
    .map(item => item.trim())
    .filter(Boolean)));
}

function wikidataEntityId(uri) {
  return String(uri || '').split('/').pop();
}

function compactWikidataBinding(binding) {
  const itemUrl = bindingValue(binding, 'item');
  if (!itemUrl) return undefined;

  return {
    id: wikidataEntityId(itemUrl),
    url: itemUrl.replace('http://', 'https://'),
    label: bindingValue(binding, 'itemLabel'),
    description: bindingValue(binding, 'itemDescription'),
    genres: splitPipeList(bindingValue(binding, 'genres')).slice(0, 12),
    countries: splitPipeList(bindingValue(binding, 'countries')).slice(0, 8),
    formationPlaces: splitPipeList(bindingValue(binding, 'formationPlaces')).slice(0, 8),
    recordLabels: splitPipeList(bindingValue(binding, 'recordLabels')).slice(0, 10),
    members: splitPipeList(bindingValue(binding, 'members')).slice(0, 14),
    occupations: splitPipeList(bindingValue(binding, 'occupations')).slice(0, 10),
    instruments: splitPipeList(bindingValue(binding, 'instruments')).slice(0, 10),
    instanceOf: splitPipeList(bindingValue(binding, 'instanceOf')).slice(0, 8),
    officialWebsites: splitPipeList(bindingValue(binding, 'officialWebsites')).slice(0, 5),
    images: splitPipeList(bindingValue(binding, 'images')).slice(0, 3),
    inception: bindingValue(binding, 'inception')?.slice(0, 10),
    birthDate: bindingValue(binding, 'birthDate')?.slice(0, 10),
  };
}

function wikidataQueryForMbids(mbids) {
  const values = mbids.map(mbid => `"${mbid.replaceAll('"', '')}"`).join(' ');

  return `
SELECT ?mbid ?item ?itemLabel ?itemDescription
       (GROUP_CONCAT(DISTINCT ?genreLabel; separator="|") AS ?genres)
       (GROUP_CONCAT(DISTINCT ?countryLabel; separator="|") AS ?countries)
       (GROUP_CONCAT(DISTINCT ?formationPlaceLabel; separator="|") AS ?formationPlaces)
       (GROUP_CONCAT(DISTINCT ?recordLabelLabel; separator="|") AS ?recordLabels)
       (GROUP_CONCAT(DISTINCT ?memberLabel; separator="|") AS ?members)
       (GROUP_CONCAT(DISTINCT ?occupationLabel; separator="|") AS ?occupations)
       (GROUP_CONCAT(DISTINCT ?instrumentLabel; separator="|") AS ?instruments)
       (GROUP_CONCAT(DISTINCT ?instanceLabel; separator="|") AS ?instanceOf)
       (GROUP_CONCAT(DISTINCT STR(?officialWebsite); separator="|") AS ?officialWebsites)
       (GROUP_CONCAT(DISTINCT STR(?image); separator="|") AS ?images)
       (MIN(?inceptionValue) AS ?inception)
       (MIN(?birthDateValue) AS ?birthDate)
WHERE {
  VALUES ?mbid { ${values} }
  ?item wdt:P434 ?mbid.
  OPTIONAL { ?item wdt:P136 ?genre. ?genre rdfs:label ?genreLabel. FILTER(LANG(?genreLabel) = "en") }
  OPTIONAL { { ?item wdt:P495 ?country. } UNION { ?item wdt:P27 ?country. } ?country rdfs:label ?countryLabel. FILTER(LANG(?countryLabel) = "en") }
  OPTIONAL { ?item wdt:P740 ?formationPlace. ?formationPlace rdfs:label ?formationPlaceLabel. FILTER(LANG(?formationPlaceLabel) = "en") }
  OPTIONAL { ?item wdt:P264 ?recordLabel. ?recordLabel rdfs:label ?recordLabelLabel. FILTER(LANG(?recordLabelLabel) = "en") }
  OPTIONAL { ?item wdt:P527 ?member. ?member rdfs:label ?memberLabel. FILTER(LANG(?memberLabel) = "en") }
  OPTIONAL { ?item wdt:P106 ?occupation. ?occupation rdfs:label ?occupationLabel. FILTER(LANG(?occupationLabel) = "en") }
  OPTIONAL { ?item wdt:P1303 ?instrument. ?instrument rdfs:label ?instrumentLabel. FILTER(LANG(?instrumentLabel) = "en") }
  OPTIONAL { ?item wdt:P31 ?instance. ?instance rdfs:label ?instanceLabel. FILTER(LANG(?instanceLabel) = "en") }
  OPTIONAL { ?item wdt:P856 ?officialWebsite. }
  OPTIONAL { ?item wdt:P18 ?image. }
  OPTIONAL { ?item wdt:P571 ?inceptionValue. }
  OPTIONAL { ?item wdt:P569 ?birthDateValue. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es". }
}
GROUP BY ?mbid ?item ?itemLabel ?itemDescription
`;
}

async function fetchWikidataByMbids(mbids) {
  const map = new Map();
  const uniqueMbids = Array.from(new Set(mbids.filter(Boolean)));

  for (let index = 0; index < uniqueMbids.length; index += WIKIDATA_BATCH_SIZE) {
    const batch = uniqueMbids.slice(index, index + WIKIDATA_BATCH_SIZE);
    const query = wikidataQueryForMbids(batch);
    const cacheKey = `wikidata-sparql-${cacheHash(query)}`;
    const json = await fetchCachedJson(cacheKey, async () => {
      const response = await fetch(`${WIKIDATA_SPARQL_URL}?${new URLSearchParams({ query, format: 'json' })}`, {
        headers: {
          Accept: 'application/sparql-results+json',
          'User-Agent': USER_AGENT,
        },
      });

      if (!response.ok) {
        throw new Error(`Wikidata ${response.status} ${response.statusText}`);
      }

      return response.json();
    });

    for (const binding of json.results?.bindings ?? []) {
      const mbid = bindingValue(binding, 'mbid');
      const wikidata = compactWikidataBinding(binding);
      if (mbid && wikidata && !map.has(mbid)) {
        map.set(mbid, wikidata);
      }
    }
  }

  return map;
}

function topArchiveItems(items, key, artistName, limit = 5) {
  return items
    .filter(item => normalizeCatalogName(item.artist) === normalizeCatalogName(artistName))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, limit)
    .map(item => item[key]);
}

function buildEmotionalSeeds(archiveArtist, mbArtist, wikidata, releaseGroups, curated) {
  const tags = Array.from(new Set([
    archiveArtist.genre,
    ...(mbArtist?.tags ?? []),
    ...(wikidata?.genres ?? []),
    ...(curated?.tags ?? []),
  ].filter(Boolean)));
  const activeYears = [
    mbArtist?.lifeSpanBegin?.slice(0, 4),
    mbArtist?.lifeSpanEnd?.slice(0, 4),
    wikidata?.inception?.slice(0, 4),
    wikidata?.birthDate?.slice(0, 4),
    ...(curated?.activeYears ?? []),
  ].filter(Boolean);
  const releaseYears = Array.from(new Set(
    releaseGroups
      .map(group => Number(group.firstReleaseDate?.slice(0, 4)))
      .filter(Boolean),
  )).sort((a, b) => a - b);

  return {
    sourceText: [
      archiveArtist.name,
      archiveArtist.genre,
      archiveArtist.country,
      mbArtist?.type,
      mbArtist?.area,
      mbArtist?.beginArea,
      mbArtist?.disambiguation,
      wikidata?.label,
      wikidata?.description,
      curated?.name,
      curated?.origin,
      curated?.country,
      curated?.description,
      curated?.background,
      ...(wikidata?.countries ?? []),
      ...(wikidata?.formationPlaces ?? []),
      ...(wikidata?.recordLabels ?? []),
      ...(wikidata?.members ?? []),
      ...(wikidata?.occupations ?? []),
      ...(wikidata?.instruments ?? []),
      ...(wikidata?.instanceOf ?? []),
      ...tags,
      ...releaseGroups.slice(0, 12).map(group => group.title),
    ].filter(Boolean).join(' '),
    tags,
    activeYears,
    releaseYears,
  };
}

async function buildArtistKnowledge(artist, rank, data, wikidataMap) {
  const errors = [];
  const override = ARTIST_KNOWLEDGE_OVERRIDES.get(normalizeCatalogName(artist.name));
  let candidate;
  let musicbrainz;
  let releaseGroups = override?.releaseGroups ?? [];

  if (!override?.skipMusicBrainz) {
    try {
      candidate = await findMusicBrainzArtist(artist);
      musicbrainz = compactMusicBrainzArtist(candidate);
    } catch (error) {
      errors.push(`artist search: ${error.message}`);
    }
  }

  if (musicbrainz?.id) {
    try {
      releaseGroups = await fetchReleaseGroups(musicbrainz.id);
    } catch (error) {
      errors.push(`release-groups: ${error.message}`);
    }
  }

  const wikidata = musicbrainz?.id ? wikidataMap.get(musicbrainz.id) : undefined;
  const curated = override?.curated;

  return {
    name: artist.name,
    normalizedName: normalizeCatalogName(artist.name),
    archive: {
      rank,
      plays: artist.plays,
      genre: artist.genre,
      country: artist.country,
      topTracks: topArchiveItems(data.top_tracks, 'title', artist.name),
      topAlbums: topArchiveItems(data.top_albums, 'title', artist.name),
    },
    musicbrainz,
    wikidata,
    curated,
    releaseGroups,
    emotionalSeeds: buildEmotionalSeeds(artist, musicbrainz, wikidata, releaseGroups, curated),
    fetchStatus: musicbrainz || curated ? 'matched' : errors.length ? 'error' : 'not_found',
    ...(errors.length ? { errors } : {}),
  };
}

async function main() {
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const selectedArtists = data.top_artists
    .filter(artist => !onlyArtist || normalizeCatalogName(artist.name) === normalizeCatalogName(onlyArtist))
    .slice(0, limit || data.top_artists.length);

  log(`Building offline knowledge for ${selectedArtists.length} artist(s).`);
  const partialArtists = [];

  for (const [index, artist] of selectedArtists.entries()) {
    log(`[${index + 1}/${selectedArtists.length}] ${artist.name}`);
    partialArtists.push(await buildArtistKnowledge(artist, index + 1, data, new Map()));
  }

  const mbids = partialArtists.map(artist => artist.musicbrainz?.id).filter(Boolean);
  log(`Fetching Wikidata facts for ${mbids.length} MusicBrainz artist ID(s).`);
  const wikidataMap = await fetchWikidataByMbids(mbids);
  const artists = partialArtists.map(artist => {
    const wikidata = artist.musicbrainz?.id ? wikidataMap.get(artist.musicbrainz.id) : undefined;

    return {
      ...artist,
      wikidata,
      emotionalSeeds: buildEmotionalSeeds(
        {
          name: artist.name,
          genre: artist.archive.genre,
          country: artist.archive.country,
        },
        artist.musicbrainz,
        wikidata,
        artist.releaseGroups,
        artist.curated,
      ),
    };
  });

  const database = {
    meta: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      artistCount: artists.length,
      sources: [
        {
          name: 'MusicBrainz',
          url: 'https://musicbrainz.org/doc/MusicBrainz_Database',
          licenseNote: 'Core database data is CC0; supplemental data can have additional license considerations.',
        },
        {
          name: 'Wikidata',
          url: 'https://www.wikidata.org/wiki/Wikidata:Database_download',
          licenseNote: 'Structured data is available under CC0; media and text outside structured statements can use other licenses.',
        },
        {
          name: 'Curated public links',
          url: 'https://odeonsounds.bandcamp.com/album/game-2',
          licenseNote: 'Used only for compact factual correction links and original local prose; no copied biography text is bundled.',
        },
      ],
      notes: [
        'This compact file is generated for the artists present in the local archive, not for every artist in the world.',
        'Do not store copied biographies from copyrighted pages here. Store structured identifiers, tags, dates, aliases, source links and release metadata, then generate original prose locally.',
        'Generated with a 1-request-per-second MusicBrainz-safe delay, batched Wikidata SPARQL lookups and local cache under scripts/.cache.',
      ],
    },
    artists,
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(database, null, 2)}\n`);
  log(`Wrote ${path.relative(root, outputPath)} with ${artists.length} artist(s).`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
