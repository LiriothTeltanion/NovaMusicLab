# Release Guide

Nova Music Lab uses Semantic Versioning beginning with `v1.0.0` — published 2026-07-16 and now superseded.

Current version states:

- `v1.1.0` — deployed 2026-07-26; current public GitHub Pages version.
- `1.2.0` — planned 2026-07-29; not published or deployed.

## Branch model

- `main` is production and must remain deployable.
- Use focused `codex/<scope>` branches and pull requests.
- Use squash merge and delete merged branches.
- Use a focused `codex/<release-scope>` branch for final cross-cutting release preparation.

## First stable launch progression — historical, completed 2026-07-16

1. Prepare a release candidate after all feature and migration work is integrated.
2. Run the complete automated and browser acceptance matrix.
3. Deploy the release candidate from verified `main` and observe it in production.
4. Fix regressions through focused pull requests and publish another RC if necessary.
5. Promote the proven commit without unrelated feature changes.
6. Create an annotated stable tag and a GitHub Release.

## `v1.0.0` acceptance record — published 2026-07-16; superseded

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

## `v1.1.0` acceptance record — deployed 2026-07-26

- [x] Expedition Console journeys stay synchronized across sidebar, room rail, mobile controls and Nova Command.
- [x] Living Artist Atlas keeps factual profiles, archive analytics and the explicitly imagined creative chapter distinct.
- [x] Artist media embeds require per-artist consent; provenance remains artist-scoped and lazy-loaded.
- [x] Artist identity relationships and rejected third-party matches pass the dedicated audit.
- [x] Public bundle privacy, artist-knowledge, data, media, PWA and bundle-budget audits pass.
- [x] Lint, TypeScript, production build and all 487 tests pass.
- [x] English, Spanish and Hebrew RTL pass at 390, 430, 768 and 1440 pixels in light and dark themes with zero browser console errors.
- [x] Package, changelog, README and storage documentation agree on product `1.1.0` — deployed 2026-07-26 — and IndexedDB schema revision 4.

Known release boundaries remain explicit: remote artwork creates disclosed provider requests, official players remain opt-in, and 171 visual assets stay marked for license review rather than being presented as redistributable.

## `1.2.0` acceptance checklist — planned 2026-07-29; not published or deployed

Implementation does not complete release acceptance by itself. Keep each item pending until its named check has run against the release commit.

Release status on 2026-07-29: **PENDING**. A private checkpoint was exercised locally on 2026-07-28, but those historical results do not establish the final `1.2.0` release. Exact test counts, bundle measurements and acceptance results will be recorded only after the complete gate runs against the release commit. No CI run, merge or deployment is claimed here.

- [ ] `npm run verify` passes on the release commit and in CI.
- [ ] Public bundle privacy audit and `git diff --check` pass on the release commit.
- [ ] Playwright desktop/mobile smoke tests and automated axe checks pass again in CI.
- [ ] Guided, Explore and Deep Dive preserve the active room and shared URL.
- [ ] Home, Pulse, Atlas, Stories and Data Lab expose every routed room across desktop and mobile.
- [ ] Share & Feedback and Audio Lab retain their documented local-first boundaries.
- [ ] English, Spanish and Hebrew RTL receive manual keyboard, contrast, responsive, light/dark and reduced-motion review.
- [ ] Package, changelog, README and release guide agree on the planned release date and status.
- [ ] A privacy-safe release screenshot set is reviewed before any public release or deployment.

## Release metadata

### `v1.0.0` metadata — published 2026-07-16; superseded

Historical title:

> Nova Music Lab v1.0 — The Evidence-First Museum _(published 2026-07-16; superseded)_

Historical summary:

> The first stable Nova Music Lab release separates the public flagship exhibition from private visitor archives, strengthens import and storage reliability, refreshes the visual system, and formalizes privacy, accessibility and release governance.

Attach privacy-safe screenshots and link to the live museum, changelog, security policy and architecture overview.

### `v1.1.0` metadata — deployed 2026-07-26

Historical title:

> Nova Music Lab v1.1 — Expedition Console & Living Artist Atlas _(deployed 2026-07-26)_

Historical summary:

> A more navigable and cinematic music museum: three persistent expedition paths, keyboard-first Nova Command, an evidence-led Living Artist Atlas, opt-in official media and auditable artist identities across English, Spanish and Hebrew RTL.

### `1.2.0` working metadata — planned 2026-07-29; not published or deployed

Working title:

> Nova Music Lab — Five Hubs, Three Depths, One Living Atlas

Working summary:

> A clearer first visit and a deeper music museum: five stable hubs, Guided/Explore/Deep Dive presentation, a share-and-feedback path, an honest local Audio Lab foundation and browser accessibility gates without weakening the local-first archive boundary.

## Rollback

If the deployed build fails acceptance:

1. Stop promoting the release; do not retag an existing version.
2. Revert the smallest offending change through a reviewed pull request.
3. Let the verified Pages workflow deploy the corrected `main` artifact.
4. Confirm the smoke test and manually verify the affected journey.
5. Publish a new patch or release-candidate version; never move a published release tag silently.

## External GitHub settings

The established release baseline requires `Verify`, `Analyze JavaScript and TypeScript`, and `Dependency review`; blocks force pushes/deletion; requires resolved conversations; enables automatic branch deletion; restricts Pages to protected branches; and enables secret scanning, push protection, Dependabot security updates and private vulnerability reporting. The tracked social preview is uploaded through repository settings because GitHub does not expose that field through the repository contents API.
