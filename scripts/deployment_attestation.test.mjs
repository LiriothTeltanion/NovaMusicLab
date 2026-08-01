import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { stampDeploymentAttestation } from './stamp_deployment_attestation.mjs';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const VERSION = '1.5.0';
const DATE = '2026-07-29';
const temporaryRoots = [];

async function createFixture(overrides = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nova-deployment-attestation-'));
  temporaryRoots.push(root);
  const distDir = path.join(root, 'dist');
  const publicDir = path.join(root, 'public');
  const packagePath = path.join(root, 'package.json');
  await Promise.all([mkdir(distDir), mkdir(publicDir)]);

  const manifest = {
    schema: 'nova-music-profile-release-v1',
    release: {
      status: 'private-candidate',
      version: VERSION,
      commit: null,
      captured_on: DATE,
      deployed_on: null,
      ...overrides.release,
    },
    repository: 'LiriothTeltanion/NovaMusicLab',
    default_branch: 'main',
    live_url: 'https://liriothteltanion.github.io/NovaMusicLab/',
    media: [],
  };
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  const publicManifestPath = path.join(publicDir, 'release-profile-manifest.json');
  await Promise.all([
    writeFile(packagePath, `${JSON.stringify({ version: overrides.packageVersion ?? VERSION })}\n`),
    writeFile(path.join(distDir, 'release-profile-manifest.json'), manifestText),
    writeFile(publicManifestPath, manifestText),
  ]);

  return { distDir, packagePath, publicManifestPath, sourceText: manifestText };
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('deployment attestation', () => {
  it('stamps only dist and gives the manifest and build marker one exact identity', async () => {
    const fixture = await createFixture();
    const result = await stampDeploymentAttestation({
      distDir: fixture.distDir,
      packagePath: fixture.packagePath,
      commit: COMMIT,
      deployedOn: DATE,
    });

    expect(result.deployedManifest.release).toMatchObject({
      status: 'deployed',
      version: VERSION,
      commit: COMMIT,
      deployed_on: DATE,
    });
    expect(result.buildMeta).toEqual({
      schema: 'nova-music-build-meta-v1',
      commit: COMMIT,
      version: VERSION,
      release_status: 'deployed',
      deployed_on: DATE,
    });
    expect(JSON.parse(await readFile(
      path.join(fixture.distDir, 'build-meta.json'),
      'utf8',
    ))).toEqual(result.buildMeta);
    expect(await readFile(fixture.publicManifestPath, 'utf8')).toBe(fixture.sourceText);
  });

  it('rejects malformed commits, version drift and a source that already claims deployment', async () => {
    const badShaFixture = await createFixture();
    await expect(stampDeploymentAttestation({
      distDir: badShaFixture.distDir,
      packagePath: badShaFixture.packagePath,
      commit: 'not-a-sha',
      deployedOn: DATE,
    })).rejects.toThrow(/40-character Git SHA/);
    await expect(stampDeploymentAttestation({
      distDir: badShaFixture.distDir,
      packagePath: badShaFixture.packagePath,
      commit: COMMIT,
      deployedOn: '2026-02-30',
    })).rejects.toThrow(/valid YYYY-MM-DD/);

    const driftFixture = await createFixture({ packageVersion: '1.4.1' });
    await expect(stampDeploymentAttestation({
      distDir: driftFixture.distDir,
      packagePath: driftFixture.packagePath,
      commit: COMMIT,
      deployedOn: DATE,
    })).rejects.toThrow(/version must match/);

    const deployedFixture = await createFixture({
      release: { status: 'deployed', commit: COMMIT, deployed_on: DATE },
    });
    await expect(stampDeploymentAttestation({
      distDir: deployedFixture.distDir,
      packagePath: deployedFixture.packagePath,
      commit: COMMIT,
      deployedOn: DATE,
    })).rejects.toThrow(/private-candidate source/);
  });
});
