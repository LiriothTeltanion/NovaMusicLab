import { createHash } from 'node:crypto';
import {
  lstatSync,
  readFileSync,
  readlinkSync,
} from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

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

function parseNullDelimitedPaths(buffer) {
  const output = buffer.toString('utf8');
  if (output.length === 0) return [];

  return output
    .split('\0')
    .filter(Boolean)
    .map(normalizeRepositoryPath);
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

function hashProductPath(hash, projectRoot, relativePath) {
  const absolutePath = path.join(projectRoot, ...relativePath.split('/'));
  hash.update(relativePath);
  hash.update('\0');

  let stats;
  try {
    stats = lstatSync(absolutePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      hash.update('missing');
      hash.update('\0');
      return;
    }
    throw error;
  }

  if (stats.isFile()) {
    hash.update('file');
    hash.update('\0');
    hash.update(readFileSync(absolutePath));
    hash.update('\0');
    return;
  }

  if (stats.isSymbolicLink()) {
    hash.update('symlink');
    hash.update('\0');
    hash.update(Buffer.from(readlinkSync(absolutePath), 'utf8'));
    hash.update('\0');
    return;
  }

  throw new Error(`Unsupported tracked repository entry: ${relativePath}`);
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

  const paths = productPaths(absoluteProjectRoot, version);
  const hash = createHash('sha256');
  hash.update('nova-release-product-source-v1');
  hash.update('\0');
  for (const relativePath of paths) {
    hashProductPath(hash, absoluteProjectRoot, relativePath);
  }

  const hasProductChanges = productHasChanges(absoluteProjectRoot, version);

  return {
    sourceHeadCommit,
    sourceCommit: hasProductChanges ? null : sourceHeadCommit,
    sourceState: hasProductChanges
      ? 'working-tree-candidate'
      : 'committed-product-source',
    sourceFingerprint: hash.digest('hex'),
    sourceFileCount: paths.length,
  };
}
