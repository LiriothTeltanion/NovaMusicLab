/**
 * Query Wikidata API to fetch portraits, birthdates (age), and social/streaming links
 * for all band members of Kevin's top 50 artists.
 *
 * Caches Wikidata responses under scripts/.cache/wikidata_members.
 *
 * Usage: node scripts/enrich_members_wikidata.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KNOWLEDGE_PATH = join(ROOT, 'src', 'data', 'offline_artist_knowledge.json');
const COMPILED_PATH = join(ROOT, 'src', 'data', 'music_dna_compiled.json');
const OUTPUT_PATH = join(ROOT, 'src', 'data', 'member_enrichment.json');
const CACHE_DIR = join(ROOT, 'scripts', '.cache', 'wikidata_members');
mkdirSync(CACHE_DIR, { recursive: true });

const UA = 'NovaMusicLab/1.0 (https://github.com/kevincusnir/nova-music-lab; kevincusnir@gmail.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MUSICIAN_OCCUPATIONS = new Set([
  'Q639669', 'Q177220', 'Q36834', 'Q488205', 'Q713200', 'Q130857', 'Q855091', 'Q183945', 'Q207869'
]); // musician, singer, composer, singer-songwriter, rapper, DJ, guitarist, bassist, drummer

// A pure ASCII-strip cache key collapses any name written in a non-Latin
// script (Hebrew, etc.) to the same empty string, so two different people's
// lookups silently share one cache file and one gets the other's data. The
// hash suffix guarantees uniqueness regardless of script.
function cacheKey(name) {
  const ascii = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60);
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return `${ascii || 'x'}_${(hash >>> 0).toString(36)}`;
}

function cacheGet(key) {
  const file = join(CACHE_DIR, `${key}.json`);
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}

function cachePut(key, value) {
  writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify(value));
}

// Load existing database or initialize empty
let database = {};
if (existsSync(OUTPUT_PATH)) {
  try {
    database = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'));
  } catch {
    database = {};
  }
}

// Find top 50 artist names
const compiled = JSON.parse(readFileSync(COMPILED_PATH, 'utf8'));
const topArtistNames = new Set(compiled.top_artists.slice(0, 50).map((a) => a.name.toLowerCase()));

// Find unique band members
const knowledge = JSON.parse(readFileSync(KNOWLEDGE_PATH, 'utf8'));
const targetMembers = new Set();

for (const artist of knowledge.artists) {
  if (topArtistNames.has(artist.name.toLowerCase())) {
    for (const member of artist.bandMembers ?? []) {
      targetMembers.add(member.name);
    }
  }
}

console.log(`Analyzing ${targetMembers.size} unique members...`);

let fetched = 0, cached = 0;

for (const memberName of targetMembers) {
  const key = memberName.toLowerCase();
  
  // If already processed and has a verified search hit/miss, load from cache
  const cKey = cacheKey(memberName);
  const cachedVal = cacheGet(cKey);
  
  if (cachedVal !== null) {
    if (cachedVal.found) {
      database[key] = cachedVal.data;
    }
    cached++;
    continue;
  }

  try {
    console.log(`Enriching ${memberName}...`);
    // Search candidates
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(memberName)}&language=en&type=item&limit=5&format=json`;
    const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': UA } });
    if (!searchRes.ok) throw new Error(`HTTP search ${searchRes.status}`);
    const searchData = await searchRes.json();
    const qids = (searchData.search ?? []).map((r) => r.id);

    let resolvedData = null;

    if (qids.length) {
      // Fetch claims for candidates to inspect details
      const claimsUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join('|')}&props=claims|sitelinks&format=json`;
      const claimsRes = await fetch(claimsUrl, { headers: { 'User-Agent': UA } });
      if (!claimsRes.ok) throw new Error(`HTTP claims ${claimsRes.status}`);
      const claimsData = await claimsRes.json();

      for (const qid of qids) {
        const entity = claimsData.entities?.[qid];
        if (!entity) continue;

        // Check instance of Human (P31 -> Q5)
        const isHuman = (entity.claims?.P31 ?? []).some((c) => c.mainsnak?.datavalue?.value?.id === 'Q5');
        const occupations = (entity.claims?.P106 ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
        // Require an actual musician occupation - a same-named unrelated human
        // (accepted before whenever the search only returned one candidate)
        // is worse than leaving this member unresolved.
        const isMusician = isHuman && occupations.some((o) => MUSICIAN_OCCUPATIONS.has(o));

        if (isMusician) {
          // Extract Image (P18)
          const imgClaim = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
          const photo = imgClaim
            ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(imgClaim)}?width=300`
            : '';

          // Extract Birthdate (P569)
          const dobClaim = entity.claims?.P569?.[0]?.mainsnak?.datavalue?.value?.time;
          let birthDate = '';
          let age = null;
          if (dobClaim) {
            // format: "+1986-11-20T00:00:00Z"
            const match = dobClaim.match(/^\+?(\d{4}-\d{2}-\d{2})/);
            if (match) {
              birthDate = match[1];
              const birthYear = parseInt(birthDate.slice(0, 4));
              age = 2026 - birthYear; // Current year is 2026
            }
          }

          // Socials & Streaming Links
          const links = {};
          
          // Instagram (P2002)
          const ig = entity.claims?.P2002?.[0]?.mainsnak?.datavalue?.value;
          if (ig) links.instagram = `https://instagram.com/${ig}`;

          // Twitter (P2003)
          const twitter = entity.claims?.P2003?.[0]?.mainsnak?.datavalue?.value;
          if (twitter) links.twitter = `https://twitter.com/${twitter}`;

          // Spotify Artist ID (P1902)
          const spotify = entity.claims?.P1902?.[0]?.mainsnak?.datavalue?.value;
          if (spotify) links.spotify = `https://open.spotify.com/artist/${spotify}`;

          // Wikipedia English Sitelink
          const wikiEn = entity.sitelinks?.enwiki?.title;
          if (wikiEn) links.wikipedia = `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiEn.replace(/ /g, '_'))}`;

          resolvedData = {
            name: memberName,
            photo,
            birthDate,
            age,
            links
          };
          break; // Found our match, stop checking other candidates
        }
      }
    }

    cachePut(cKey, {
      found: Boolean(resolvedData),
      data: resolvedData
    });

    if (resolvedData) {
      database[key] = resolvedData;
      console.log(`  -> Matched! Age: ${resolvedData.age}, Photo: ${resolvedData.photo ? 'Yes' : 'No'}, Links: ${Object.keys(resolvedData.links).join(', ')}`);
    } else {
      console.log(`  -> Unresolved.`);
    }

    fetched++;
    await sleep(350); // Be polite to Wikidata API
  } catch (err) {
    console.error(`  -> Error processing ${memberName}: ${err.message}`);
    await sleep(350);
  }
}

// Write the database out
writeFileSync(OUTPUT_PATH, `${JSON.stringify(database, null, 2)}\n`);

console.log(`\nWikidata Member Enrichment Complete:
- Cached entities: ${cached}
- Fetched live: ${fetched}
- Total enriched profiles: ${Object.keys(database).length}
`);
