import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  HIGH_CONFIDENCE_GENRE_CORRECTIONS,
  REJECTED_GENRE_EVIDENCE,
} from './artist_truth_policy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ONTOLOGY_PATH = path.join(ROOT, 'src', 'data', 'genre_ontology.v1.json');
const KNOWLEDGE_PATH = path.join(ROOT, 'src', 'data', 'artist_genre_assertions.v1.json');
const CATALOG_PATH = path.join(ROOT, 'src', 'data', 'music_dna_genre_catalog.json');
const DATASET_PATH = path.join(ROOT, 'src', 'data', 'music_dna_compiled.json');

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function normalized(value) {
  return String(value).normalize('NFC').trim().toLocaleLowerCase('en-US');
}

const ontology = readJson(ONTOLOGY_PATH);
const knowledge = readJson(KNOWLEDGE_PATH);
const catalog = readJson(CATALOG_PATH);
const dataset = readJson(DATASET_PATH);
const errors = [];

if (ontology.schemaVersion !== 1) errors.push('Ontology schemaVersion must be 1.');
if (ontology.scope !== 'musicbrainz-plus-nova-observed') errors.push('Ontology scope is invalid.');
if (!Array.isArray(ontology.terms) || ontology.terms.length < 2_000) {
  errors.push('Ontology must include the complete 2,000+ MusicBrainz vocabulary.');
}
const termIds = new Set(ontology.terms.map(term => term.id));
const termNames = new Set(ontology.terms.map(term => term.normalizedName));
if (termIds.size !== ontology.terms.length) errors.push('Ontology term ids are not unique.');
if (termNames.size !== ontology.terms.length) errors.push('Ontology normalized names are not unique.');
if (ontology.stats?.termCount !== ontology.terms.length) errors.push('Ontology term count is stale.');
if (ontology.stats?.reviewedTermCount !== ontology.terms.filter(term => term.status === 'reviewed').length) {
  errors.push('Ontology reviewed term count is stale.');
}
if (!ontology.terms.every(term => (
  Array.isArray(term.roles)
  && term.roles.length > 0
  && Array.isArray(term.provenance)
  && term.provenance.length > 0
))) {
  errors.push('Every ontology term must have roles and provenance.');
}

if (knowledge.schemaVersion !== 1) errors.push('Artist genre knowledge schemaVersion must be 1.');
const assertionIds = new Set(knowledge.assertions.map(assertion => assertion.id));
if (assertionIds.size !== knowledge.assertions.length) errors.push('Assertion ids are not unique.');
if (!knowledge.assertions.every(assertion => termIds.has(assertion.termId))) {
  errors.push('An assertion references an unknown ontology term.');
}
if (!knowledge.assertions.every(assertion => Array.isArray(assertion.evidence) && assertion.evidence.length > 0)) {
  errors.push('Every assertion must preserve at least one evidence reference.');
}
if (!knowledge.assertions
  .filter(assertion => assertion.status === 'accepted')
  .every(assertion => assertion.evidence.some(evidence => (
    evidence.provider === 'nova-curation'
  )))) {
  errors.push('Every accepted assertion must be backed by explicit Nova curation.');
}

const catalogPlays = catalog.reduce((sum, entry) => sum + entry.plays, 0);
const classified = catalog.filter(entry => entry.source === 'catalog');
const observed = catalog.filter(entry => entry.source === 'observed');
const unclassified = catalog.filter(entry => entry.source === 'unclassified');
const allClassifiedPlays = [...classified, ...observed]
  .reduce((sum, entry) => sum + entry.plays, 0);
const stats = {
  catalogArtistCount: catalog.length,
  catalogPlayCount: catalogPlays,
  classifiedArtistCount: classified.length,
  classifiedPlayCount: classified.reduce((sum, entry) => sum + entry.plays, 0),
  unclassifiedArtistCount: unclassified.length,
  unclassifiedPlayCount: unclassified.reduce((sum, entry) => sum + entry.plays, 0),
  knowledgeArtistCount: knowledge.artists.length,
  acceptedAssertionCount: knowledge.assertions.filter(row => row.status === 'accepted').length,
  candidateAssertionCount: knowledge.assertions.filter(row => row.status === 'candidate').length,
  rejectedAssertionCount: knowledge.assertions.filter(row => row.status === 'rejected').length,
};
for (const [key, value] of Object.entries(stats)) {
  if (knowledge.stats?.[key] !== value) errors.push(`Knowledge statistic is stale: ${key}.`);
}
if (catalog.length !== dataset.core_metrics.unique_artists) {
  errors.push('Genre catalog entry count no longer reconciles to the dataset.');
}
if (catalogPlays !== dataset.core_metrics.total_plays) {
  errors.push('Genre catalog play count no longer reconciles to the dataset.');
}

const artistRecords = new Map(knowledge.artists.map(artist => [artist.artistKey, artist]));
for (const artist of knowledge.artists) {
  if (new Set(artist.assertionIds).size !== artist.assertionIds.length) {
    errors.push(`Duplicate assertion id in artist record: ${artist.artistName}.`);
  }
  if (artist.assertionIds.some(id => !assertionIds.has(id))) {
    errors.push(`Unknown assertion id in artist record: ${artist.artistName}.`);
  }
}

for (const correction of HIGH_CONFIDENCE_GENRE_CORRECTIONS) {
  const catalogEntry = catalog.find(entry => normalized(entry.name) === normalized(correction.artist));
  const record = catalogEntry ? artistRecords.get(catalogEntry.artistKey) : null;
  const accepted = record?.assertionIds
    .map(id => knowledge.assertions.find(assertion => assertion.id === id))
    .filter(assertion => assertion?.status === 'accepted') ?? [];
  if (accepted.length === 0) {
    errors.push(`High-confidence correction has no accepted assertion: ${correction.artist}.`);
  }
}

for (const rejected of REJECTED_GENRE_EVIDENCE) {
  const rejectedAssertion = knowledge.assertions.find(assertion => (
    normalized(assertion.artistKey) === normalized(rejected.artist)
    && assertion.status === 'rejected'
    && rejected.tags.some(tag => normalized(assertion.rawLabel) === normalized(tag))
  ));
  if (!rejectedAssertion) {
    errors.push(`Rejected evidence guard is missing: ${rejected.artist} / ${rejected.tags.join(', ')}.`);
  }
}

if (errors.length > 0) {
  process.stderr.write(`Genre knowledge audit failed (${errors.length}):\n`);
  errors.forEach(error => process.stderr.write(`- ${error}\n`));
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Genre knowledge audit passed: ${ontology.terms.length} vocabulary terms; `
    + `${knowledge.artists.length}/${catalog.length} catalog entries with assertions; `
    + `${stats.acceptedAssertionCount} accepted, ${stats.candidateAssertionCount} candidate, `
    + `${stats.rejectedAssertionCount} rejected and hidden; `
    + `${classified.length} catalog + ${observed.length} observed + ${unclassified.length} unclassified entries; `
    + `${Math.round((allClassifiedPlays / catalogPlays) * 1000) / 10}% of plays classified; `
    + `${catalogPlays} plays reconciled.\n`,
  );
}
