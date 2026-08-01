import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  HIGH_CONFIDENCE_GENRE_CORRECTIONS,
  REJECTED_GENRE_EVIDENCE,
} from './artist_truth_policy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ONTOLOGY_PATH = path.join(ROOT, 'src', 'data', 'genre_ontology.v1.json');
const OUTPUT_PATH = path.join(ROOT, 'src', 'data', 'artist_genre_assertions.v1.json');
const CATALOG_PATH = path.join(ROOT, 'src', 'data', 'music_dna_genre_catalog.json');
const OFFLINE_KNOWLEDGE_PATH = path.join(ROOT, 'src', 'data', 'offline_artist_knowledge.json');
const OBSERVATIONS_PATH = path.join(ROOT, 'src', 'data', 'artist_genre_observations.json');
const CATALOG_SOURCE_URL = 'https://github.com/LiriothTeltanion/NovaMusicLab/blob/main/src/data/artist_meta.json';
const CURATION_SOURCE_URL = 'https://github.com/LiriothTeltanion/NovaMusicLab/blob/main/scripts/artist_truth_policy.mjs';

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
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

function artistKey(value) {
  return String(value).normalize('NFC').trim().toLocaleLowerCase('en-US');
}

function splitLabels(value) {
  return String(value)
    .split('/')
    .map(label => label.normalize('NFC').trim())
    .filter(Boolean);
}

function assertionId(artist, termId) {
  return `assertion:${createHash('sha256')
    .update(`${artist.normalize('NFC')}|${termId}`)
    .digest('hex')
    .slice(0, 24)}`;
}

function statusPriority(status) {
  return { candidate: 1, accepted: 2, rejected: 3 }[status] ?? 0;
}

function confidencePriority(confidence) {
  return { unverified: 1, matched: 2, curated: 3, verified: 4 }[confidence] ?? 0;
}

function evidenceKey(evidence) {
  return `${evidence.provider}|${evidence.sourceId ?? ''}|${evidence.observedLabel}`;
}

const ontology = readJson(ONTOLOGY_PATH);
const catalog = readJson(CATALOG_PATH);
const offlineKnowledge = readJson(OFFLINE_KNOWLEDGE_PATH);
const termsByLookup = new Map(ontology.terms.map(term => [lookupKey(term.canonicalName), term]));
ontology.terms.forEach(term => {
  term.aliases.forEach(alias => {
    if (!termsByLookup.has(lookupKey(alias))) termsByLookup.set(lookupKey(alias), term);
  });
});

const termsById = new Map(ontology.terms.map(term => [term.id, term]));

// The observation layer only exists after the MusicBrainz harvest has run, so
// the builder has to stay usable on a clean checkout that has never run it.
const observedByArtist = new Map(
  Object.values((existsSync(OBSERVATIONS_PATH) ? readJson(OBSERVATIONS_PATH) : {}).artists ?? {})
    .map(entry => [artistKey(entry.name), entry]),
);

const catalogByArtist = new Map();
catalog.forEach(entry => {
  const key = artistKey(entry.name);
  const rows = catalogByArtist.get(key) ?? [];
  rows.push(entry);
  catalogByArtist.set(key, rows);
});
const knowledgeByArtist = new Map(
  (offlineKnowledge.artists ?? []).map(entry => [artistKey(entry.name), entry]),
);
const assertionsByKey = new Map();
const artistRecords = new Map();

function ensureArtist(entry) {
  let record = artistRecords.get(entry.artistKey);
  if (!record) {
    record = {
      artistKey: entry.artistKey,
      artistName: entry.name,
      chartFamilyId: entry.automaticFamily,
      assertionIds: [],
    };
    artistRecords.set(entry.artistKey, record);
  }
  return record;
}

function findTerm(label) {
  return termsByLookup.get(lookupKey(label));
}

function addAssertion({
  catalogEntry,
  label,
  role,
  status,
  confidence,
  evidence,
  // MusicBrainz observations arrive already carrying the genre's MBID, so they
  // hand the term over directly instead of round-tripping through a name.
  term: resolvedTerm,
}) {
  const term = resolvedTerm ?? findTerm(label);
  if (!term) return false;
  const record = ensureArtist(catalogEntry);
  const key = `${catalogEntry.artistKey}|${term.id}`;
  let assertion = assertionsByKey.get(key);
  if (!assertion) {
    assertion = {
      id: assertionId(catalogEntry.artistKey, term.id),
      artistKey: catalogEntry.artistKey,
      termId: term.id,
      rawLabel: label,
      role,
      status,
      confidence,
      evidence: [],
    };
    assertionsByKey.set(key, assertion);
    record.assertionIds.push(assertion.id);
  }

  if (statusPriority(status) > statusPriority(assertion.status)) assertion.status = status;
  if (confidencePriority(confidence) > confidencePriority(assertion.confidence)) {
    assertion.confidence = confidence;
  }
  if (assertion.role !== 'primary' && role === 'primary') assertion.role = 'primary';

  const existingEvidence = new Set(assertion.evidence.map(evidenceKey));
  evidence.forEach(item => {
    if (!existingEvidence.has(evidenceKey(item))) {
      assertion.evidence.push(item);
      existingEvidence.add(evidenceKey(item));
    }
  });
  return true;
}

catalog
  .filter(entry => entry.source === 'catalog')
  .forEach(entry => {
    splitLabels(entry.automaticGenre).forEach((label, index) => {
      addAssertion({
        catalogEntry: entry,
        label,
        role: index === 0 ? 'primary' : 'secondary',
        status: 'candidate',
        confidence: 'curated',
        evidence: [{
          provider: 'nova-catalog',
          sourceId: null,
          sourceUrl: CATALOG_SOURCE_URL,
          observedLabel: label,
        }],
      });
    });
  });

// MusicBrainz observations for artists the curated catalogue never reached.
// They enter as candidates with confidence 'matched', never 'curated': the join
// onto the ontology is exact, but nobody has reviewed the claim itself.
//
// Off by default, and the reason is a measurement rather than a preference.
// Including them takes this artifact from 1,257 to 3,096 assertions and from
// 85 KB to 212 KB gzip, against a 92 KB lazy budget. Trimming helped far less
// than expected - dropping sourceUrl, rawLabel and the assertion ids together
// still left 143 KB, because a 24-hex id per assertion is incompressible. So
// the payload cannot hold them, and raising the ceiling would quietly hand
// every Genre Lab visitor an extra 120 KB.
//
// None of the observation data is lost by this: it is committed in
// artist_genre_observations.json, and the genres themselves already reach the
// museum through artist_genre_fallback.json and the catalogue. What is missing
// is the evidence trail inside Genre Lab, and the fix for that is a second lazy
// artifact loaded only when a reviewer opens the queue - not a bigger download
// for everyone. Pass --include-observed to build the combined file and measure.
const INCLUDE_OBSERVED = process.argv.includes('--include-observed');

catalog
  .filter(entry => INCLUDE_OBSERVED && entry.source === 'observed')
  .forEach(entry => {
    const observation = observedByArtist.get(artistKey(entry.name));
    if (!observation) return;
    observation.genres.forEach((genre, index) => {
      const term = termsById.get(`musicbrainz:${genre.id}`);
      if (!term) return;
      addAssertion({
        catalogEntry: entry,
        label: term.canonicalName,
        term,
        role: index === 0 ? 'primary' : 'secondary',
        status: 'candidate',
        confidence: 'matched',
        evidence: [{
          provider: 'musicbrainz',
          sourceId: observation.musicbrainzArtistId,
          sourceUrl: `https://musicbrainz.org/artist/${observation.musicbrainzArtistId}`,
          observedLabel: genre.name,
        }],
      });
    });
  });

for (const correction of HIGH_CONFIDENCE_GENRE_CORRECTIONS) {
  const entries = catalogByArtist.get(artistKey(correction.artist)) ?? [];
  if (entries.length === 0) {
    throw new Error(`Verified genre correction is missing from catalog: ${correction.artist}`);
  }
  const knowledge = knowledgeByArtist.get(artistKey(correction.artist));
  const mbid = knowledge?.musicbrainz?.id ?? null;
  entries.forEach(entry => {
    splitLabels(correction.genre).forEach((label, index) => {
      const expectedTag = correction.musicBrainzTags.find(tag => (
        lookupKey(tag) === lookupKey(label)
      ));
      const evidence = [{
        provider: 'nova-curation',
        sourceId: correction.artist,
        sourceUrl: CURATION_SOURCE_URL,
        observedLabel: label,
      }];
      if (expectedTag && mbid) {
        evidence.push({
          provider: 'musicbrainz',
          sourceId: mbid,
          sourceUrl: `https://musicbrainz.org/artist/${mbid}`,
          observedLabel: expectedTag,
        });
      }
      addAssertion({
        catalogEntry: entry,
        label,
        role: index === 0 ? 'primary' : 'secondary',
        status: 'accepted',
        confidence: expectedTag && mbid ? 'verified' : 'curated',
        evidence,
      });
    });
  });
}

for (const knowledge of offlineKnowledge.artists ?? []) {
  const entries = catalogByArtist.get(artistKey(knowledge.name)) ?? [];
  if (entries.length === 0) continue;
  const rejectedForArtist = new Set(
    REJECTED_GENRE_EVIDENCE
      .filter(row => artistKey(row.artist) === artistKey(knowledge.name))
      .flatMap(row => row.tags.map(lookupKey)),
  );

  entries.forEach(entry => {
    const mbid = knowledge.musicbrainz?.id ?? null;
    for (const label of knowledge.musicbrainz?.tags ?? []) {
      if (rejectedForArtist.has(lookupKey(label))) continue;
      const term = findTerm(label);
      if (!term?.provenance.some(source => source.provider === 'musicbrainz')) continue;
      addAssertion({
        catalogEntry: entry,
        label,
        role: 'secondary',
        status: 'candidate',
        confidence: 'matched',
        evidence: [{
          provider: 'musicbrainz',
          sourceId: mbid,
          sourceUrl: mbid ? `https://musicbrainz.org/artist/${mbid}` : 'https://musicbrainz.org/',
          observedLabel: label,
        }],
      });
    }

    const wikidataId = knowledge.wikidata?.id ?? null;
    for (const label of knowledge.wikidata?.genres ?? []) {
      const term = findTerm(label);
      if (!term) continue;
      addAssertion({
        catalogEntry: entry,
        label,
        role: 'secondary',
        status: 'candidate',
        confidence: 'matched',
        evidence: [{
          provider: 'wikidata',
          sourceId: wikidataId,
          sourceUrl: wikidataId
            ? `https://www.wikidata.org/wiki/${wikidataId}`
            : 'https://www.wikidata.org/',
          observedLabel: label,
        }],
      });
    }
  });
}

for (const rejected of REJECTED_GENRE_EVIDENCE) {
  const entries = catalogByArtist.get(artistKey(rejected.artist)) ?? [];
  if (entries.length === 0) {
    throw new Error(`Rejected genre evidence is missing from catalog: ${rejected.artist}`);
  }
  entries.forEach(entry => {
    for (const label of rejected.tags) {
      addAssertion({
        catalogEntry: entry,
        label,
        role: 'secondary',
        status: 'rejected',
        confidence: 'verified',
        evidence: [{
          provider: 'nova-curation',
          sourceId: rejected.artist,
          sourceUrl: CURATION_SOURCE_URL,
          observedLabel: `${label} — ${rejected.reason}`,
        }],
      });
    }
  });
}

const assertions = [...assertionsByKey.values()]
  .map(assertion => ({
    ...assertion,
    evidence: assertion.evidence.sort((left, right) => (
      left.provider.localeCompare(right.provider)
      || String(left.observedLabel).localeCompare(String(right.observedLabel), 'en')
    )),
  }))
  .sort((left, right) => (
    left.artistKey.localeCompare(right.artistKey, 'en')
    || left.status.localeCompare(right.status)
    || left.termId.localeCompare(right.termId)
  ));
const assertionById = new Map(assertions.map(assertion => [assertion.id, assertion]));
const artists = [...artistRecords.values()]
  .map(record => ({
    ...record,
    assertionIds: [...record.assertionIds].sort((left, right) => {
      const leftAssertion = assertionById.get(left);
      const rightAssertion = assertionById.get(right);
      return statusPriority(rightAssertion.status) - statusPriority(leftAssertion.status)
        || leftAssertion.rawLabel.localeCompare(rightAssertion.rawLabel, 'en');
    }),
  }))
  .sort((left, right) => left.artistName.localeCompare(right.artistName, 'en'));

const classified = catalog.filter(entry => entry.source === 'catalog');
const unclassified = catalog.filter(entry => entry.source === 'unclassified');
const artifact = {
  schemaVersion: 1,
  generatedAt: `${ontology.snapshotDate}T00:00:00.000Z`,
  ontologySnapshotDate: ontology.snapshotDate,
  sourceFiles: [
    'src/data/genre_ontology.v1.json',
    'src/data/music_dna_genre_catalog.json',
    'src/data/offline_artist_knowledge.json',
    'scripts/artist_truth_policy.mjs',
  ],
  stats: {
    catalogArtistCount: catalog.length,
    catalogPlayCount: catalog.reduce((sum, entry) => sum + entry.plays, 0),
    classifiedArtistCount: classified.length,
    classifiedPlayCount: classified.reduce((sum, entry) => sum + entry.plays, 0),
    unclassifiedArtistCount: unclassified.length,
    unclassifiedPlayCount: unclassified.reduce((sum, entry) => sum + entry.plays, 0),
    knowledgeArtistCount: artists.length,
    acceptedAssertionCount: assertions.filter(row => row.status === 'accepted').length,
    candidateAssertionCount: assertions.filter(row => row.status === 'candidate').length,
    rejectedAssertionCount: assertions.filter(row => row.status === 'rejected').length,
  },
  artists,
  assertions,
};

writeFileSync(OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
process.stdout.write(
  `Artist genre knowledge written: ${artists.length} artists, ${assertions.length} assertions `
  + `(${artifact.stats.acceptedAssertionCount} accepted, `
  + `${artifact.stats.candidateAssertionCount} candidate, `
  + `${artifact.stats.rejectedAssertionCount} rejected).\n`,
);
