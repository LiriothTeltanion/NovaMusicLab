# Changelog

All notable Nova Music Lab changes are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and formal releases follow [Semantic Versioning](https://semver.org/).

No GitHub release or version tag existed before the v1 release foundation. Earlier waves are summarized as pre-release history rather than presented as published versions.

## [Unreleased]

No changes recorded yet.

## [1.2.0] - 2026-07-29

Status: **planned; not published or deployed**.

### Added

- Five durable museum hubs: Home, Pulse, Atlas, Stories and Data Lab.
- Guided, Explore and Deep Dive presentation depths that never hide rooms or change a shared URL.
- Local Share & Feedback room with Web Share, clipboard and WhatsApp drafts plus a musician-friendly feedback composer.
- Local Audio Lab foundation with a 100 MB safety boundary, temporary preview URLs and explicit `Not run` analysis slots.
- Playwright desktop/mobile smoke coverage and automated axe WCAG A/AA checks.
- Versioned social preview with verified play, track and artist counts.
- Quiet semantic Web Audio cues with a persistent Subtle/Off control and no external audio asset.
- Shared accessible provider icons across Current Pulse, Spotify/Last.fm comparison and the legal media portal.
- Source Observatory with explicit Last.fm, Spotify, YouTube, Apple Music and ListenBrainz presence, raw-event share and capability states.
- A reusable seven-second remote-image timeout for portraits, covers, Current Pulse and the Living Artist Atlas.
- Background MusicBee XML parsing with cancellation, a bounded non-DOM plist reader and the existing paths/IDs allowlist.
- An optional account-free weekly pulse contract for saved official Last.fm API or user-provided export summaries; it accepts no profile handle, URL, artwork or raw events.

### Changed

- Simplified first entry by defaulting new visitors to Explore while keeping Guided explanations and direct room links free of onboarding overlays.
- Reorganized the sidebar and previous/next route around the active hub while Nova Command retains access to every room.
- Reframed the Emotional Map with observed, inferred, interpretive and not-measured evidence layers; removed synthetic confidence percentages from the UI.
- Updated PostCSS to a non-vulnerable release and added browser QA as a Pages deployment gate.
- Right-sized remote artist and cover images, stabilized compact portraits, delayed the offline knowledge bootstrap and reserved the heavier global backdrop for Expressive motion.
- Added low-opacity artist and cover atmospheres to the Control Room and Obsessions without duplicating every obsession image surface.
- Moved annual-summary and time-capsule visuals before methodology, compacted the historical artist dossier at large widths and reduced duplicated desktop room navigation.
- Clarified the social preview as `FILES STAY LOCAL` while preserving the documented local-first network boundary for remote fonts and media.

### Fixed

- Prevented cached portraits and covers from returning to an invisible loading state after their load event.
- Limited Wikimedia thumbnails to verified sizes, added compact Cover Art Archive variants and retained original-URL fallbacks.
- Made track artwork coverage deterministic instead of depending on whether the album room had already been opened.
- Advanced stalled remote images through optimized URL, original URL, reviewed gallery or deterministic local fallback instead of leaving permanent loading surfaces.
- Prevented an `Unclassified` genre bucket from being presented as the museum's dominant musical language.
- Extended the public privacy gate to reject embedded Last.fm account profile URLs in both public JSON and repository text.
- Restricted remote-image optimizations to parsed, explicitly trusted provider hostnames instead of matching domain-like substrings.
- Validated and attribute-escaped temporary Audio Lab blob URLs, and completed attribute-context escaping in the local media-progress report.

### Verification status

- Final lint, TypeScript, data, identity, media-link, knowledge, public-privacy, PWA, test and bundle-budget results are pending on the release commit.
- Final Playwright desktop/mobile and axe results are pending on the release commit.
- Bundle measurements will be recorded from the final production build rather than copied from an earlier private checkpoint.

## [1.1.0] - 2026-07-26

Status: **deployed**.

### Added

- Expedition Console with persistent Quick Tour, Full Museum and Lab Tools journeys across sidebar, room rail, mobile navigation and previous/next sequencing.
- Active archive capsule showing the real exhibition mode, source, dataset date, public/local privacy boundary and browser persistence state.
- Keyboard-accessible Nova Command palette with `Ctrl/Cmd+K` room search and journey switching.
- Living Artist Atlas with searchable territories, progressive galleries, archive-ranked tracks and albums, offline discography, official links and honest deterministic visual fallbacks.
- Opt-in Spotify/YouTube media portal and on-demand artist evidence panel for source confidence, attribution, licensing and review status.
- Explicit external-identity policy and audit for transliterations, historical renames and rejected third-party matches.

### Changed

- Promoted the artist room into a cinematic evidence-led Atlas while retaining the imagined generative identity as a clearly labelled second chapter.
- Extended museum headers with compact and cinematic modes while preserving EN/ES/HE, RTL, theme and reduced-motion behavior.
- Advanced the product from `1.0.0` — published 2026-07-16 and now superseded — to `1.1.0` — deployed 2026-07-26 — while retaining IndexedDB schema v4.

### Fixed

- Replaced the incorrect `nightlife` MusicBrainz match with a curated, source-linked offline profile and blocked the rejected identity from future audits.
- Made targeted artist-knowledge merges preserve the existing catalog order and replace records in place.
- Reset remote artist-image fallback state when the active artist changes and suppress referrer data on artist, gallery, cover and Atlas images.
- Distinguished the reviewed public flagship bundle from local-only visitor data in the archive capsule.
- Prevented the Atlas ambient layer from creating mobile page overflow and kept the sticky sidebar below the Expedition Console.
- Kept compact journey names visible on mobile, replaced invalid button content with phrasing-safe archive details and prevented transitional `Rank #0` output.

### Verified

- 87 test files and 487 tests pass with lint, TypeScript, production build, strict data, artist identity, media-link, artist-knowledge, public-privacy, PWA and bundle-budget gates.
- Browser acceptance passes at 390, 430, 768 and 1440 pixels in light and dark themes across English, Spanish and Hebrew RTL, with zero console errors.
- Identity coverage contains 10 governed names, two declared relationship groups and one rejected external match; the public artist catalog contains 100 artists and 295 visual assets, with 171 assets honestly retained in license review.

## [1.0.0] - 2026-07-16

Status: **published; superseded**.

### Released

- Promoted the accepted Living Sonic Cartography candidate to the first stable Nova Music Lab release.
- Published the protected `main` artifact only after EN/ES/HE, RTL, responsive, reduced-motion, persistence, privacy and live Pages acceptance.
- Preserved `v1.0.0-rc.1` — published 2026-07-16 and now superseded — as the immutable release-candidate checkpoint.

### Verified

- 83 test files and 467 tests pass alongside TypeScript, strict data/media/artist-knowledge/privacy/PWA audits and bundle budgets.
- GitHub CodeQL reports zero open alerts; secret scanning, push protection, Dependabot security updates and private vulnerability reporting are enabled.
- The deployed `build-meta.json` proves the exact release commit and package version served by GitHub Pages.

## [1.0.0-rc.1] - 2026-07-16

Status: **published; superseded**.

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
