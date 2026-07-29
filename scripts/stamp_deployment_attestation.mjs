import {
  readFile,
  writeFile,
} from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime())
    && date.toISOString().slice(0, 10) === value;
}

/**
 * Converts the verified candidate manifest copied into dist into deployment
 * evidence. Source files are deliberately outside this function's write
 * boundary, so a tracked manifest never makes a self-referential SHA claim.
 */
export async function stampDeploymentAttestation({
  distDir,
  packagePath,
  commit,
  deployedOn,
}) {
  assert(SHA_PATTERN.test(commit ?? ''), 'Deployment commit must be a lowercase 40-character Git SHA.');
  assert(isValidDate(deployedOn), 'Deployment date must be a valid YYYY-MM-DD date.');

  const manifestPath = path.join(distDir, 'release-profile-manifest.json');
  const buildMetaPath = path.join(distDir, 'build-meta.json');
  const [packageJson, candidateManifest] = await Promise.all([
    readFile(packagePath, 'utf8').then(JSON.parse),
    readFile(manifestPath, 'utf8').then(JSON.parse),
  ]);

  assert(
    candidateManifest.schema === 'nova-music-profile-release-v1',
    'Unexpected release-profile manifest schema.',
  );
  assert(
    candidateManifest.release?.status === 'private-candidate',
    'Deployment stamping requires a private-candidate source manifest.',
  );
  assert(
    candidateManifest.release?.commit === null,
    'A tracked private-candidate manifest must not claim a deployment commit.',
  );
  assert(
    candidateManifest.release?.deployed_on === null,
    'A tracked private-candidate manifest must not claim a deployment date.',
  );
  assert(
    candidateManifest.release?.version === packageJson.version,
    'Release-profile version must match package.json.',
  );

  const deployedManifest = {
    ...candidateManifest,
    release: {
      ...candidateManifest.release,
      status: 'deployed',
      commit,
      deployed_on: deployedOn,
    },
  };
  const buildMeta = {
    schema: 'nova-music-build-meta-v1',
    commit,
    version: packageJson.version,
    release_status: 'deployed',
    deployed_on: deployedOn,
  };

  await Promise.all([
    writeFile(manifestPath, `${JSON.stringify(deployedManifest, null, 2)}\n`),
    writeFile(buildMetaPath, `${JSON.stringify(buildMeta, null, 2)}\n`),
  ]);

  return { buildMeta, deployedManifest };
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const commit = process.env.BUILD_COMMIT ?? process.env.GITHUB_SHA;
  const deployedOn = process.env.DEPLOYED_ON ?? new Date().toISOString().slice(0, 10);
  const { buildMeta } = await stampDeploymentAttestation({
    distDir: path.join(projectRoot, 'dist'),
    packagePath: path.join(projectRoot, 'package.json'),
    commit,
    deployedOn,
  });
  process.stdout.write(
    `Stamped deployed Nova Music Lab v${buildMeta.version} at ${buildMeta.commit} (${buildMeta.deployed_on}).\n`,
  );
}
