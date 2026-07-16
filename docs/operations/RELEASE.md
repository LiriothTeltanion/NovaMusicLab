# Release Guide

Nova Music Lab uses Semantic Versioning beginning with the first stable `v1.0.0` release.

## Branch model

- `main` is production and must remain deployable.
- Use focused `codex/<scope>` branches and pull requests.
- Use squash merge and delete merged branches.
- Use a focused `codex/<release-scope>` branch for final cross-cutting release preparation.

## v1 launch progression

1. Prepare `1.0.0-rc.1` after all v1 feature and migration work is integrated.
2. Run the complete automated and browser acceptance matrix.
3. Deploy the release candidate from verified `main` and observe it in production.
4. Fix regressions through focused pull requests and publish another RC if necessary.
5. Promote the proven commit to `1.0.0` without unrelated feature changes.
6. Create annotated tag `v1.0.0` and a GitHub Release.

## v1.0 acceptance record

This record captures the accepted release candidate. The exact commit/version and Pages checks are repeated after the stable promotion merges, before the immutable stable tag is created.

- [x] `npm ci` succeeds on the supported Node version.
- [x] `npm run verify` is green and warning policy is intentional.
- [x] Public bundle privacy audit is green.
- [x] CodeQL and dependency review are green.
- [x] Flagship/visitor boundary tests pass with an unrelated archive.
- [x] Import, save, restore, export and clear journeys pass.
- [x] EN/ES/HE, RTL, mobile, desktop, keyboard, contrast and reduced motion pass.
- [x] README, metadata, manifest, changelog and package version agree.
- [x] No raw archive, API key or private CV exists in the diff or build artifact.
- [x] Pages deploy and post-deploy smoke test pass.

The Pages workflow cancels any older run for the same branch when a newer push arrives. Before upload, it writes `dist/build-meta.json` with the verified Git commit and package version. The smoke job accepts the deployment only when both the museum HTML and that exact commit/version marker are live, preventing a healthy but stale Pages artifact from passing release acceptance.

## Release metadata

Title:

> Nova Music Lab v1.0 — The Evidence-First Museum

Summary:

> The first stable Nova Music Lab release separates the public flagship exhibition from private visitor archives, strengthens import and storage reliability, refreshes the visual system, and formalizes privacy, accessibility and release governance.

Attach privacy-safe screenshots and link to the live museum, changelog, security policy and architecture overview.

## Rollback

If the deployed build fails acceptance:

1. Stop promoting the release; do not retag an existing version.
2. Revert the smallest offending change through a reviewed pull request.
3. Let the verified Pages workflow deploy the corrected `main` artifact.
4. Confirm the smoke test and manually verify the affected journey.
5. Publish a new patch or release-candidate version; never move a published release tag silently.

## External GitHub settings

The v1 baseline requires `Verify`, `Analyze JavaScript and TypeScript`, and `Dependency review`; blocks force pushes/deletion; requires resolved conversations; enables automatic branch deletion; restricts Pages to protected branches; and enables secret scanning, push protection, Dependabot security updates and private vulnerability reporting. The tracked social preview is uploaded through repository settings because GitHub does not expose that field through the repository contents API.
