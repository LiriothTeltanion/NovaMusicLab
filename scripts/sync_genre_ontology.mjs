import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_PATH = path.join(ROOT, 'src', 'data', 'genre_ontology.v1.json');
const ARTIST_META_PATH = path.join(ROOT, 'src', 'data', 'artist_meta.json');
const CATALOG_PATH = path.join(ROOT, 'src', 'data', 'music_dna_genre_catalog.json');
const MUSICBRAINZ_ENDPOINT = 'https://musicbrainz.org/ws/2/genre/all';
const MUSICBRAINZ_DOCS = 'https://musicbrainz.org/doc/MusicBrainz_API';
const NOVA_TAXONOMY_SOURCE = 'https://github.com/LiriothTeltanion/NovaMusicLab/blob/main/src/utils/genreTaxonomy.ts';
const NOVA_CATALOG_SOURCE = 'https://github.com/LiriothTeltanion/NovaMusicLab/blob/main/src/data/artist_meta.json';
const USER_AGENT = 'NovaMusicLab/1.4.0 (https://github.com/LiriothTeltanion/NovaMusicLab)';
const PAGE_SIZE = 100;
const REQUEST_INTERVAL_MS = 1_100;

function parseArguments(args) {
  let snapshotDate = new Date().toISOString().slice(0, 10);
  let outputPath = OUTPUT_PATH;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--snapshot-date') {
      snapshotDate = args[index + 1] ?? '';
      index += 1;
    } else if (argument === '--output') {
      outputPath = path.resolve(process.cwd(), args[index + 1] ?? '');
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate)) {
    throw new Error('--snapshot-date must use YYYY-MM-DD.');
  }
  return { outputPath, snapshotDate };
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
      });
      if (response.ok) return await response.json();
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`MusicBrainz returned HTTP ${response.status}.`);
      }
      lastError = new Error(`MusicBrainz returned retryable HTTP ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await wait(REQUEST_INTERVAL_MS * (attempt + 1));
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function fetchAllMusicBrainzGenres() {
  const genres = [];
  let offset = 0;
  let expectedCount = null;

  while (expectedCount === null || offset < expectedCount) {
    const url = new URL(MUSICBRAINZ_ENDPOINT);
    url.searchParams.set('fmt', 'json');
    url.searchParams.set('limit', String(PAGE_SIZE));
    url.searchParams.set('offset', String(offset));
    const payload = await fetchJson(url);
    const page = Array.isArray(payload.genres) ? payload.genres : [];
    expectedCount = Number(payload['genre-count']);
    if (!Number.isInteger(expectedCount) || expectedCount <= 0 || page.length === 0) {
      throw new Error(`Invalid MusicBrainz genre page at offset ${offset}.`);
    }
    genres.push(...page);
    offset += page.length;
    process.stdout.write(`MusicBrainz genres: ${Math.min(offset, expectedCount)}/${expectedCount}\n`);
    if (offset < expectedCount) await wait(REQUEST_INTERVAL_MS);
  }

  const uniqueIds = new Set(genres.map(genre => genre.id));
  if (uniqueIds.size !== genres.length || genres.length !== expectedCount) {
    throw new Error(`MusicBrainz genre count mismatch: ${genres.length}/${expectedCount}.`);
  }
  return genres;
}

async function loadGenreFamilies() {
  const vite = await createServer({
    root: ROOT,
    configFile: false,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true },
  });
  try {
    const module = await vite.ssrLoadModule('/src/utils/genreTaxonomy.ts');
    if (!Array.isArray(module.GENRE_FAMILIES)) {
      throw new Error('Could not load GENRE_FAMILIES.');
    }
    return module.GENRE_FAMILIES;
  } finally {
    await vite.close();
  }
}

function lookupKey(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&/g, ' and ')
    .replace(/[-‐‑‒–—_]+/g, ' ')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-US');
}

function stableLocalId(name) {
  const slug = lookupKey(name).replace(/\s+/g, '-').slice(0, 56) || 'term';
  const suffix = createHash('sha256').update(name.normalize('NFC')).digest('hex').slice(0, 10);
  return `nova:${slug}:${suffix}`;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function splitLabels(value) {
  return String(value)
    .split('/')
    .map(label => label.normalize('NFC').trim())
    .filter(Boolean);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, 'en'));
}

function addProvenance(term, provenance) {
  const key = `${provenance.provider}|${provenance.sourceId ?? ''}|${provenance.sourceUrl}`;
  const keys = new Set(term.provenance.map(item => (
    `${item.provider}|${item.sourceId ?? ''}|${item.sourceUrl}`
  )));
  if (!keys.has(key)) term.provenance.push(provenance);
}

function addAlias(term, name) {
  const normalized = name.normalize('NFC').trim();
  if (!normalized || lookupKey(normalized) === term.normalizedName) return;
  if (!term.aliases.includes(normalized)) term.aliases.push(normalized);
}

async function buildOntology(snapshotDate) {
  const retrievedAt = new Date().toISOString();
  const [musicBrainzGenres, families] = await Promise.all([
    fetchAllMusicBrainzGenres(),
    loadGenreFamilies(),
  ]);
  const artistMeta = readJson(ARTIST_META_PATH);
  const catalog = readJson(CATALOG_PATH);
  const termsByKey = new Map();
  const observedKeys = new Set();

  function upsert(name, {
    id,
    role,
    status,
    familyId = null,
    provenance,
  }) {
    const canonicalName = String(name).normalize('NFC').trim();
    const normalizedName = lookupKey(canonicalName);
    if (!normalizedName) throw new Error(`Invalid empty genre term: ${name}`);

    let term = termsByKey.get(normalizedName);
    if (!term) {
      term = {
        id: id ?? stableLocalId(canonicalName),
        canonicalName,
        normalizedName,
        roles: [],
        status,
        aliases: [],
        familyIds: [],
        provenance: [],
      };
      termsByKey.set(normalizedName, term);
    } else if (id?.startsWith('musicbrainz:') && !term.id.startsWith('musicbrainz:')) {
      term.id = id;
    }

    if (term.canonicalName !== canonicalName) {
      if (status === 'reviewed') {
        addAlias(term, term.canonicalName);
        term.canonicalName = canonicalName;
      } else {
        addAlias(term, canonicalName);
      }
    }
    if (!term.roles.includes(role)) term.roles.push(role);
    if (status === 'reviewed') term.status = 'reviewed';
    if (familyId && !term.familyIds.includes(familyId)) term.familyIds.push(familyId);
    addProvenance(term, provenance);
    return term;
  }

  musicBrainzGenres.forEach(genre => {
    if (!genre?.id || !genre?.name) {
      throw new Error('MusicBrainz returned a genre without id/name.');
    }
    upsert(genre.name, {
      id: `musicbrainz:${genre.id}`,
      role: 'genre',
      status: 'provisional',
      provenance: {
        provider: 'musicbrainz',
        sourceId: genre.id,
        sourceUrl: `https://musicbrainz.org/genre/${genre.id}`,
      },
    });
  });

  families.forEach(family => {
    upsert(family.id, {
      role: 'family',
      status: 'reviewed',
      familyId: family.id,
      provenance: {
        provider: 'nova-taxonomy',
        sourceId: family.id,
        sourceUrl: NOVA_TAXONOMY_SOURCE,
      },
    });
    family.secondaryTags.forEach(tag => {
      upsert(tag, {
        role: 'genre',
        status: 'reviewed',
        familyId: family.id,
        provenance: {
          provider: 'nova-taxonomy',
          sourceId: family.id,
          sourceUrl: NOVA_TAXONOMY_SOURCE,
        },
      });
    });
  });

  catalog
    .filter(entry => entry.source === 'catalog')
    .forEach(entry => {
      splitLabels(entry.automaticGenre).forEach(label => {
        observedKeys.add(lookupKey(label));
        upsert(label, {
          role: 'descriptor',
          status: 'provisional',
          familyId: entry.automaticFamily,
          provenance: {
            provider: 'nova-catalog',
            sourceId: null,
            sourceUrl: NOVA_CATALOG_SOURCE,
          },
        });
      });
    });

  Object.values(artistMeta).forEach(entry => {
    splitLabels(entry.genre).forEach(label => {
      observedKeys.add(lookupKey(label));
      upsert(label, {
        role: 'descriptor',
        status: 'provisional',
        provenance: {
          provider: 'nova-catalog',
          sourceId: null,
          sourceUrl: NOVA_CATALOG_SOURCE,
        },
      });
    });
  });

  const roleOrder = ['family', 'genre', 'subgenre', 'scene', 'style', 'descriptor'];
  const terms = [...termsByKey.values()]
    .map(term => ({
      ...term,
      roles: uniqueSorted(term.roles).sort(
        (left, right) => roleOrder.indexOf(left) - roleOrder.indexOf(right),
      ),
      aliases: uniqueSorted(term.aliases),
      familyIds: uniqueSorted(term.familyIds),
      provenance: term.provenance.sort((left, right) => (
        left.provider.localeCompare(right.provider)
        || String(left.sourceId).localeCompare(String(right.sourceId))
      )),
    }))
    .sort((left, right) => (
      left.canonicalName.localeCompare(right.canonicalName, 'en', { sensitivity: 'base' })
      || left.id.localeCompare(right.id)
    ));

  const reviewedTermCount = terms.filter(term => term.status === 'reviewed').length;
  return {
    schemaVersion: 1,
    snapshotDate,
    scope: 'musicbrainz-plus-nova-observed',
    sources: [
      {
        provider: 'musicbrainz',
        sourceUrl: MUSICBRAINZ_DOCS,
        retrievedAt,
        note: 'The complete MusicBrainz genre vocabulary is a searchable candidate list, not an automatic claim about any artist.',
      },
      {
        provider: 'nova-taxonomy',
        sourceUrl: NOVA_TAXONOMY_SOURCE,
        retrievedAt: null,
        note: 'Reviewed analytical families and starter tags preserve exact chart reconciliation.',
      },
      {
        provider: 'nova-catalog',
        sourceUrl: NOVA_CATALOG_SOURCE,
        retrievedAt: null,
        note: 'Observed archive labels remain provisional unless explicit evidence accepts them.',
      },
    ],
    stats: {
      termCount: terms.length,
      reviewedTermCount,
      provisionalTermCount: terms.length - reviewedTermCount,
      musicBrainzTermCount: musicBrainzGenres.length,
      novaObservedTermCount: observedKeys.size,
    },
    terms,
  };
}

const options = parseArguments(process.argv.slice(2));
const ontology = await buildOntology(options.snapshotDate);
mkdirSync(path.dirname(options.outputPath), { recursive: true });
writeFileSync(options.outputPath, `${JSON.stringify(ontology, null, 2)}\n`, 'utf8');
process.stdout.write(
  `Genre ontology written: ${ontology.stats.termCount} terms `
  + `(${ontology.stats.reviewedTermCount} reviewed, ${ontology.stats.musicBrainzTermCount} MusicBrainz).\n`,
);
