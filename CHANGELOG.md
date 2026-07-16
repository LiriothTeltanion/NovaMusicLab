# Changelog

All notable Nova Music Lab changes are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and formal releases follow [Semantic Versioning](https://semver.org/).

No GitHub release or version tag existed before the v1 release foundation. Earlier waves are summarized as pre-release history rather than presented as published versions.

## [Unreleased]

## [1.0.0] - 2026-07-16

### Released

- Promoted the accepted Living Sonic Cartography candidate to the first stable Nova Music Lab release.
- Published the protected `main` artifact only after EN/ES/HE, RTL, responsive, reduced-motion, persistence, privacy and live Pages acceptance.
- Preserved `v1.0.0-rc.1` as the immutable release-candidate checkpoint.

### Verified

- 83 test files and 467 tests pass alongside TypeScript, strict data/media/artist-knowledge/privacy/PWA audits and bundle budgets.
- GitHub CodeQL reports zero open alerts; secret scanning, push protection, Dependabot security updates and private vulnerability reporting are enabled.
- The deployed `build-meta.json` proves the exact release commit and package version served by GitHub Pages.

## [1.0.0-rc.1] - 2026-07-16

### Added

- Evidence-first v1 documentation architecture and durable release guide.
- Public flagship dataset manifest and privacy audit.
- Unified verified-artifact GitHub Pages pipeline with a post-deployment smoke test.
- CodeQL, dependency review, Dependabot, issue forms, pull-request checklist and CODEOWNERS.
- Canonical, Open Graph, Twitter and structured application metadata.
- Dexie-backed IndexedDB schema v4 for museums, imports, listening events, entities, reversible deduplication, issues, capabilities, aggregates, insights, snapshots, settings, artist knowledge and visual assets while retaining the legacy aggregate store.
- Deterministic artist-knowledge manifest with provenance, external ids, source fingerprints, artwork attribution/license state, focal points and cache/privacy policy.
- Living Sonic Cartography visual registry, responsive room identities, Nova orbit/waveform icon family, and a repository-tracked 1280×640 social preview.
- Expressive, Calm and Static atmosphere controls with a Calm default and system reduced-motion override.
- Typed, explicit IndexedDB save/load/clear outcomes and compatibility wrappers for existing callers.
- Declarative identity rules for ambiguous artist galleries, including exact reviewed provider-asset tokens and generator enforcement.
- A PWA contract audit covering manifest paths, installability, scoped shell fallback and isolated cache cleanup.

### Changed

- Corrected all public Pages references to `liriothteltanion.github.io/NovaMusicLab`.
- Rebuilt the README around the flagship/visitor boundary, privacy truth and v1 journey.
- Made creator CV links opt-in HTTPS destinations so absent private PDFs cannot break CI or the public interface.
- Replaced agent-specific handoff history with focused architecture, data and operations documentation.
- Deferred local database bootstrap until load/idle and split the large artist manifest behind a fingerprint check so unchanged catalogs are not downloaded again.
- Stamped Pages artifacts with their source commit and package version; the live smoke test now verifies that exact identity.
- Made sandbox assistant, emotional-map and genre workflows derive from the active archive instead of leaking fixed flagship/demo examples.
- Kept Gemini credentials only in page memory, with no `localStorage` or `sessionStorage` persistence and an explicit forget control.
- Reclassified remote artist artwork by its real browser-loaded cache and privacy behavior instead of implying visitor opt-in.

### Security

- Public bundle checks now reject undeclared sections and raw identity/network fields.
- Public platform telemetry is now reduced to reviewed device families; raw models, OS versions, user-agent signatures and device-like identifiers are rejected by the release audit.
- Pull requests and issues explicitly prohibit raw listening exports, API keys and private CV files.
- GitHub Actions are pinned to reviewed release commits and use job-scoped minimal permissions.
- Maintenance fetchers no longer publish a personal email address in their request user agent.
- External artist links now require credential-free HTTPS URLs and classify providers only by exact hosts or real subdomains.
- YouTube Takeout HTML entities are decoded exactly once, preventing double-unescape ambiguity.
- The local compiler no longer embeds a personalized Last.fm export filename; it uses explicit configuration or safe single-file discovery, and the privacy gate scans repository text as well as public JSON.

### Fixed

- Local schema-v4 bootstrap failures now emit one actionable console warning instead of disappearing in a silent promise rejection.
- Interactive canvas blobs preserve their relative geometry across viewport resizes.
- New `main` pushes cancel stale verification/deployment runs, preventing an older artifact from superseding the latest Pages build.
- Responsive icon, light-theme, RTL, focus and reduced-motion inconsistencies across the museum shell and chapter visuals.
- Removed 20 demonstrably unrelated artist-gallery rows and regenerated the 100-artist knowledge manifest with 295 provenance-aware visual assets.
- Serialized dataset save/load/clear lifecycles so rapid operations converge in invocation order instead of racing IndexedDB state.
- Locked import, backup restore and destructive clear as one awaited lifecycle so a slow parse/save cannot resurrect a cleared archive or be overtaken by a second drop.
- Added a durable cross-tab mutation epoch so a stale import cannot recreate an archive after a newer clear or overwrite a newer import from another tab.
- Clear now requires an accessible localized confirmation naming the exact saved archive and timestamp before deletion.
- Corrupt backup-like files now fail honestly or yield to valid files in mixed imports instead of entering a false backup path.
- Portable backup and IndexedDB restoration now validate every optional dataset section before it can reach a museum room.
- Visitor archives no longer receive flagship-era, inner-world or recent-pulse narratives when their dates happen to overlap the demo archive.
- Visitor cultural maps no longer infer listener roots, language or scene identity from an artist's origin country.
- Empty archives now show localized unavailable states instead of inventing a timeline, genre or peak year; mobile still exposes whether the archive is saved locally or tab-only.
- Static mode and operating-system reduced-motion now stop continuous timers/RAF loops and skip decorative hero canvas generation.
- Service-worker activation only retires Nova Music Lab caches, preserving other GitHub Pages applications on the shared origin.

## Pre-release history

### 2026-07-14 — Multilingual museum and genre lab

- Completed the Hebrew/RTL experience alongside English and Spanish.
- Expanded evidence-first charts, shareable deep links and genre tooling.
- Introduced the strict media-link audit and strengthened bundle budgets.

### 2026-07-10 — Honest-data reconciliation

- Recompiled the flagship archive with source-aware Spotify thresholds and cross-source deduplication.
- Corrected UTC parsing, identity normalization and long-tail enrichment behavior.
- Reconciled globe, generative avatar, uploader-console and hero work.

### 2026-07-07 — Museum expansion

- Added optional Gemini assistance, additional visualizations and cross-room navigation.
- Expanded artist galleries, member enrichment and verified media profiles.
- Added Apple Music and ListenBrainz import support, the museum comparator, IndexedDB persistence, PWA behavior and portable exports across the surrounding waves.
