/**
 * Expand artist_media_links.json for every artist in the offline knowledge
 * base using authoritative open databases:
 *
 *   1. MusicBrainz url-rels (per MBID, 1 req/s, cached) → Spotify, YouTube,
 *      official homepage, Wikidata QID.
 *   2. Wikidata wbgetentities (batched 50/req) → P1902 Spotify ID, P2397
 *      YouTube channel, P856 official site, en/es Wikipedia sitelinks.
 *   3. Link check (GET, concurrency 6) → drops URLs that answer 404/410.
 *
 * Existing curated fields are never overwritten — only gaps are filled.
 * Re-runs are cheap: raw API responses cache under scripts/.cache/media_links.
 *
 * Usage: node scripts/expand_artist_media_links.mjs [--skip-check]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KNOWLEDGE_PATH = join(ROOT, 'src', 'data', 'offline_artist_knowledge.json');
const MEDIA_PATH = join(ROOT, 'src', 'data', 'artist_media_links.json');
const CACHE_DIR = join(ROOT, 'scripts', '.cache', 'media_links');
mkdirSync(CACHE_DIR, { recursive: true });

const SKIP_CHECK = process.argv.includes('--skip-check');
const UA = 'NovaMusicLab/1.0 (+https://github.com/LiriothTeltanion/NovaMusicLab)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cacheGet(key) {
  const file = join(CACHE_DIR, `${key}.json`);
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}

function cachePut(key, value) {
  writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify(value));
}

async function fetchJson(url, cacheKey) {
  const cached = cacheKey ? cacheGet(cacheKey) : null;
  if (cached) return { json: cached, fromCache: true };
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const json = await res.json();
  if (cacheKey) cachePut(cacheKey, json);
  return { json, fromCache: false };
}

/* ── 1. MusicBrainz url-rels ── */
async function fetchMusicBrainzRels(artists) {
  const out = new Map();
  let live = 0;
  for (const a of artists) {
    const mbid = a.musicbrainz?.id;
    if (!mbid) continue;
    try {
      const { json, fromCache } = await fetchJson(
        `https://musicbrainz.org/ws/2/artist/${mbid}?inc=url-rels&fmt=json`,
        `mb-${mbid}`,
      );
      const rels = json.relations ?? [];
      const rec = {};
      for (const rel of rels) {
        const url = rel.url?.resource ?? '';
        if (!url) continue;
        if (url.includes('open.spotify.com/artist/')) rec.spotify = url;
        else if (rel.type === 'youtube' && /youtube\.com\/(channel|user|@)/.test(url)) rec.youtube = url;
        else if (rel.type === 'official homepage') rec.official ??= url;
        else if (url.includes('wikidata.org/wiki/Q')) rec.qid = url.split('/wiki/')[1];
      }
      out.set(a.name.toLowerCase(), rec);
      if (!fromCache) { live++; await sleep(1100); }
    } catch (err) {
      console.warn(`  MB miss ${a.name}: ${err.message}`);
      await sleep(1100);
    }
  }
  console.log(`MusicBrainz: ${out.size} artists resolved (${live} live requests)`);
  return out;
}

/* ── 2. Wikidata claims + sitelinks ── */
function claimValue(entity, prop) {
  const c = entity.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value;
  return typeof c === 'string' ? c : null;
}

async function fetchWikidata(qids) {
  const out = new Map();
  const unique = [...new Set(qids.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    const { json } = await fetchJson(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${batch.join('|')}&props=claims|sitelinks&format=json&origin=*`,
      `wd-${batch[0]}-${batch.length}`,
    );
    for (const [qid, entity] of Object.entries(json.entities ?? {})) {
      if (!entity.claims && !entity.sitelinks) continue;
      const spotifyId = claimValue(entity, 'P1902');
      const youtubeId = claimValue(entity, 'P2397');
      const official = claimValue(entity, 'P856');
      const enTitle = entity.sitelinks?.enwiki?.title;
      const esTitle = entity.sitelinks?.eswiki?.title;
      out.set(qid, {
        spotify: spotifyId ? `https://open.spotify.com/artist/${spotifyId}` : null,
        youtube: youtubeId ? `https://www.youtube.com/channel/${youtubeId}` : null,
        official: official ?? null,
        wikipediaEn: enTitle ? `https://en.wikipedia.org/wiki/${encodeURIComponent(enTitle.replace(/ /g, '_'))}` : null,
        wikipediaEs: esTitle ? `https://es.wikipedia.org/wiki/${encodeURIComponent(esTitle.replace(/ /g, '_'))}` : null,
      });
    }
    await sleep(300);
  }
  console.log(`Wikidata: ${out.size} entities resolved`);
  return out;
}

/* ── 3. Link check ── */
async function checkUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NovaMusicLab-linkcheck' },
      signal: AbortSignal.timeout(12000),
    });
    return res.status;
  } catch {
    return 0; // network error / timeout — treated as "unknown", not broken
  }
}

async function checkLinks(entries) {
  const targets = [];
  for (const e of entries) {
    for (const field of ['spotifyArtistUrl', 'youtubeChannelUrl', 'wikipediaEnUrl', 'wikipediaEsUrl']) {
      if (e[field]) targets.push({ e, field, url: e[field] });
    }
  }
  console.log(`Link check: ${targets.length} URLs...`);
  const broken = [];
  let done = 0;
  const workers = Array.from({ length: 6 }, async () => {
    while (targets.length) {
      const t = targets.pop();
      const status = await checkUrl(t.url);
      done++;
      if (done % 40 === 0) console.log(`  checked ${done}...`);
      if (status === 404 || status === 410) {
        broken.push({ artist: t.e.artist, field: t.field, url: t.url, status });
        delete t.e[t.field];
      }
    }
  });
  await Promise.all(workers);
  return broken;
}

/* ── main ── */
const knowledge = JSON.parse(readFileSync(KNOWLEDGE_PATH, 'utf8'));
const media = JSON.parse(readFileSync(MEDIA_PATH, 'utf8'));
// Index by primary name AND aliases so romanized/renamed artists
// (e.g. "HaYehudim" vs "היהודים") never fork into duplicate entries.
const mediaByName = new Map();
for (const m of media) {
  mediaByName.set(m.artist.toLowerCase(), m);
  for (const alias of m.aliases ?? []) mediaByName.set(alias.toLowerCase(), m);
}

const mbRels = await fetchMusicBrainzRels(knowledge.artists);

const qids = knowledge.artists.map((a) => a.wikidata?.id ?? mbRels.get(a.name.toLowerCase())?.qid);
const wikidata = await fetchWikidata(qids);

const today = new Date().toISOString().slice(0, 10);
let filledSpotify = 0, filledYoutube = 0, filledWiki = 0, filledOfficial = 0;

for (const a of knowledge.artists) {
  const keyName = a.name.toLowerCase();
  const mb = mbRels.get(keyName) ?? {};
  const qid = a.wikidata?.id ?? mb.qid;
  const wd = qid ? wikidata.get(qid) ?? {} : {};

  let entry = mediaByName.get(keyName);
  if (!entry) {
    entry = { artist: a.name };
    media.push(entry);
    mediaByName.set(keyName, entry);
  }

  const fill = (field, value, counter) => {
    if (!entry[field] && value) {
      entry[field] = value;
      counter();
      entry.checkedAt = today;
      if (!entry.mediaConfidence) entry.mediaConfidence = 'verified';
      entry.sourceNote = entry.sourceNote
        ? entry.sourceNote
        : 'Links resolved from MusicBrainz url-rels / Wikidata identifiers for the matched entity.';
    }
  };

  fill('spotifyArtistUrl', wd.spotify ?? mb.spotify, () => filledSpotify++);
  fill('youtubeChannelUrl', wd.youtube ?? mb.youtube, () => filledYoutube++);
  fill('officialSiteUrl', wd.official ?? mb.official, () => filledOfficial++);
  fill('wikipediaEnUrl', wd.wikipediaEn, () => filledWiki++);
  fill('wikipediaEsUrl', wd.wikipediaEs, () => { /* counted with EN */ });
}

console.log(`Filled: spotify +${filledSpotify}, youtube +${filledYoutube}, official +${filledOfficial}, wikipedia +${filledWiki}`);

if (!SKIP_CHECK) {
  const broken = await checkLinks(media);
  if (broken.length) {
    console.log('Removed broken links:');
    for (const b of broken) console.log(`  ${b.artist} · ${b.field} → ${b.status}`);
  } else {
    console.log('Link check: no broken links.');
  }
}

media.sort((x, y) => x.artist.localeCompare(y.artist));
writeFileSync(MEDIA_PATH, `${JSON.stringify(media, null, 2)}\n`);

const total = media.length;
const stat = (f) => media.filter((m) => m[f]).length;
console.log(`\nFinal coverage (${total} artists):`);
console.log(`  spotifyArtistUrl : ${stat('spotifyArtistUrl')}`);
console.log(`  youtubeChannelUrl: ${stat('youtubeChannelUrl')}`);
console.log(`  wikipediaEnUrl   : ${stat('wikipediaEnUrl')}`);
console.log(`  wikipediaEsUrl   : ${stat('wikipediaEsUrl')}`);
console.log(`  officialSiteUrl  : ${stat('officialSiteUrl')}`);
