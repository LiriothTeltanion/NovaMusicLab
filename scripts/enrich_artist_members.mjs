/**
 * Enrich offline_artist_knowledge.json with band lineups from MusicBrainz
 * artist-rels: member names, roles (instruments/vocals) and active years.
 * Much richer than the Wikidata member name lists (which stay untouched).
 *
 * Adds a `bandMembers` array per artist row:
 *   [{ name, roles: string[], begin, end, current }]
 *
 * Rate limit: 1 req/s with proper User-Agent; responses cache under
 * scripts/.cache/media_links (mb-rels-<mbid>.json) so re-runs are free.
 *
 * Usage: node scripts/enrich_artist_members.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KNOWLEDGE_PATH = join(ROOT, 'src', 'data', 'offline_artist_knowledge.json');
const CACHE_DIR = join(ROOT, 'scripts', '.cache', 'media_links');
mkdirSync(CACHE_DIR, { recursive: true });

const UA = 'NovaMusicLab/1.0 (https://github.com/kevincusnir/nova-music-lab; kevincusnir@gmail.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cacheGet(key) {
  const file = join(CACHE_DIR, `${key}.json`);
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}

function cachePut(key, value) {
  writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify(value));
}

async function fetchArtistRels(mbid) {
  const key = `mb-rels-${mbid}`;
  const cached = cacheGet(key);
  if (cached) return { json: cached, fromCache: true };
  const res = await fetch(
    `https://musicbrainz.org/ws/2/artist/${mbid}?inc=artist-rels&fmt=json`,
    { headers: { 'User-Agent': UA, Accept: 'application/json' } },
  );
  if (!res.ok) throw new Error(`${res.status}`);
  const json = await res.json();
  cachePut(key, json);
  return { json, fromCache: false };
}

const knowledge = JSON.parse(readFileSync(KNOWLEDGE_PATH, 'utf8'));
let enriched = 0, live = 0, totalMembers = 0;

for (const artist of knowledge.artists) {
  const mbid = artist.musicbrainz?.id;
  if (!mbid) continue;
  try {
    const { json, fromCache } = await fetchArtistRels(mbid);
    if (!fromCache) { live++; await sleep(1100); }

    const members = (json.relations ?? [])
      .filter((rel) => rel.type === 'member of band' && rel.artist?.name)
      .map((rel) => ({
        name: rel.artist.name,
        roles: (rel.attributes ?? []).filter((a) => a !== 'original'),
        begin: rel.begin || null,
        end: rel.end || null,
        current: !rel.ended,
      }));

    if (!members.length) continue;

    // Dedupe by name (same person can appear per-instrument): merge roles,
    // widen the active span, and stay "current" if any stint is open.
    const byName = new Map();
    for (const m of members) {
      const key = m.name.toLowerCase();
      const prev = byName.get(key);
      if (!prev) { byName.set(key, { ...m, roles: [...new Set(m.roles)] }); continue; }
      prev.roles = [...new Set([...prev.roles, ...m.roles])];
      if (m.begin && (!prev.begin || m.begin < prev.begin)) prev.begin = m.begin;
      if (!m.end) prev.end = null;
      else if (prev.end && m.end > prev.end) prev.end = m.end;
      prev.current = prev.current || m.current;
    }

    artist.bandMembers = [...byName.values()].sort((a, b) => {
      if (a.current !== b.current) return a.current ? -1 : 1;
      return (a.begin ?? '9999').localeCompare(b.begin ?? '9999');
    });
    enriched++;
    totalMembers += artist.bandMembers.length;
  } catch (err) {
    console.warn(`  rels miss ${artist.name}: ${err.message}`);
    await sleep(1100);
  }
}

writeFileSync(KNOWLEDGE_PATH, `${JSON.stringify(knowledge, null, 2)}\n`);
console.log(`Members: ${enriched} artists enriched, ${totalMembers} member rows (${live} live requests)`);
