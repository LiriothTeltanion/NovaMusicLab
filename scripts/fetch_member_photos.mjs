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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KNOWLEDGE_PATH = join(ROOT, 'src', 'data', 'offline_artist_knowledge.json');
const COMPILED_PATH = join(ROOT, 'src', 'data', 'music_dna_compiled.json');
const OUTPUT_PATH = join(ROOT, 'src', 'data', 'member_images.json');
const CACHE_DIR = join(ROOT, 'scripts', '.cache', 'member_images');
mkdirSync(CACHE_DIR, { recursive: true });

const UA = 'NovaMusicLab/1.0 (https://github.com/kevincusnir/nova-music-lab; kevincusnir@gmail.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A pure ASCII-strip cache key collapses any name written in a non-Latin
// script to the same empty string, so two different people's lookups
// silently share one cache file. The hash suffix guarantees uniqueness.
function cacheKey(name) {
  const ascii = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60);
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return `${ascii || 'x'}_${(hash >>> 0).toString(36)}`;
}

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

// 2. Read top artists from the compiled music DNA
const compiled = JSON.parse(readFileSync(COMPILED_PATH, 'utf8'));
const topArtistNames = new Set(compiled.top_artists.slice(0, 30).map((a) => a.name.toLowerCase()));

// 3. Find unique band members of these top artists
const knowledge = JSON.parse(readFileSync(KNOWLEDGE_PATH, 'utf8'));
const targetMembers = new Set();

for (const artist of knowledge.artists) {
  if (topArtistNames.has(artist.name.toLowerCase())) {
    for (const member of artist.bandMembers ?? []) {
      targetMembers.add(member.name);
    }
  }
}

console.log(`Found ${targetMembers.size} unique members across your top 30 artists.`);

// 4. Batch query Wikipedia PageImages API
let fetched = 0, cached = 0, skipped = 0;

for (const memberName of targetMembers) {
  const key = memberName.toLowerCase();
  
  // Skip if we already have it in output to preserve manually added or previously fetched images
  if (memberImages[key]) {
    skipped++;
    continue;
  }

  const cKey = cacheKey(memberName);
  const cachedVal = cacheGet(cKey);

  if (cachedVal !== null) {
    if (cachedVal) {
      memberImages[key] = cachedVal;
    }
    cached++;
    continue;
  }

  try {
    console.log(`Fetching photo for: ${memberName}...`);
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages|pageterms&format=json&piprop=thumbnail&pithumbsize=300&wbptterms=description&titles=${encodeURIComponent(memberName)}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const pages = data?.query?.pages ?? {};
    let photoUrl = '';

    for (const page of Object.values(pages)) {
      const description = page.terms?.description?.[0];
      if (page.thumbnail?.source && looksLikeAPerson(description)) {
        photoUrl = page.thumbnail.source;
        break;
      }
      if (page.thumbnail?.source) {
        console.log(`  -> Rejected candidate (description: "${description}") - doesn't look like a person.`);
      }
    }

    cachePut(cKey, photoUrl);
    if (photoUrl) {
      memberImages[key] = photoUrl;
      console.log(`  -> Found portrait: ${photoUrl}`);
    } else {
      console.log(`  -> No portrait found.`);
    }

    fetched++;
    await sleep(250); // Be polite to Wikipedia API
  } catch (err) {
    console.warn(`  -> Failed fetching ${memberName}: ${err.message}`);
    await sleep(250);
  }
}

// 5. Write updated images database
writeFileSync(OUTPUT_PATH, `${JSON.stringify(memberImages, null, 2)}\n`);

console.log(`\nAutomation Done:
- Skipped (already mapped): ${skipped}
- Resolved from cache: ${cached}
- Fetched live from Wikipedia: ${fetched}
- Total members mapped: ${Object.keys(memberImages).length}
`);
