# Release Guide

Nova Music Lab uses Semantic Versioning beginning with the first stable `v1.0.0` release.

## Branch model

- `main` is production and must remain deployable.
- Use focused `codex/<scope>` branches and pull requests.
- Use squash merge and delete merged branches.
- Create `codex/v1-release-candidate` only for final cross-cutting release preparation.

## Release progression

1. Prepare `1.0.0-rc.1` after all v1 feature and migration work is integrated.
2. Run the complete automated and browser acceptance matrix.
3. Deploy the release candidate from verified `main` and observe it in production.
4. Fix regressions through focused pull requests and publish another RC if necessary.
5. Promote the proven commit to `1.0.0` without unrelated feature changes.
6. Create annotated tag `v1.0.0` and a GitHub Release.

## Pre-release checklist

- [ ] `npm ci` succeeds on the supported Node version.
- [ ] `npm run verify` is green and warning policy is intentional.
- [ ] Public bundle privacy audit is green.
- [ ] CodeQL and dependency review are green.
- [ ] Flagship/visitor boundary tests pass with an unrelated archive.
- [ ] Import, save, restore, export and clear journeys pass.
- [ ] EN/ES/HE, RTL, mobile, desktop, keyboard, contrast and reduced motion pass.
- [ ] README, metadata, manifest, changelog and package version agree.
- [ ] No raw archive, API key or private CV exists in the diff or build artifact.
- [ ] Pages deploy and post-deploy smoke test pass.

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

Before v1.0, configure repository rules to require `Verify`, `Analyze JavaScript and TypeScript`, and `Dependency review` where applicable; block force pushes/deletion; require resolved conversations; enable automatic branch deletion; upload the custom social preview; and enable Dependabot security updates and private vulnerability reporting.
