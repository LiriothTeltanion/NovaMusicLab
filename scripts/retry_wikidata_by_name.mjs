/**
 * Second-chance Wikidata match for artists whose entity is missing the
 * MusicBrainz-ID backlink (P434) that the main SPARQL-by-mbid pass in
 * build_offline_artist_knowledge.mjs relies on. Searches Wikidata by name
 * instead, verifies the candidate is actually music-related (P31 instance-of
 * a band/group type, or P106 occupation is a musician-type for a human
 * entity) before accepting it - a same-named unrelated entity would be worse
 * than no match at all.
 *
 * Only fills the `wikidata` field for artists that currently lack one;
 * never overwrites existing facts.
 *
 * Run from the repo root: node scripts/retry_wikidata_by_name.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KNOWLEDGE_PATH = join(ROOT, 'src', 'data', 'offline_artist_knowledge.json');
const CACHE_DIR = join(ROOT, 'scripts', '.cache', 'wikidata_by_name');
mkdirSync(CACHE_DIR, { recursive: true });

const UA = 'NovaMusicLab/1.0 (https://github.com/kevincusnir/nova-music-lab; kevincusnir@gmail.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BAND_TYPES = new Set(['Q215380', 'Q2088357', 'Q5741069', 'Q1249737', 'Q125191']); // musical group / ensemble / rock band / musical duo / hip hop group
const MUSICIAN_OCCUPATIONS = new Set(['Q639669', 'Q177220', 'Q36834', 'Q488205', 'Q713200', 'Q130857', 'Q855091']); // musician/singer/composer/singer-songwriter/rapper/DJ/guitarist

function cacheKey(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 80);
}

function cacheGet(key) {
  const file = join(CACHE_DIR, `${key}.json`);
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}

function cachePut(key, value) {
  writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify(value));
}

async function fetchJson(url, key) {
  const cached = key ? cacheGet(key) : null;
  if (cached) return { json: cached, fromCache: true };
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status}`);
  const json = await res.json();
  if (key) cachePut(key, json);
  return { json, fromCache: false };
}

async function searchCandidates(name) {
  const key = `search-${cacheKey(name)}`;
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&limit=5&format=json`;
  const { json, fromCache } = await fetchJson(url, key);
  if (!fromCache) await sleep(300);
  return (json.search ?? []).map((r) => r.id);
}

async function verifyAndFetchClaims(qids) {
  if (!qids.length) return new Map();
  const key = `claims-${cacheKey(qids.join('_'))}`;
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join('|')}&props=claims&format=json`;
  const { json, fromCache } = await fetchJson(url, key);
  if (!fromCache) await sleep(300);
  const map = new Map();
  for (const [qid, entity] of Object.entries(json.entities ?? {})) {
    const instanceOf = (entity.claims?.P31 ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
    const occupations = (entity.claims?.P106 ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
    const isMusicRelated = instanceOf.some((id) => BAND_TYPES.has(id)) || occupations.some((id) => MUSICIAN_OCCUPATIONS.has(id));
    map.set(qid, isMusicRelated);
  }
  return map;
}

function splitPipeList(value) {
  return Array.from(new Set(String(value || '').split('|').map((s) => s.trim()).filter(Boolean)));
}

function bindingValue(binding, key) {
  return binding?.[key]?.value || undefined;
}

function compactWikidataBinding(binding) {
  const itemUrl = bindingValue(binding, 'item');
  if (!itemUrl) return undefined;
  return {
    id: String(itemUrl).split('/').pop(),
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

function factsQueryForQid(qid) {
  return `
SELECT ?item ?itemLabel ?itemDescription
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
  BIND(wd:${qid} AS ?item)
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
GROUP BY ?item ?itemLabel ?itemDescription
`;
}

async function fetchFactsForQid(qid) {
  const key = `facts-${qid}`;
  const query = factsQueryForQid(qid);
  const url = `https://query.wikidata.org/sparql?${new URLSearchParams({ query, format: 'json' })}`;
  const { json, fromCache } = await fetchJson(url, key);
  if (!fromCache) await sleep(500);
  const binding = json.results?.bindings?.[0];
  return binding ? compactWikidataBinding(binding) : undefined;
}

const knowledge = JSON.parse(readFileSync(KNOWLEDGE_PATH, 'utf8'));
const targets = knowledge.artists.filter((a) => !a.wikidata?.id);
console.log(`Retrying name-based Wikidata match for ${targets.length} artists without a QID...`);

let matched = 0;
for (const artist of targets) {
  const baseNames = [artist.name, artist.musicbrainz?.name, ...(artist.musicbrainz?.aliases ?? [])].filter(Boolean);
  const searchNames = [...baseNames];
  for (const n of baseNames) {
    searchNames.push(`${n} (band)`, `${n} (musician)`, `${n} (music duo)`);
  }
  let acceptedQid = null;

  for (const name of new Set(searchNames)) {
    const candidates = await searchCandidates(name);
    if (!candidates.length) continue;
    const verdicts = await verifyAndFetchClaims(candidates);
    acceptedQid = candidates.find((qid) => verdicts.get(qid)) ?? null;
    if (acceptedQid) break;
  }

  if (!acceptedQid) {
    console.log(`  miss  ${artist.name}`);
    continue;
  }

  const facts = await fetchFactsForQid(acceptedQid);
  if (facts?.id) {
    artist.wikidata = facts;
    matched++;
    console.log(`  match ${artist.name} -> ${facts.id} (${facts.description ?? 'no description'})`);
  } else {
    console.log(`  miss  ${artist.name} (verified type but no facts returned)`);
  }
}

writeFileSync(KNOWLEDGE_PATH, `${JSON.stringify(knowledge, null, 2)}\n`);
console.log(`\nMatched ${matched}/${targets.length} additional Wikidata profiles.`);
