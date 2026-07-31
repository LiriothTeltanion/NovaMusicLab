// Release-time gate: proves the published screenshots, GIF and social preview
// were captured from exactly the source that shipped.
//
// Run it through `npm run verify:release` when cutting a release - NOT from
// `npm run verify`. The fingerprint covers every tracked and untracked product
// file (see productPaths in lib/releaseSourceEvidence.mjs), so it is false by
// construction on any branch that has moved past the last capture. While it sat
// inside `verify` it failed CI for every pull request, including all five
// Dependabot updates, which is why dependencies had gone stale: a single
// package-lock.json line was enough to break the build.
import { createHash } from 'node:crypto';
import {
  access,
  readFile,
} from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  assertSafeRepositoryPath,
  countGifFrames,
  imageDimensions,
} from './lib/releaseMedia.mjs';
import {
  fingerprintCommittedProductSource,
  inspectReleaseSourceEvidence,
  RELEASE_SOURCE_FINGERPRINT_ALGORITHM,
} from './lib/releaseSourceEvidence.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'));
const config = JSON.parse(
  await readFile(path.join(projectRoot, 'scripts', 'release-media.config.json'), 'utf8'),
);
const versionLabel = `v${packageJson.version}`;
const versionRoot = `assets/releases/${versionLabel}/`;
const sourceEvidence = inspectReleaseSourceEvidence(projectRoot, packageJson.version);
const detailedPath = path.join(projectRoot, 'assets', 'releases', versionLabel, 'release-media.json');
const profilePath = path.join(projectRoot, 'public', 'release-profile-manifest.json');
const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime())
    && date.toISOString().slice(0, 10) === value;
}

async function fileHash(relativePath) {
  assertSafeRepositoryPath(relativePath);
  const bytes = await readFile(path.join(projectRoot, ...relativePath.split('/')));
  return {
    bytes,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

check(config.schema === 'nova-music-release-media-config-v1', 'Unexpected release-media config schema');
check(config.version === packageJson.version, 'Config version must match package version');
check(
  ['private-candidate', 'deployed'].includes(config.status),
  `Unsupported release-media status ${String(config.status)}`,
);
check(isIsoDate(config.captured_on), 'captured_on must be a valid YYYY-MM-DD date');
if (config.status === 'private-candidate') {
  check(config.deployed_on === null, 'A private candidate cannot have deployed_on evidence');
  check(config.commit === null, 'A tracked private candidate cannot claim a deployment commit');
} else {
  check(isIsoDate(config.deployed_on), 'A deployed release requires deployed_on');
  check(/^[0-9a-f]{40}$/.test(config.commit ?? ''), 'A deployed release requires a 40-character commit');
}

let detailed;
let profile;
try {
  detailed = JSON.parse(await readFile(detailedPath, 'utf8'));
} catch (error) {
  errors.push(`Could not read ${path.relative(projectRoot, detailedPath)}: ${error.message}`);
}
try {
  profile = JSON.parse(await readFile(profilePath, 'utf8'));
} catch (error) {
  errors.push(`Could not read ${path.relative(projectRoot, profilePath)}: ${error.message}`);
}

if (detailed) {
  check(detailed.schema === 'nova-music-release-media-v1', 'Unexpected detailed manifest schema');
  check(detailed.release?.version === packageJson.version, 'Detailed manifest version must match package');
  check(detailed.release?.status === config.status, 'Detailed manifest status must match config');
  check(detailed.release?.captured_on === config.captured_on, 'Detailed captured_on must match config');
  check(detailed.release?.deployed_on === config.deployed_on, 'Detailed deployed_on must match config');
  check(
    /^[0-9a-f]{40}$/.test(detailed.release?.source_head_commit ?? ''),
    'Detailed manifest must retain its 40-character source HEAD commit',
  );
  check(
    ['committed-product-source', 'working-tree-candidate'].includes(
      detailed.release?.source_state,
    ),
    'Detailed source state must describe committed or working-tree product source',
  );
  check(
    detailed.release?.source_fingerprint_algorithm === RELEASE_SOURCE_FINGERPRINT_ALGORITHM,
    `Detailed manifest must use ${RELEASE_SOURCE_FINGERPRINT_ALGORITHM}`,
  );
  check(
    /^[0-9a-f]{64}$/.test(detailed.release?.source_fingerprint ?? ''),
    'Detailed manifest needs a lowercase SHA-256 source fingerprint',
  );
  check(
    Number.isInteger(detailed.release?.source_file_count)
      && detailed.release.source_file_count > 0,
    'Detailed manifest needs a positive source file count',
  );
  check(
    detailed.release?.source_fingerprint === sourceEvidence.sourceFingerprint,
    'Product source changed after the release visuals were captured',
  );
  check(
    detailed.release?.source_file_count === sourceEvidence.sourceFileCount,
    'Product source file count changed after the release visuals were captured',
  );
  check(
    detailed.release?.source_state === sourceEvidence.sourceState,
    'Detailed source state no longer matches the product worktree',
  );
  if (detailed.release?.source_state === 'committed-product-source') {
    check(
      /^[0-9a-f]{40}$/.test(detailed.release?.source_commit ?? ''),
      'Committed product source requires a 40-character source commit',
    );
    check(
      detailed.release?.source_commit === detailed.release?.source_head_commit,
      'Committed product source must identify the exact captured HEAD',
    );

    if (/^[0-9a-f]{40}$/.test(detailed.release?.source_commit ?? '')) {
      let sourceCommitAvailable = false;
      try {
        execFileSync('git', ['cat-file', '-e', `${detailed.release.source_commit}^{commit}`], {
          cwd: projectRoot,
          stdio: 'ignore',
        });
        sourceCommitAvailable = true;
      } catch {
        console.warn(
          `Release-media audit note: captured source commit is not available locally (${detailed.release.source_commit}); current product-tree evidence remains authoritative.`,
        );
      }

      if (sourceCommitAvailable) {
        try {
          const capturedEvidence = fingerprintCommittedProductSource(
            projectRoot,
            packageJson.version,
            detailed.release.source_commit,
          );
          check(
            capturedEvidence.sourceFingerprint === detailed.release.source_fingerprint,
            'Detailed fingerprint does not match the declared source commit',
          );
          check(
            capturedEvidence.sourceFileCount === detailed.release.source_file_count,
            'Detailed file count does not match the declared source commit',
          );
        } catch (error) {
          errors.push(`Could not fingerprint captured source commit: ${error.message}`);
        }
      }
    }
  } else if (detailed.release?.source_state === 'working-tree-candidate') {
    check(
      detailed.release?.source_commit === null,
      'A working-tree candidate cannot claim a committed product source',
    );
    check(
      detailed.release?.source_head_commit === sourceEvidence.sourceHeadCommit,
      'Working-tree candidate HEAD changed after capture',
    );
  }
}

if (profile) {
  check(profile.schema === 'nova-music-profile-release-v1', 'Unexpected public profile manifest schema');
  check(profile.release?.version === packageJson.version, 'Profile manifest version must match package');
  check(profile.release?.status === config.status, 'Profile manifest status must match config');
  check(profile.release?.commit === config.commit, 'Profile manifest commit must match config');
  check(profile.release?.captured_on === config.captured_on, 'Profile captured_on must match config');
  check(profile.release?.deployed_on === config.deployed_on, 'Profile deployed_on must match config');
  check(profile.repository === config.repository, 'Profile repository must match config');
  check(profile.default_branch === config.default_branch, 'Profile default branch must match config');
  check(profile.live_url === config.live_url, 'Profile live URL must match config');
}

const expectedIds = new Set([
  'profile-hero-desktop',
  'profile-hero-mobile',
  'genres-desktop',
  'artist-atlas-desktop',
  'guest-museum-desktop',
  'hebrew-mobile',
  'profile-tour-static',
  'profile-tour',
  'social-preview',
]);
const detailedMedia = Array.isArray(detailed?.media) ? detailed.media : [];
const profileMedia = Array.isArray(profile?.media) ? profile.media : [];
const ids = new Set();
const paths = new Set();

check(detailedMedia.length === expectedIds.size, `Expected ${expectedIds.size} detailed media records`);
check(profileMedia.length === expectedIds.size, `Expected ${expectedIds.size} profile media records`);

for (const item of detailedMedia) {
  check(typeof item?.id === 'string' && item.id.length > 0, 'Every media item needs an id');
  check(!ids.has(item.id), `Duplicate media id: ${item.id}`);
  ids.add(item.id);
  check(expectedIds.has(item.id), `Unexpected media id: ${item.id}`);
  check(typeof item.path === 'string' && item.path.startsWith(versionRoot), `${item.id} must live under ${versionRoot}`);
  check(!paths.has(item.path), `Duplicate media path: ${item.path}`);
  paths.add(item.path);
  check(['en', 'es', 'he'].includes(item.lang), `${item.id} has unsupported lang`);
  check(typeof item.theme === 'string' && item.theme.length > 0, `${item.id} needs a theme`);
  check(
    Number.isInteger(item.viewport?.width)
      && item.viewport.width > 0
      && Number.isInteger(item.viewport?.height)
      && item.viewport.height > 0,
    `${item.id} needs a positive viewport`,
  );

  try {
    const disk = await fileHash(item.path);
    const dimensions = imageDimensions(disk.bytes, item.path);
    check(disk.sha256 === item.sha256, `${item.id} SHA-256 mismatch`);
    check(disk.bytes.length === item.bytes, `${item.id} byte count mismatch`);
    check(dimensions.width === item.width, `${item.id} width mismatch`);
    check(dimensions.height === item.height, `${item.id} height mismatch`);
  } catch (error) {
    errors.push(`${item.id} could not be audited: ${error.message}`);
  }
}

for (const id of expectedIds) check(ids.has(id), `Missing required media id: ${id}`);
check(
  /\.(?:png|jpe?g|webp)$/i.test(detailedMedia.find(item => item.id === 'profile-hero-desktop')?.path ?? ''),
  'profile-hero-desktop must be PNG, JPEG or WebP',
);
check(
  /\.(?:png|jpe?g|webp)$/i.test(detailedMedia.find(item => item.id === 'profile-hero-mobile')?.path ?? ''),
  'profile-hero-mobile must be PNG, JPEG or WebP',
);
check(
  /\.(?:gif|webp)$/i.test(detailedMedia.find(item => item.id === 'profile-tour')?.path ?? ''),
  'profile-tour must be animated GIF or WebP',
);

const profileTour = detailedMedia.find(item => item.id === 'profile-tour');
if (profileTour?.path?.endsWith('.gif')) {
  try {
    const { bytes } = await fileHash(profileTour.path);
    check(countGifFrames(bytes) === 5, 'profile-tour GIF must contain its five documented frames');
  } catch (error) {
    errors.push(`profile-tour animation could not be audited: ${error.message}`);
  }
}
check(detailed?.animation?.media_id === 'profile-tour', 'Detailed animation metadata is missing');
check(detailed?.animation?.frames === 5, 'Detailed animation metadata must declare five frames');
check(detailed?.animation?.frame_delay_ms === 2200, 'Detailed animation delay must be 2200 ms');
check(
  detailed?.animation?.reduced_motion_fallback_media_id === 'profile-tour-static',
  'Detailed animation metadata must declare the reduced-motion fallback',
);

const detailedById = new Map(detailedMedia.map(item => [item.id, item]));
const profileById = new Map(profileMedia.map(item => [item.id, item]));
for (const id of expectedIds) {
  check(
    JSON.stringify(profileById.get(id)) === JSON.stringify(detailedById.get(id)),
    `${id} differs between the detailed and public profile manifests`,
  );
}

const fallbacks = Array.isArray(detailed?.fallbacks) ? detailed.fallbacks : [];
const tourFallback = fallbacks.find(entry => entry.media_id === 'profile-tour');
check(tourFallback?.fallback_media_id === 'profile-tour-static', 'profile-tour needs its static fallback');
check(detailedById.has(tourFallback?.fallback_media_id), 'profile-tour fallback file is missing');

const aliases = Array.isArray(detailed?.legacy_aliases) ? detailed.legacy_aliases : [];
for (const alias of aliases) {
  const source = detailedById.get(alias.media_id);
  if (!source) {
    errors.push(`Legacy alias references unknown media id ${String(alias.media_id)}`);
    continue;
  }
  try {
    await access(path.join(projectRoot, ...alias.path.split('/')), fsConstants.R_OK);
    const [sourceHash, aliasHash] = await Promise.all([
      fileHash(source.path),
      fileHash(alias.path),
    ]);
    check(sourceHash.sha256 === aliasHash.sha256, `Legacy alias is stale: ${alias.path}`);
  } catch (error) {
    errors.push(`Legacy alias could not be audited (${alias.path}): ${error.message}`);
  }
}

if (errors.length > 0) {
  console.error('Release-media audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Release-media audit passed: ${detailedMedia.length} assets for ${versionLabel} (${config.status}).`,
  );
}
