// Dev-side band-member portrait resolution, keyed by MusicBrainz id.
//
// Why this pass exists: the earlier member scripts searched Wikipedia and
// Commons by NAME. That both misses people whose article title differs from
// their credited name and risks attaching the wrong face when two musicians
// share a name. Every member row now carries its own MusicBrainz id, and
// Wikidata indexes those under P434 - so this resolves the exact person.
//
// One batched SPARQL query covers ~150 members, instead of one HTTP round trip
// each, which is why this finishes in seconds where the name-based passes took
// many minutes.
//
// Merges into member_images.json. Existing entries are never overwritten.
// Results are baked into static JSON; the app itself never calls this at runtime.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src', 'data');
const CACHE_DIR = path.join(ROOT, 'scripts', '.cache', 'member_mbid');
const MEMBER_IMAGES_PATH = path.join(DATA, 'member_images.json');
const RESIDUE_PATH = path.join(ROOT, 'scripts', 'member_photo_residue.json');

const SPARQL_URL = 'https://query.wikidata.org/sparql';
const UA = 'NovaMusicLab/1.0 (+https://github.com/LiriothTeltanion/NovaMusicLab)';
const BATCH = 150;
const DELAY_MS = 1200;
const DRY_RUN = process.argv.includes('--dry-run');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => (s || '').normalize('NFC').trim().toLowerCase();

const knowledge = JSON.parse(fs.readFileSync(path.join(DATA, 'offline_artist_knowledge.json'), 'utf8'));
const memberImages = JSON.parse(fs.readFileSync(MEMBER_IMAGES_PATH, 'utf8'));
const enrichment = JSON.parse(fs.readFileSync(path.join(DATA, 'member_enrichment.json'), 'utf8'));
// Member ids live beside the scripts, not in src/data: carrying them in the
// shipped knowledge file cost the TopHistorico room 11 KB gzip, which it does
// not have. Produced by scripts/enrich_artist_members.mjs.
const MEMBER_MBIDS_PATH = path.join(ROOT, 'scripts', 'member_mbids.json');
const memberMbids = fs.existsSync(MEMBER_MBIDS_PATH)
  ? JSON.parse(fs.readFileSync(MEMBER_MBIDS_PATH, 'utf8'))
  : {};

const hasPhoto = key => Boolean(memberImages[key] || enrichment[key]?.photo);

// Collect every distinct member that still lacks a portrait but has an mbid.
const wanted = new Map(); // mbid -> { name, key, bands:Set }
for (const artist of knowledge.artists) {
  for (const member of artist.bandMembers ?? []) {
    const key = norm(member.name);
    const mbid = memberMbids[key];
    if (!mbid || hasPhoto(key)) continue;
    const existing = wanted.get(mbid);
    if (existing) { existing.bands.add(artist.name); continue; }
    wanted.set(mbid, { name: member.name, key, bands: new Set([artist.name]) });
  }
}

const mbids = [...wanted.keys()];
console.log('Member portraits by MusicBrainz id');
console.log(`  members missing a portrait : ${mbids.length}`);
if (DRY_RUN) { console.log('  --dry-run: no requests, no writes.'); process.exit(0); }
if (!mbids.length) { console.log('  nothing to do.'); process.exit(0); }

fs.mkdirSync(CACHE_DIR, { recursive: true });

/**
 * P434 is the MusicBrainz artist id on a Wikidata person.
 * P18 is their image; P373 is the Commons category we can mine as a fallback.
 */
function buildQuery(batch) {
  const values = batch.map(id => `"${id}"`).join(' ');
  return `SELECT ?mbid ?person ?image ?commonsCat WHERE {
  VALUES ?mbid { ${values} }
  ?person wdt:P434 ?mbid .
  OPTIONAL { ?person wdt:P18 ?image }
  OPTIONAL { ?person wdt:P373 ?commonsCat }
}`;
}

async function runSparql(query, batchIndex) {
  const cached = path.join(CACHE_DIR, `batch-${batchIndex}.json`);
  if (fs.existsSync(cached)) {
    return { rows: JSON.parse(fs.readFileSync(cached, 'utf8')), fromCache: true };
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(SPARQL_URL, {
        method: 'POST',
        headers: {
          'User-Agent': UA,
          Accept: 'application/sparql-results+json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ query }),
      });
      if (res.status === 429 || res.status === 503) {
        console.log(`    rate-limited (${res.status}), backing off 20s`);
        await sleep(20000);
        continue;
      }
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      const rows = json.results.bindings.map(b => ({
        mbid: b.mbid?.value ?? null,
        person: b.person?.value ?? null,
        image: b.image?.value ?? null,
        commonsCat: b.commonsCat?.value ?? null,
      }));
      fs.writeFileSync(cached, JSON.stringify(rows, null, 2));
      return { rows, fromCache: false };
    } catch (e) {
      console.log(`    query error: ${e.message}, retrying in 8s`);
      await sleep(8000);
    }
  }
  return { rows: [], fromCache: false };
}

/** Commons FilePath serves the original; ask for a sensible display width. */
function commonsThumb(imageUrl) {
  const file = decodeURIComponent(String(imageUrl).split('/').pop() ?? '');
  if (!file) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=400`;
}

let added = 0;
let matchedPerson = 0;
let batchIndex = 0;

for (let i = 0; i < mbids.length; i += BATCH) {
  const batch = mbids.slice(i, i + BATCH);
  const { rows, fromCache } = await runSparql(buildQuery(batch), batchIndex++);

  for (const row of rows) {
    const target = wanted.get(row.mbid);
    if (!target) continue;
    matchedPerson++;
    if (!row.image) continue;
    const url = commonsThumb(row.image);
    if (!url || memberImages[target.key]) continue;
    memberImages[target.key] = url;
    added++;
  }

  console.log(`  [batch ${batchIndex}] ${batch.length} ids · matched ${matchedPerson} · portraits ${added}`
    + (fromCache ? ' (cached)' : ''));
  if (!fromCache) await sleep(DELAY_MS);
}

const sorted = Object.fromEntries(Object.keys(memberImages).sort().map(k => [k, memberImages[k]]));
fs.writeFileSync(MEMBER_IMAGES_PATH, JSON.stringify(sorted, null, 2) + '\n');

// Rewrite the residue so it reflects reality after this pass.
const residue = [];
for (const [, t] of wanted) {
  if (memberImages[t.key]) continue;
  residue.push({
    name: t.name,
    bands: [...t.bands],
    reason: 'no Wikidata P18 portrait for this MusicBrainz id',
  });
}
fs.writeFileSync(RESIDUE_PATH, JSON.stringify(residue, null, 2) + '\n');

console.log(`\nDone.`);
console.log(`  resolved to a Wikidata person : ${matchedPerson}/${mbids.length}`);
console.log(`  portraits added               : ${added}`);
console.log(`  still without a portrait      : ${residue.length}`);
console.log(`  member_images.json            : ${Object.keys(sorted).length} keys`);
