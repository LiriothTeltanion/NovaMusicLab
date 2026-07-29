import { createHash } from 'node:crypto';
import {
  lstatSync,
  readFileSync,
  readlinkSync,
} from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const RELEASE_SOURCE_FINGERPRINT_ALGORITHM = 'nova-release-source-sha256-v2';

const RELEASE_OUTPUT_ALIASES = new Set([
  'assets/screenshots/nova-home-desktop.jpg',
  'assets/screenshots/living-artist-atlas-desktop.jpg',
  'assets/screenshots/guest-museum-desktop.jpg',
  'assets/screenshots/share-hebrew-light-mobile.jpg',
  'public/social-preview-v2.png',
  'public/release-profile-manifest.json',
]);

function normalizeRepositoryPath(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\.\/+/, '');
  if (
    normalized.length === 0
    || path.posix.isAbsolute(normalized)
    || normalized.split('/').includes('..')
  ) {
    throw new Error(`Unsafe Git repository path: ${relativePath}`);
  }
  return normalized;
}

function normalizeVersion(version) {
  if (typeof version !== 'string' || version.trim() !== version || version.length === 0) {
    throw new Error('Release version must be a non-empty string without surrounding whitespace');
  }

  const unprefixedVersion = version.startsWith('v') ? version.slice(1) : version;
  if (!/^[0-9A-Za-z][0-9A-Za-z.-]*$/.test(unprefixedVersion)) {
    throw new Error(`Unsafe release version: ${version}`);
  }
  return `v${unprefixedVersion}`;
}

function gitOutput(projectRoot, args) {
  try {
    return execFileSync('git', args, {
      cwd: projectRoot,
      encoding: 'buffer',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const details = error.stderr?.toString('utf8').trim();
    throw new Error(
      `Git command failed (git ${args.join(' ')}): ${details || error.message}`,
      { cause: error },
    );
  }
}

function splitNullDelimitedRecords(buffer) {
  const records = [];
  let recordStart = 0;

  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] !== 0) continue;
    if (index > recordStart) records.push(buffer.subarray(recordStart, index));
    recordStart = index + 1;
  }

  if (recordStart < buffer.length) {
    records.push(buffer.subarray(recordStart));
  }
  return records;
}

function decodeGitPath(buffer) {
  const decoded = buffer.toString('utf8');
  if (!Buffer.from(decoded, 'utf8').equals(buffer)) {
    throw new Error('Git path is not valid round-trip UTF-8');
  }
  return normalizeRepositoryPath(decoded);
}

function parseNullDelimitedPaths(buffer) {
  return splitNullDelimitedRecords(buffer).map(decodeGitPath);
}

function parseNullDelimitedTreeEntries(buffer) {
  return splitNullDelimitedRecords(buffer)
    .map(record => {
      const separatorIndex = record.indexOf(0x09);
      if (separatorIndex < 0) {
        throw new Error('Malformed Git tree entry without a path separator');
      }

      const metadataBuffer = record.subarray(0, separatorIndex);
      const metadata = metadataBuffer.toString('ascii');
      if (!Buffer.from(metadata, 'ascii').equals(metadataBuffer)) {
        throw new Error('Git tree metadata is not ASCII');
      }
      const [mode, type, objectId] = metadata.split(' ');
      if (
        !/^[0-7]{6}$/.test(mode ?? '')
        || !['blob', 'commit'].includes(type)
        || !/^[0-9a-f]{40,64}$/.test(objectId ?? '')
      ) {
        throw new Error(`Unsupported Git tree metadata: ${metadata}`);
      }

      return {
        mode,
        type,
        objectId,
        path: decodeGitPath(record.subarray(separatorIndex + 1)),
      };
    });
}

function listGitPaths(projectRoot, args) {
  return parseNullDelimitedPaths(gitOutput(projectRoot, args));
}

function compareRepositoryPaths(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function isGeneratedReleaseOutput(relativePath, version) {
  const normalizedPath = normalizeRepositoryPath(relativePath);
  const versionDirectory = `assets/releases/${normalizeVersion(version)}/`;

  return normalizedPath.startsWith(versionDirectory)
    || RELEASE_OUTPUT_ALIASES.has(normalizedPath);
}

function productPaths(projectRoot, version) {
  const repositoryPaths = listGitPaths(projectRoot, [
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '-z',
  ]);

  return [...new Set(repositoryPaths)]
    .filter(relativePath => !isGeneratedReleaseOutput(relativePath, version))
    .sort(compareRepositoryPaths);
}

function committedProductEntries(projectRoot, version, ref) {
  return parseNullDelimitedTreeEntries(gitOutput(projectRoot, [
    'ls-tree',
    '--full-tree',
    '-r',
    '-z',
    ref,
  ]))
    .filter(entry => !isGeneratedReleaseOutput(entry.path, version))
    .sort((left, right) => compareRepositoryPaths(left.path, right.path));
}

function productHasChanges(projectRoot, version) {
  const changedTrackedPaths = listGitPaths(projectRoot, [
    'diff',
    '--name-only',
    '--no-renames',
    '-z',
    'HEAD',
    '--',
  ]);
  const untrackedPaths = listGitPaths(projectRoot, [
    'ls-files',
    '--others',
    '--exclude-standard',
    '-z',
  ]);

  return [...changedTrackedPaths, ...untrackedPaths]
    .some(relativePath => !isGeneratedReleaseOutput(relativePath, version));
}

function hashField(hash, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  const length = Buffer.allocUnsafe(8);
  length.writeBigUInt64BE(BigInt(bytes.length));
  hash.update(length);
  hash.update(bytes);
}

function hashProductPath(hash, projectRoot, relativePath) {
  const absolutePath = path.join(projectRoot, ...relativePath.split('/'));
  hashField(hash, relativePath);

  let stats;
  try {
    stats = lstatSync(absolutePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      hashField(hash, 'missing');
      return;
    }
    throw error;
  }

  if (stats.isFile()) {
    hashField(hash, 'file');
    hashField(hash, readFileSync(absolutePath));
    return;
  }

  if (stats.isSymbolicLink()) {
    hashField(hash, 'symlink');
    hashField(hash, Buffer.from(readlinkSync(absolutePath), 'utf8'));
    return;
  }

  throw new Error(`Unsupported tracked repository entry: ${relativePath}`);
}

function sourceFingerprintHash() {
  const hash = createHash('sha256');
  hashField(hash, RELEASE_SOURCE_FINGERPRINT_ALGORITHM);
  return hash;
}

function hashCommittedProductEntry(hash, projectRoot, entry) {
  hashField(hash, entry.path);
  hashField(hash, entry.mode);
  hashField(hash, entry.type);

  if (entry.type === 'commit') {
    hashField(hash, entry.objectId);
    return;
  }

  hashField(hash, gitOutput(projectRoot, ['cat-file', 'blob', entry.objectId]));
}

export function fingerprintCommittedProductSource(projectRoot, version, ref = 'HEAD') {
  const absoluteProjectRoot = path.resolve(projectRoot);
  const entries = committedProductEntries(absoluteProjectRoot, version, ref);
  const hash = sourceFingerprintHash();
  for (const entry of entries) {
    hashCommittedProductEntry(hash, absoluteProjectRoot, entry);
  }

  return {
    sourceFingerprintAlgorithm: RELEASE_SOURCE_FINGERPRINT_ALGORITHM,
    sourceFingerprint: hash.digest('hex'),
    sourceFileCount: entries.length,
  };
}

export function inspectReleaseSourceEvidence(projectRoot, version) {
  const absoluteProjectRoot = path.resolve(projectRoot);
  const sourceHeadCommit = gitOutput(absoluteProjectRoot, [
    'rev-parse',
    '--verify',
    'HEAD',
  ]).toString('utf8').trim().toLowerCase();

  if (!/^[0-9a-f]{40,64}$/.test(sourceHeadCommit)) {
    throw new Error(`Git HEAD did not resolve to a valid commit: ${sourceHeadCommit}`);
  }

  const hasProductChanges = productHasChanges(absoluteProjectRoot, version);
  let fingerprint;
  if (hasProductChanges) {
    const paths = productPaths(absoluteProjectRoot, version);
    const hash = sourceFingerprintHash();
    for (const relativePath of paths) {
      hashProductPath(hash, absoluteProjectRoot, relativePath);
    }
    fingerprint = {
      sourceFingerprintAlgorithm: RELEASE_SOURCE_FINGERPRINT_ALGORITHM,
      sourceFingerprint: hash.digest('hex'),
      sourceFileCount: paths.length,
    };
  } else {
    fingerprint = fingerprintCommittedProductSource(
      absoluteProjectRoot,
      version,
      sourceHeadCommit,
    );
  }

  return {
    sourceHeadCommit,
    sourceCommit: hasProductChanges ? null : sourceHeadCommit,
    sourceState: hasProductChanges
      ? 'working-tree-candidate'
      : 'committed-product-source',
    ...fingerprint,
  };
}
