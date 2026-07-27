/**
 * Automatically fetch high-quality member portrait thumbnails from the
 * Wikipedia PageImages API for the band members of Kevin's top artists.
 *
 * Caches responses in scripts/.cache/member_images to prevent redundant API queries.
 *
 * Usage: node scripts/fetch_member_photos.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  cacheKeyFor,
  looksLikePortrait,
  mediaKey as memberKey,
} from './lib/commonsPortraits.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KNOWLEDGE_PATH = join(ROOT, 'src', 'data', 'offline_artist_knowledge.json');
const COMPILED_PATH = join(ROOT, 'src', 'data', 'music_dna_compiled.json');
const OUTPUT_PATH = join(ROOT, 'src', 'data', 'member_images.json');
const RESIDUE_PATH = join(ROOT, 'scripts', 'member_photo_residue.json');
const CACHE_DIR = join(ROOT, 'scripts', '.cache', 'member_images');
mkdirSync(CACHE_DIR, { recursive: true });

const UA = 'NovaMusicLab/1.0 (+https://github.com/LiriothTeltanion/NovaMusicLab)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Bump this whenever a provider is added to or reordered in resolvePortrait(),
// so previously cached misses are re-checked against the new sources instead of
// being trusted forever.
const SOURCE_WATERFALL_VERSION = 3;
const WIKIPEDIA_DELAY_MS = 250;
const COMMONS_DELAY_MS = 350;
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp)$/i;

// An exact-title Wikipedia lookup can land on a same-named unrelated page
// (a book, ship, place, historical figure...) - "James Monteith" resolved to
// an 1876 geography textbook this way. Reject descriptions that clearly
// aren't a living/recent person before accepting the thumbnail.
const NON_PERSON_HINTS = [
  'book', 'textbook', 'novel', 'film', 'movie', 'album', '(disambiguation)',
  'ship', 'county', 'village', 'town', 'river', 'mountain', 'list of',
  'company', 'publisher', 'newspaper', 'magazine', 'building', 'school district',
];
function looksLikeAPerson(description) {
  if (!description) return true; // no description to go on - don't block on absence alone
  const lower = description.toLowerCase();
  return !NON_PERSON_HINTS.some((hint) => lower.includes(hint));
}

function cacheGet(key) {
  const file = join(CACHE_DIR, `${key}.json`);
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}

function cachePut(key, value) {
  writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify(value));
}

// 1. Load active member_images or default to empty
let memberImages = {};
if (existsSync(OUTPUT_PATH)) {
  try {
    memberImages = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'));
  } catch {
    memberImages = {};
  }
}

// 2. Read top artists from the compiled music DNA.
// This used to stop at the top 50, which left 193 member records across ranks
// 51-100 never scanned even once (0.5% photographed vs 36% in the top 50).
// The whole top 100 is in scope.
const compiled = JSON.parse(readFileSync(COMPILED_PATH, 'utf8'));
const TOP_ARTIST_LIMIT = 100;
const topArtistNames = new Set(
  compiled.top_artists.slice(0, TOP_ARTIST_LIMIT).map((a) => memberKey(a.name)),
);

// 3. Find unique band members of these top artists
const knowledge = JSON.parse(readFileSync(KNOWLEDGE_PATH, 'utf8'));
const targetMembers = new Set();

// Remember which band each member belongs to: the Commons search step needs it
// to disambiguate a common name, and the residue report is only actionable if it
// says which band the missing person plays in.
const memberBands = new Map();

for (const artist of knowledge.artists) {
  if (topArtistNames.has(memberKey(artist.name))) {
    for (const member of artist.bandMembers ?? []) {
      targetMembers.add(member.name);
      if (!memberBands.has(memberKey(member.name))) {
        memberBands.set(memberKey(member.name), artist.name);
      }
    }
  }
}

console.log(
  `Found ${targetMembers.size} unique members across your top ${TOP_ARTIST_LIMIT} artists.`,
);

/**
 * Source waterfall. Tries each provider in order and stops at the first
 * candidate that survives the person/portrait filters and an HTTP HEAD check.
 * Every URL is verified before it is written, matching build_artist_gallery.mjs
 * - "audit the final output instead of trusting fetch success".
 */
async function resolvePortrait(memberName, band) {
  // 1. Wikipedia PageImages - the lead image of the person's own article.
  const wiki = await fromWikipediaPageImage(memberName);
  if (wiki && await urlIsLive(wiki)) return { url: wiki, source: 'wikipedia-pageimage' };
  await sleep(WIKIPEDIA_DELAY_MS);

  // 2. Commons "Category:<Person name>" - the largest untapped source. This
  // technique already powers expand_artist_gallery_v2.mjs for bands but has
  // never been pointed at individual members.
  const category = await fromCommonsCategory(memberName);
  if (category && await urlIsLive(category)) return { url: category, source: 'commons-category' };
  await sleep(COMMONS_DELAY_MS);

  // 3. Commons free-text search, scoped by the band name so a same-named
  // stranger is far less likely to win.
  if (band) {
    const searched = await fromCommonsSearch(memberName, band);
    if (searched && await urlIsLive(searched)) return { url: searched, source: 'commons-search' };
    await sleep(COMMONS_DELAY_MS);
  }

  return { url: '', source: 'none', reason: 'no free-licensed portrait found in Wikipedia or Commons' };
}

async function fromWikipediaPageImage(memberName) {
  const url = 'https://en.wikipedia.org/w/api.php?action=query&prop=pageimages|pageterms'
    + '&format=json&piprop=thumbnail&pithumbsize=400&wbptterms=description'
    + `&titles=${encodeURIComponent(memberName)}`;
  const data = await fetchJson(url);
  for (const page of Object.values(data?.query?.pages ?? {})) {
    const description = page.terms?.description?.[0];
    if (!page.thumbnail?.source) continue;
    if (!looksLikeAPerson(description)) {
      console.log(`  -> Rejected Wikipedia candidate (description: "${description}").`);
      continue;
    }
    if (!looksLikePortrait(page.thumbnail.source)) continue;
    return page.thumbnail.source;
  }
  return '';
}

/**
 * Commons is keyword-matched, not identity-matched, so a bare name query
 * happily returns an Anglo-Saxon coin for "Darren White", a water balloon for
 * "Tension" and a Russian museum exhibit for "Taz". Requiring the person's name
 * to appear in the FILENAME is the cheap guard that makes Commons usable:
 * a wrong face is worse than no face.
 */
function namesThePerson(title, memberName) {
  const parts = foldName(memberName).split(' ').filter((part) => part.length > 2);
  if (!parts.length) return false;
  const haystack = foldName(decodeURIComponent(title));
  // Require the surname, and for a multi-word name require the forename too, so
  // "Nilsson" alone cannot claim a photo of a different Nilsson.
  const surname = parts[parts.length - 1];
  if (!haystack.includes(surname)) return false;
  if (parts.length === 1) return true;
  return haystack.includes(parts[0]);
}

/**
 * Fold accents AND punctuation to spaces before comparing. Wikimedia writes
 * "Paul Marc Rousseau" where MusicBrainz writes "Paul-Marc Rousseau" (with a
 * U+2010 hyphen, not an ASCII one), and a naive compare rejects his own photo.
 */
function foldName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function fromCommonsCategory(memberName) {
  const category = `Category:${memberName}`;
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers'
    + `&cmtitle=${encodeURIComponent(category)}&cmtype=file&cmlimit=30&format=json`;
  const data = await fetchJson(url);
  const files = (data?.query?.categorymembers ?? [])
    .map((entry) => entry.title)
    .filter((title) => IMAGE_EXTENSIONS.test(title) && looksLikePortrait(title))
    // A same-named category is not the same subject: Category:Taz is a Russian
    // museum, not the Santa Cruz bassist.
    .filter((title) => namesThePerson(title, memberName));
  return files.length ? commonsFilePath(files[0]) : '';
}

async function fromCommonsSearch(memberName, band) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6'
    + `&srsearch=${encodeURIComponent(`${memberName} ${band}`)}&srlimit=20&format=json`;
  const data = await fetchJson(url);
  const files = (data?.query?.search ?? [])
    .map((entry) => entry.title)
    .filter((title) => IMAGE_EXTENSIONS.test(title) && looksLikePortrait(title))
    .filter((title) => namesThePerson(title, memberName));
  return files.length ? commonsFilePath(files[0]) : '';
}

function commonsFilePath(title) {
  const file = title.replace(/^File:/, '');
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=400`;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** A dead URL written into the map renders as a broken image, so verify first. */
async function urlIsLive(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': UA }, redirect: 'follow' });
    return res.ok;
  } catch {
    return false;
  }
}

// 4. Resolve a portrait for every targeted member
let fetched = 0, cached = 0, skipped = 0;
const bySource = {};
const residue = [];

for (const memberName of targetMembers) {
  const key = memberKey(memberName);

  // Skip if we already have it in output to preserve manually added or previously fetched images
  if (memberImages[key]) {
    skipped++;
    continue;
  }

  const cKey = cacheKeyFor(memberName);
  const cachedVal = cacheGet(cKey);

  // A cached miss is only trustworthy if it was produced by the current set of
  // sources. Older caches recorded "not found" after trying Wikipedia alone, so
  // honouring them would make every newly added source dead on arrival. Bump
  // SOURCE_WATERFALL_VERSION whenever a source is added to force a re-check.
  const cacheIsCurrent = cachedVal !== null
    && typeof cachedVal === 'object'
    && cachedVal.waterfall === SOURCE_WATERFALL_VERSION;

  if (cacheIsCurrent) {
    if (cachedVal.url) {
      memberImages[key] = cachedVal.url;
    }
    cached++;
    continue;
  }

  try {
    console.log(`Fetching photo for: ${memberName}...`);
    const band = memberBands.get(key);
    const found = await resolvePortrait(memberName, band);

    cachePut(cKey, { waterfall: SOURCE_WATERFALL_VERSION, url: found.url, source: found.source });
    if (found.url) {
      memberImages[key] = found.url;
      bySource[found.source] = (bySource[found.source] ?? 0) + 1;
      console.log(`  -> Found portrait via ${found.source}: ${found.url}`);
    } else {
      residue.push({ name: memberName, band: band ?? '(unknown band)', reason: found.reason });
      console.log(`  -> No portrait found (${found.reason}).`);
    }

    fetched++;
  } catch (err) {
    console.warn(`  -> Failed fetching ${memberName}: ${err.message}`);
    residue.push({ name: memberName, band: memberBands.get(key) ?? '(unknown band)', reason: `error: ${err.message}` });
    // Sleep on the error path too, so a failing provider cannot turn into a hot loop.
    await sleep(WIKIPEDIA_DELAY_MS);
  }
}

// 5. Write updated images database
writeFileSync(OUTPUT_PATH, `${JSON.stringify(memberImages, null, 2)}\n`);

// 6. Write the honest residue: every member we could not find a free portrait
// for, with the reason. This is a curation queue, not a failure log - some
// members genuinely have no free-licensed photo in the public record, and the
// UI shows an initials monogram rather than inventing a face.
writeFileSync(RESIDUE_PATH, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  waterfall: SOURCE_WATERFALL_VERSION,
  unresolvedCount: residue.length,
  members: residue.sort((a, b) => a.band.localeCompare(b.band) || a.name.localeCompare(b.name)),
}, null, 2)}\n`);

console.log(`\nAutomation Done:
- Skipped (already mapped): ${skipped}
- Resolved from cache: ${cached}
- Fetched live: ${fetched}
- Hits by source: ${JSON.stringify(bySource)}
- Unresolved (see ${RESIDUE_PATH}): ${residue.length}
- Total members mapped: ${Object.keys(memberImages).length}
`);
