import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const DATASET_PATH = resolve(ROOT, 'src', 'data', 'music_dna_compiled.json');
const MANIFEST_PATH = resolve(ROOT, 'src', 'data', 'public_dataset_manifest.json');
const RECENT_PULSE_PATH = resolve(ROOT, 'src', 'data', 'recent_pulse.json');
const PUBLIC_DATA_DIR = resolve(ROOT, 'src', 'data');
const REPOSITORY_SCAN_EXCLUDES = new Set(['.git', 'coverage', 'dist', 'node_modules']);
const REPOSITORY_TEXT_EXTENSIONS = new Set([
  '.css', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.svg', '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);

const EXACT_SECTIONS = ['sessions', 'obsessions', 'daily_plays', 'platform_breakdown', 'recent_pulse'];
const EXACT_STATUSES = new Set(['published-curated', 'redacted', 'omitted']);
const FORBIDDEN_RAW_KEYS = new Set([
  'account_id',
  'advertising_id',
  'device_id',
  'device_identifier',
  'email',
  'email_address',
  'geoip',
  'ip',
  'ip_addr',
  'ip_address',
  'latitude',
  'longitude',
  'mac_address',
  'user_agent',
  'user_id',
  'username',
]);
const PUBLIC_PLATFORM_FAMILIES = new Set([
  'Android phone',
  'Android tablet',
  'Apple mobile',
  'Apple Music',
  'Cast',
  'Linux',
  'ListenBrainz',
  'Mac',
  'Other',
  'PlayStation',
  'Roku',
  'Smart TV',
  'Web player',
  'Windows desktop',
  'Xbox',
  'YouTube import',
]);
const FORBIDDEN_PUBLIC_VALUE_PATTERNS = [
  {
    label: 'MAC-address-like value',
    pattern: /\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/i,
  },
  {
    label: 'browser user-agent signature',
    pattern: /\b(?:Mozilla\/\d|AppleWebKit\/\d|Chrome\/\d|Firefox\/\d|Version\/\d+\.\d+ Safari\/)/i,
  },
];

const errors = [];
const auditedPublicFiles = new Set();
let auditedRepositoryTextFiles = 0;

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    errors.push(`${label} could not be read: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizedKey(key) {
  return key.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function auditRawFields(value, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => auditRawFields(entry, `${path}[${index}]`));
    return;
  }

  if (!isPlainObject(value)) return;

  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (FORBIDDEN_RAW_KEYS.has(normalizedKey(key))) {
      errors.push(`Forbidden raw identity/network field found at ${nextPath}`);
    }
    auditRawFields(child, nextPath);
  }
}

function auditStringSecrets(value, path = '$') {
  if (typeof value === 'string') {
    if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value)) {
      errors.push(`Email-like value found at ${path}`);
    }
    for (const { label, pattern } of FORBIDDEN_PUBLIC_VALUE_PATTERNS) {
      if (pattern.test(value)) errors.push(`${label} found at ${path}`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => auditStringSecrets(entry, `${path}[${index}]`));
    return;
  }

  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      auditStringSecrets(child, `${path}.${key}`);
    }
  }
}

function auditRedactedPlatformBreakdown(dataset, manifest) {
  if (!Array.isArray(dataset.platform_breakdown)) {
    errors.push('Public platform_breakdown must be an array of redacted device families');
    return;
  }
  if (manifest.reviewedExactSections?.platform_breakdown !== 'redacted') {
    errors.push('Public platform_breakdown must be declared redacted in the manifest');
  }

  dataset.platform_breakdown.forEach((entry, index) => {
    const path = `$.music_dna_compiled.platform_breakdown[${index}]`;
    if (!isPlainObject(entry)) {
      errors.push(`Platform row must be an object at ${path}`);
      return;
    }
    if (typeof entry.platform !== 'string' || !PUBLIC_PLATFORM_FAMILIES.has(entry.platform)) {
      errors.push(`Unredacted or unknown platform label found at ${path}.platform`);
    }
    if (typeof entry.plays !== 'number' || !Number.isFinite(entry.plays) || entry.plays < 0) {
      errors.push(`Platform play count must be a finite non-negative number at ${path}.plays`);
    }
  });
}

function repositoryTextFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && REPOSITORY_SCAN_EXCLUDES.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...repositoryTextFiles(path));
    else if (entry.isFile() && REPOSITORY_TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(path);
  }
  return files;
}

function auditRepositoryText() {
  const accountAssignment = /\b(?:account[_ -]?id|user[_ -]?id|username)\s*[:=]\s*["'`]?[a-z0-9._-]{3,}/i;
  const csvLiteral = /["'`]([^"'`\r\n\\/]+\.csv)["'`]/gi;
  const genericExportName = /(?:last\.?fm|scrobble|history|export|listening|music|sample|fixture|test|example)/i;

  for (const path of repositoryTextFiles(ROOT)) {
    const label = relative(ROOT, path).replaceAll('\\', '/');
    const text = readFileSync(path, 'utf8');
    auditedRepositoryTextFiles += 1;

    if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) {
      errors.push(`Email-like value found in repository text file: ${label}`);
    }
    if (accountAssignment.test(text)) {
      errors.push(`Raw account-identifier assignment found in repository text file: ${label}`);
    }

    for (const match of text.matchAll(csvLiteral)) {
      const start = Math.max(0, (match.index ?? 0) - 180);
      const end = Math.min(text.length, (match.index ?? 0) + match[0].length + 180);
      const context = text.slice(start, end);
      if (/last\.?fm/i.test(context) && !genericExportName.test(match[1])) {
        errors.push(`Potential personalized Last.fm CSV filename found in repository text file: ${label}`);
      }
    }
  }
}

function auditPublicJson(path, label) {
  const value = readJson(path, label);
  if (value === null) return null;
  auditedPublicFiles.add(path);
  auditRawFields(value, `$.${label}`);
  auditStringSecrets(value, `$.${label}`);
  return value;
}

const dataset = readJson(DATASET_PATH, 'Bundled flagship dataset');
const manifest = readJson(MANIFEST_PATH, 'Public dataset manifest');
const recentPulse = existsSync(RECENT_PULSE_PATH)
  ? readJson(RECENT_PULSE_PATH, 'Recent Pulse snapshot')
  : null;

// Every JSON module in src/data can be bundled into the public Pages app. Scan
// the complete directory rather than a hand-picked subset so new artist,
// artwork, mock or analytics payloads cannot bypass the privacy gate.
for (const name of readdirSync(PUBLIC_DATA_DIR).filter(name => name.endsWith('.json')).sort()) {
  auditPublicJson(resolve(PUBLIC_DATA_DIR, name), name.replace(/\.json$/i, ''));
}
auditRepositoryText();

if (dataset && manifest) {
  if (manifest.schemaVersion !== 1) errors.push('Manifest schemaVersion must be 1');
  if (manifest.datasetKind !== 'flagship') errors.push('Manifest datasetKind must be flagship');
  if (manifest.privacyTier !== 'curated-public') errors.push('Manifest privacyTier must be curated-public');
  if (manifest.analysisTimezone !== 'Asia/Jerusalem') {
    errors.push('Manifest analysisTimezone must be Asia/Jerusalem for this flagship build');
  }

  if (!Array.isArray(manifest.allowedSections) || manifest.allowedSections.length === 0) {
    errors.push('Manifest allowedSections must be a non-empty array');
  } else {
    const allowed = new Set(manifest.allowedSections);
    if (allowed.size !== manifest.allowedSections.length) {
      errors.push('Manifest allowedSections contains duplicates');
    }

    for (const section of Object.keys(dataset)) {
      if (!allowed.has(section)) errors.push(`Public dataset section is undeclared: ${section}`);
    }
    for (const section of allowed) {
      if (!(section in dataset)) errors.push(`Manifest allows a missing dataset section: ${section}`);
    }
  }

  if (!Array.isArray(manifest.prohibitedExactSections)) {
    errors.push('Manifest prohibitedExactSections must be an array');
  } else {
    for (const section of manifest.prohibitedExactSections) {
      if (section in dataset) errors.push(`Prohibited exact section is present: ${section}`);
    }
  }

  if (!isPlainObject(manifest.reviewedExactSections)) {
    errors.push('Manifest reviewedExactSections must be an object');
  } else {
    for (const section of EXACT_SECTIONS) {
      const status = manifest.reviewedExactSections[section];
      if (!EXACT_STATUSES.has(status)) {
        errors.push(`Exact section ${section} has an invalid or missing review status`);
        continue;
      }

      const present = section === 'recent_pulse' ? Boolean(recentPulse) : section in dataset;
      if (present && status === 'omitted') {
        errors.push(`Exact section ${section} is present but declared omitted`);
      }
      if (!present && status !== 'omitted') {
        errors.push(`Exact section ${section} is declared ${status} but is missing`);
      }
    }
  }

  if (!Array.isArray(manifest.notes) || manifest.notes.length === 0) {
    errors.push('Manifest notes must explain the public-review boundary');
  }

  auditRedactedPlatformBreakdown(dataset, manifest);

  auditRawFields(dataset, '$.music_dna_compiled');
  auditStringSecrets(dataset, '$.music_dna_compiled');
  if (recentPulse) {
    auditRawFields(recentPulse, '$.recent_pulse');
    auditStringSecrets(recentPulse, '$.recent_pulse');
  }
}

if (errors.length > 0) {
  process.stderr.write(`Public bundle privacy audit failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):\n`);
  for (const error of errors) process.stderr.write(`- ${error}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Public bundle privacy audit passed: ${manifest.datasetKind} / ${manifest.privacyTier}; `
      + `${manifest.allowedSections.length} declared sections; ${EXACT_SECTIONS.length} reviewed exact sections; `
      + `${auditedPublicFiles.size} public JSON payloads and ${auditedRepositoryTextFiles} repository text files scanned.\n`,
  );
}
