import { execFileSync } from 'node:child_process';
import {
  mkdtemp,
  mkdir,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  fingerprintCommittedProductSource,
  inspectReleaseSourceEvidence,
  isGeneratedReleaseOutput,
  RELEASE_SOURCE_FINGERPRINT_ALGORITHM,
} from './lib/releaseSourceEvidence.mjs';

const VERSION = '1.5.0';
// Windows Defender and OneDrive can make temporary Git fixtures unusually
// slow even though the assertions are deterministic and synchronous.
const GIT_TEST_TIMEOUT_MS = 45_000;
const temporaryRoots = [];

function git(root, args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

async function createRepositoryFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nova-release-source-'));
  temporaryRoots.push(root);

  await Promise.all([
    mkdir(path.join(root, 'assets', 'releases', 'v1.5.0'), { recursive: true }),
    mkdir(path.join(root, 'assets', 'screenshots'), { recursive: true }),
    mkdir(path.join(root, 'public'), { recursive: true }),
    mkdir(path.join(root, 'src'), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(path.join(root, '.gitattributes'), '* text=auto eol=lf\n'),
    writeFile(path.join(root, '.gitignore'), 'ignored/\n'),
    writeFile(path.join(root, 'assets', 'releases', 'v1.5.0', 'home.jpg'), Buffer.from([1, 2, 3])),
    writeFile(path.join(root, 'assets', 'screenshots', 'nova-home-desktop.jpg'), Buffer.from([4, 5, 6])),
    writeFile(path.join(root, 'public', 'release-profile-manifest.json'), '{}\n'),
    writeFile(path.join(root, 'src', 'binary source.dat'), Buffer.from([0, 255, 13, 10, 128])),
    writeFile(path.join(root, 'src', 'deleted source.js'), 'export const legacy = true;\n'),
    writeFile(path.join(root, 'src', 'main.js'), 'export const museum = true;\n'),
  ]);

  git(root, ['init']);
  git(root, ['config', 'user.email', 'nova.example.test']);
  git(root, ['config', 'user.name', 'Nova Test']);
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'test fixture']);

  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, {
    recursive: true,
    force: true,
  })));
});

describe('release source evidence', () => {
  it('reports a clean product source at HEAD with a deterministic binary-safe fingerprint', async () => {
    const root = await createRepositoryFixture();
    const first = inspectReleaseSourceEvidence(root, VERSION);
    const second = inspectReleaseSourceEvidence(root, VERSION);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      sourceHeadCommit: git(root, ['rev-parse', 'HEAD']),
      sourceCommit: git(root, ['rev-parse', 'HEAD']),
      sourceState: 'committed-product-source',
      sourceFingerprintAlgorithm: RELEASE_SOURCE_FINGERPRINT_ALGORITHM,
      sourceFileCount: 5,
    });
    expect(first).toMatchObject(
      fingerprintCommittedProductSource(root, VERSION),
    );
    expect(first.sourceFingerprint).toMatch(/^[0-9a-f]{64}$/);
  }, GIT_TEST_TIMEOUT_MS);

  it('uses canonical Git blob bytes instead of checkout line endings for committed evidence', async () => {
    const root = await createRepositoryFixture();
    const baseline = inspectReleaseSourceEvidence(root, VERSION);

    await writeFile(
      path.join(root, 'src', 'main.js'),
      'export const museum = true;\r\n',
    );

    git(root, ['diff', '--quiet', 'HEAD']);
    expect(inspectReleaseSourceEvidence(root, VERSION)).toEqual(baseline);
    expect(fingerprintCommittedProductSource(root, VERSION)).toMatchObject({
      sourceFingerprint: baseline.sourceFingerprint,
      sourceFileCount: baseline.sourceFileCount,
    });
  }, GIT_TEST_TIMEOUT_MS);

  it('includes the exact Git file mode in committed fingerprints', async () => {
    const root = await createRepositoryFixture();
    const baseline = fingerprintCommittedProductSource(root, VERSION);

    git(root, ['update-index', '--chmod=+x', 'src/main.js']);
    git(root, ['commit', '-m', 'make fixture executable']);

    expect(fingerprintCommittedProductSource(root, VERSION).sourceFingerprint)
      .not.toBe(baseline.sourceFingerprint);
  }, GIT_TEST_TIMEOUT_MS);

  it('ignores only generated outputs for the indicated release across path styles', async () => {
    const root = await createRepositoryFixture();
    const baseline = inspectReleaseSourceEvidence(root, VERSION);

    await Promise.all([
      writeFile(
        path.join(root, 'assets', 'releases', 'v1.5.0', 'home.jpg'),
        Buffer.from([9, 8, 7, 6]),
      ),
      writeFile(
        path.join(root, 'assets', 'screenshots', 'nova-home-desktop.jpg'),
        Buffer.from([6, 5, 4, 3]),
      ),
      writeFile(path.join(root, 'public', 'social-preview-v2.png'), Buffer.from([0, 1])),
    ]);

    expect(inspectReleaseSourceEvidence(root, VERSION)).toEqual(baseline);
    expect(isGeneratedReleaseOutput(
      'assets\\releases\\v1.5.0\\nested image.jpg',
      VERSION,
    )).toBe(true);
    expect(isGeneratedReleaseOutput(
      'assets/releases/v1.3.0/home.jpg',
      VERSION,
    )).toBe(false);
  }, GIT_TEST_TIMEOUT_MS);

  it('marks changed or deleted tracked product source as a dirty candidate', async () => {
    const root = await createRepositoryFixture();
    const baseline = inspectReleaseSourceEvidence(root, VERSION);
    await writeFile(
      path.join(root, 'src', 'binary source.dat'),
      Buffer.from([0, 255, 13, 10, 129]),
    );
    const modified = inspectReleaseSourceEvidence(root, VERSION);

    expect(modified.sourceCommit).toBeNull();
    expect(modified.sourceState).toBe('working-tree-candidate');
    expect(modified.sourceFingerprint).not.toBe(baseline.sourceFingerprint);

    await writeFile(
      path.join(root, 'src', 'binary source.dat'),
      Buffer.from([0, 255, 13, 10, 128]),
    );
    expect(inspectReleaseSourceEvidence(root, VERSION)).toEqual(baseline);

    await unlink(path.join(root, 'src', 'deleted source.js'));
    const deleted = inspectReleaseSourceEvidence(root, VERSION);

    expect(deleted.sourceCommit).toBeNull();
    expect(deleted.sourceState).toBe('working-tree-candidate');
    expect(deleted.sourceFingerprint).not.toBe(baseline.sourceFingerprint);
  }, GIT_TEST_TIMEOUT_MS);

  it('includes untracked, non-ignored product files with spaces and excludes ignored files', async () => {
    const root = await createRepositoryFixture();
    const baseline = inspectReleaseSourceEvidence(root, VERSION);
    await Promise.all([
      mkdir(path.join(root, 'visitor files'), { recursive: true }),
      mkdir(path.join(root, 'ignored'), { recursive: true }),
    ]);
    await Promise.all([
      writeFile(
        path.join(root, 'visitor files', 'music archive.bin'),
        Buffer.from([222, 173, 190, 239]),
      ),
      writeFile(path.join(root, 'ignored', 'private.txt'), 'not public\n'),
    ]);

    const evidence = inspectReleaseSourceEvidence(root, VERSION);
    expect(evidence.sourceCommit).toBeNull();
    expect(evidence.sourceState).toBe('working-tree-candidate');
    expect(evidence.sourceFileCount).toBe(baseline.sourceFileCount + 1);
    expect(evidence.sourceFingerprint).not.toBe(baseline.sourceFingerprint);
  }, GIT_TEST_TIMEOUT_MS);
});
