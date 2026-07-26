import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

const knowledge = readJson('src/data/offline_artist_knowledge.json');
const registry = readJson('src/data/artist_identity_registry.json');
const policy = readJson('src/data/artist_external_identity_policy.json');
const errors = [];

const exactName = value => String(value ?? '').normalize('NFC').trim();
const sortedNames = values => values.map(exactName).sort((a, b) => a.localeCompare(b, 'en'));

if (policy.schemaVersion !== 1) errors.push('Unsupported external identity policy schema.');
if (!Array.isArray(policy.relationshipGroups) || !Array.isArray(policy.rejectedMatches)) {
  errors.push('Identity policy must declare relationshipGroups and rejectedMatches.');
}

const registeredNames = new Map();
for (const identity of registry.identities ?? []) {
  for (const name of [identity.canonical, ...(identity.aliases ?? [])]) {
    const key = exactName(name);
    const existing = registeredNames.get(key);
    if (existing && existing !== identity.canonical) {
      errors.push(`Registry name collision for ${key}: ${existing} / ${identity.canonical}.`);
    }
    registeredNames.set(key, identity.canonical);
  }
}

const relationshipByProviderId = new Map();
for (const group of policy.relationshipGroups ?? []) {
  if (!group.canonical || !group.relationship || !Array.isArray(group.archiveNames) || group.archiveNames.length < 2) {
    errors.push(`Invalid relationship group: ${group.canonical ?? 'unnamed'}.`);
    continue;
  }
  for (const [provider, externalId] of Object.entries(group.evidence ?? {})) {
    if (!externalId) continue;
    const key = `${provider}:${externalId}`;
    if (relationshipByProviderId.has(key)) errors.push(`Duplicate relationship evidence: ${key}.`);
    relationshipByProviderId.set(key, sortedNames(group.archiveNames));
  }
}

for (const provider of ['musicbrainz', 'wikidata']) {
  const artistsById = new Map();
  for (const artist of knowledge.artists ?? []) {
    const externalId = artist[provider]?.id;
    if (!externalId) continue;
    const names = artistsById.get(externalId) ?? [];
    names.push(artist.name);
    artistsById.set(externalId, names);
  }

  for (const [externalId, names] of artistsById) {
    if (names.length < 2) continue;
    const policyNames = relationshipByProviderId.get(`${provider}:${externalId}`);
    if (!policyNames || JSON.stringify(sortedNames(names)) !== JSON.stringify(policyNames)) {
      errors.push(`Undeclared ${provider} identity reuse ${externalId}: ${names.join(' / ')}.`);
    }
  }
}

for (const rejected of policy.rejectedMatches ?? []) {
  const artist = (knowledge.artists ?? []).find(item => exactName(item.name) === exactName(rejected.archiveName));
  if (!artist) {
    errors.push(`Rejected-match artist is missing: ${rejected.archiveName}.`);
    continue;
  }
  if (artist[rejected.provider]?.id === rejected.externalId) {
    errors.push(`Rejected ${rejected.provider} match remains active for ${rejected.archiveName}.`);
  }
}

if (errors.length) {
  process.stderr.write(`Artist identity audit failed (${errors.length}):\n${errors.map(error => `- ${error}`).join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Artist identity audit passed: ${registeredNames.size} registered names, `
    + `${policy.relationshipGroups.length} reviewed relationship groups, `
    + `${policy.rejectedMatches.length} rejected provider match.\n`,
  );
}
