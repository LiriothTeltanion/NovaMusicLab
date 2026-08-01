# Release Guide

Nova Music Lab uses Semantic Versioning beginning with `v1.0.0` — published 2026-07-16 and now superseded.

Current version states:

- `v1.1.0` — deployed 2026-07-26; superseded 2026-07-29.
- `v1.2.0` — deployed and superseded 2026-07-29.
- `v1.3.0` — private checkpoint 2026-07-29; never published or deployed;
  superseded by `v1.4.0`.
- `v1.4.0` — deployed 2026-07-29; current public GitHub Pages version.
- `v1.5.0` — private candidate 2026-08-01; not deployed or tagged.

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

The Pages workflow cancels any older run for the same branch when a newer push arrives. The tracked handoff remains a private candidate; during CI only, the verified artifact receives matching `dist/build-meta.json` and `dist/release-profile-manifest.json` deployment attestations with the exact Git commit, package version and deployment date. The smoke job accepts the deployment only when the museum HTML and both live identity files agree, preventing a healthy but stale Pages artifact from passing release acceptance.

## `v1.1.0` acceptance record — deployed 2026-07-26

- [x] Expedition Console journeys stay synchronized across sidebar, room rail, mobile controls and Nova Command.
- [x] Living Artist Atlas keeps factual profiles, archive analytics and the explicitly imagined creative chapter distinct.
- [x] Artist media embeds require per-artist consent; provenance remains artist-scoped and lazy-loaded.
- [x] Artist identity relationships and rejected third-party matches pass the dedicated audit.
- [x] Public bundle privacy, artist-knowledge, data, media, PWA and bundle-budget audits pass.
- [x] Lint, TypeScript, production build and all 487 tests pass.
- [x] English, Spanish and Hebrew RTL pass at 390, 430, 768 and 1440 pixels in light and dark themes with zero browser console errors.
- [x] Package, changelog, README and storage documentation agree on product `1.1.0` — deployed 2026-07-26 — and IndexedDB schema revision 4.

Known `v1.1.0` release boundaries remain explicit: remote artwork creates disclosed provider requests, official players remain opt-in, and 171 visual assets stayed marked for license review rather than being presented as redistributable.

## `v1.2.0` acceptance record — deployed 2026-07-29

Pull request [#20](https://github.com/LiriothTeltanion/NovaMusicLab/pull/20) merged the accepted application release into `main`. GitHub Pages workflow run [`30432979601`](https://github.com/LiriothTeltanion/NovaMusicLab/actions/runs/30432979601) deployed and smoke-tested application commit `ba3ff6d7c1b2debb0af5985d34f5bb8fdda2a27e`. The public `build-meta.json` matched that exact commit and product `1.2.0`.

- [x] `npm run verify` passes locally and in CI: 103 test files, 599 tests, TypeScript production build and all configured audits/bundle budgets.
- [x] Public bundle privacy audit passes across 21 JSON payloads and 1,760 repository text files; `git diff --check` passes.
- [x] Playwright passes 8/8 desktop/mobile smoke scenarios with axe WCAG A/AA and overflow checks.
- [x] Guided, Explore and Deep Dive preserve the active room and shared URL.
- [x] Home, Pulse, Atlas, Stories and Data Lab expose every routed room across desktop and mobile.
- [x] Share & Feedback and Audio Lab retain their tested local-first boundaries.
- [x] Privacy-safe English desktop/dark, Atlas desktop/dark and Hebrew RTL mobile/light screenshots were regenerated and visually reviewed.
- [x] Dependency review and both CodeQL result surfaces pass after the three reported security findings were fixed.
- [x] The reviewed Wikimedia Commons metadata pass leaves 6 of 295 visual assets explicitly awaiting license review; the companion bootstrap metadata matches the published manifest.
- [x] Package, changelog, README and release guide agree on product `1.2.0` — deployed 2026-07-29 — and IndexedDB schema revision 4.

Automated accessibility checks do not replace ongoing manual screen-reader, keyboard, contrast and device review. The TopHistorico room also reaches its current 360 kB gzip incremental budget exactly, so code splitting is the highest-priority performance follow-up.

## `v1.3.0` checkpoint record — private checkpoint 2026-07-29

This record describes a preserved local checkpoint only. It was never tagged,
released or deployed and was superseded by `v1.4.0` — deployed 2026-07-29.

- [x] `npm run verify` passes: 105 test files and 613 tests, plus lint, strict
  data, identity, media-link, artist-knowledge, privacy, PWA, TypeScript,
  production build and bundle-budget checks.
- [x] `npm run test:e2e` passes all 12 desktop/mobile Chromium journeys,
  including the sticky Museum Map and Hero-to-Atlas artist deep link.
- [x] The explicit public-bundle privacy audit passes across 22 public JSON
  payloads and 1766 repository text files.
- [x] The Hero runtime imports only the 61 rights-eligible primary Wikimedia
  images derived from the canonical manifest; all 6 unresolved assets remain
  excluded from editorial selection.
- [x] English desktop/dark, Atlas desktop/dark and Hebrew RTL mobile/light
  screenshots were regenerated and visually reviewed.
- [x] `git diff --check` passes.

## `v1.4.0` acceptance record — deployed 2026-07-29

Pull request [#22](https://github.com/LiriothTeltanion/NovaMusicLab/pull/22)
promoted the accepted product candidate to `main`. GitHub Pages workflow run
[`30459224429`](https://github.com/LiriothTeltanion/NovaMusicLab/actions/runs/30459224429)
verified, deployed and smoke-tested commit
`0e6c1e3cbd667dddd78053c7e824b14c030e821b`. The live `build-meta.json`
and release-profile manifest agreed on version `1.4.0`, deployed status, that
exact commit and deployment date 2026-07-29.

- [x] Living Artist Atlas consumes the versioned genre ontology and evidence
  artifact while separating accepted facts, candidate suggestions, rejected
  assertions and emotional heuristics.
- [x] Guest Museum accepts an optional browser-local display label and compares
  a private visitor archive with the lazy public flagship catalog.
- [x] The comparator discloses complete versus partial artist scope.
- [x] The Hero displays the exact deployed version and human-readable release
  history.
- [x] `npm run verify` passes locally: 112 test files, 648 tests and every
  configured audit/build-budget gate on 2026-07-29.
- [x] `npm run test:e2e` passes 18/18 updated desktop/mobile scenarios,
  including EN/ES, Hebrew RTL, daylight theme and Guest Museum persistence.
- [x] Nine final screenshots/GIF/reduced-motion/social-preview assets are
  regenerated, source-fingerprinted and visually reviewed.
- [x] Public-bundle privacy passes across 24 JSON payloads and 1,797 repository
  text files; `git diff --check` passes.
- [x] The reviewed candidate was committed cleanly; CI generated the deployed
  manifest and build marker from that exact commit without changing the
  tracked private-candidate manifest.
- [x] CI, GitHub Pages exact commit/version smoke and live browser review pass.
- [ ] The GitHub profile repository is synchronized only after the deployed
  Nova commit and version are verified.

Known `v1.4.0` boundaries: no Google, Supabase, Spotify OAuth or live Last.fm
connector is deployed; the optional name is not authentication; raw visitor
files remain local; and 5,960 long-tail artist rows remain honestly
unclassified pending evidence.

## `v1.5.0` acceptance record — private candidate 2026-08-01

Candidate title:

> Nova Music Lab v1.5.0 — The Living Archive Gets a Face

This release freezes feature expansion around data truth, artist media,
bounded imports, mobile accessibility and reproducible release evidence. Its
flagship remains a historical local snapshot observed through 2026-07-03,
generated 2026-07-14, with Recent Pulse synchronized 2026-07-02. It is not a
live Spotify or Last.fm connection.

- [x] Invalid empty Deezer portrait placeholders are rejected by the generator
  and audit; deterministic fallbacks cover affected catalog rows.
- [x] Genre-family coverage, reviewed assertions and unclassified catalog rows
  are shown as separate metrics, and rejected assertions never become facts.
- [x] ZIP expansion limits, cancellation, duplicate-name rejection and
  browser-storage failure recovery pass adversarial tests.
- [x] English, Spanish and Hebrew RTL journeys pass at desktop and mobile
  sizes, including the 360/390-pixel Genres deep link.
- [x] The exact wordmark accessible name is `NOVA MUSIC LAB`; skip navigation,
  route headings, focus return and reduced motion pass review.
- [x] `npm run verify`, `npm run test:e2e`, `npm audit`, privacy audit, bundle
  budgets and `git diff --check` pass locally from the frozen product source on
  Node `22.13.0`: 710 tests plus Playwright 18/18 are green, with one
  intentional private-fixture skip and zero known dependency vulnerabilities.
- [ ] Final source-fingerprinted visuals pass `npm run audit:release-media` and
  the complete post-capture `npm run verify:release` gate.
- [ ] CI, CodeQL and Dependency Review pass on the pull request.
- [ ] Kevin explicitly approves the merge to `main`.
- [ ] GitHub Pages serves matching version and commit evidence before the tag,
  GitHub Release, social preview or profile repository is synchronized.

Known candidate boundaries: no DAW, FL Studio, MIDI, Tauri, desktop package,
backend, accounts, OAuth or automatic connector is added. No catalog aliases
are destructively merged. The release costs 0 ILS in new services.

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

### `v1.2.0` metadata — deployed 2026-07-29

Release title:

> Nova Music Lab — Five Hubs, Three Depths, One Living Atlas

Release summary:

> A clearer first visit and a deeper music museum: five stable hubs, Guided/Explore/Deep Dive presentation, a share-and-feedback path, an honest local Audio Lab foundation and browser accessibility gates without weakening the local-first archive boundary.

### `v1.4.0` metadata — deployed 2026-07-29

Release title:

> Nova Music Lab v1.4.0 — Guest Museum & Living Genre Atlas

Release summary:

> A local-first music museum that friends can make their own: a clearer
> expedition shell, account-free Guest Museum imports and private comparison,
> a 2,257-term genre ontology with source-aware artist assertions, multilingual
> release history and reproducible visual/deployment evidence.

### `v1.5.0` metadata — private candidate 2026-08-01

Candidate title:

> Nova Music Lab v1.5.0 — The Living Archive Gets a Face

Candidate summary:

> A more trustworthy and expressive living music archive: dependable artist
> portraits and fallbacks, clearer genre provenance, explicit snapshot dates,
> bounded local imports, and polished mobile, keyboard and Hebrew RTL journeys.
> The flagship remains an honest historical snapshot; no account or live sync
> is implied.

## Rollback

If the deployed build fails acceptance:

1. Stop promoting the release; do not retag an existing version.
2. Revert the smallest offending change through a reviewed pull request.
3. Let the verified Pages workflow deploy the corrected `main` artifact.
4. Confirm the smoke test and manually verify the affected journey.
5. Publish a new patch or release-candidate version; never move a published release tag silently.

## External GitHub settings

The established release baseline requires `Verify`, `Analyze JavaScript and TypeScript`, and `Dependency review`; blocks force pushes/deletion; requires resolved conversations; enables automatic branch deletion; restricts Pages to protected branches; and enables secret scanning, push protection, Dependabot security updates and private vulnerability reporting. The tracked social preview is uploaded through repository settings because GitHub does not expose that field through the repository contents API.
