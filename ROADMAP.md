# Nova Music Lab Roadmap

The v1 roadmap follows one order: **truth → privacy → reliability → architecture → expansion**. A new room is lower priority than making every existing room honest, recoverable and understandable.

## Phase 0 — Release rescue and governance

- [x] Correct the Pages URL and replace volatile README snapshots.
- [x] Add the v1 documentation and GitHub governance foundation.
- [x] Make creator CV links optional instead of requiring private PDFs.
- [x] Add a public flagship manifest and privacy audit.
- [x] Align package metadata and Node requirements.
- [x] Make the complete verification and Pages pipeline green.
- [x] Configure branch rules, repository About fields and a custom social preview on GitHub.

## Phase 1 — Truth and privacy boundary

- [ ] Separate Flagship Exhibition and My Museum at the data/profile level.
- [ ] Add capability flags and provenance to interpretive rooms.
- [ ] Add an unrelated foreign-archive fixture that forbids flagship leakage.
- [ ] Redact, omit or explicitly review every exact-granularity public section.
- [ ] Add a no-remote-media Privacy Mode.
- [ ] Make Gemini key retention session-first with explicit remember and clear controls.
- [x] Govern duplicate/transliterated/historical artist identities and rejected external matches with an auditable policy.

## Phase 2 — Parser, import and storage reliability

- [ ] Resolve short-play, missing-duration, deduplication, track identity and timezone edge cases.
- [ ] Move large parsing work into a Web Worker with cancellation and real progress.
- [ ] Add an import receipt with exclusions, deduplication, coverage and save status.
- [x] Return explicit IndexedDB restore/save/delete outcomes.
- [ ] Add schema migrations, quota handling, retry, confirmation and clear-data undo.

## Phase 3 — Museum navigation and visual system

- [x] Supersede room-filtering journeys with Guided, Explore and Deep Dive presentation depths.
- [x] Organize every room into Home, Pulse, Atlas, Stories or Data Lab without changing canonical room routes.
- [x] Keep those five hubs available in a dedicated sticky Museum Map while larger room utilities scroll away.
- [x] Show active archive mode, source, dataset date, privacy boundary and save status in the shell.
- [x] Add a keyboard-first command palette for rooms and journey switching.
- [x] Promote Artist Identity into a Living Artist Atlas with progressive media, offline evidence and honest unavailable states.
- [x] Turn the entry Hero into a rights-filtered Living Constellation with daily artist imagery and direct Atlas navigation.
- [x] Keep Spotify and YouTube artist players behind explicit opt-in controls.
- [x] Default new visitors to Explore while retaining Guided and Deep Dive as presentation choices.
- [x] Add bounded remote-image recovery and deterministic local fallbacks to high-visibility rooms.
- [x] Replace the two-provider comparison label with a five-provider Source Observatory.
- [ ] Replace tiny one-off text styles with semantic typography tokens.
- [x] Add Playwright desktop/mobile smoke tests and axe WCAG A/AA checks.
- [ ] Add visual-regression baselines after privacy-safe screenshots are reviewed.
- [x] Add reproducible desktop, mobile and Hebrew/RTL product screenshots for local review and the README.
- [x] Convert README animation to reduced-motion-aware behavior (repository banners are now static).
- [x] Consolidate hubs, depth, room map, archive/version disclosure and search
  into the compact two-row sticky shell in `1.4.0` — deployed 2026-07-29.

## Phase 4 — Architecture and long-tail data

- [ ] Put the aggregate compatibility store and Dexie schema revision 4 behind one repository interface before adding cloud state.
- [ ] Split application, context, historical-top and emotional-map monoliths by domain.
- [ ] Separate source adapters, normalization, validation, deduplication and aggregation.
- [ ] Move generated world data out of TypeScript into a compact data artifact.
- [ ] Lazy-load feature-local language and dossier catalogs.
- [ ] Prioritize long-tail genre classification by affected play count.
- [ ] Replace the single-label genre field with evidence-linked multi-label genre, subgenre, scene and confidence records.
- [x] Add a parallel versioned ontology and artist-assertion artifact, then
  connect accepted/suggested/unclassified states to Living Artist Atlas in
  `1.4.0` — deployed 2026-07-29.
- [ ] Expand the reviewed genre layer beyond the current evidence-bearing
  artist set without promoting candidates to facts automatically.
- [ ] Split offline artist knowledge into a small version/hash index plus
  cacheable on-demand detail fragments.
- [ ] Calibrate the emotional engine against measurable audio/listening signals and label personal interpretation separately.
- [ ] Add an offline deterministic assistant over aggregate museum facts; evaluate optional WebGPU models only after privacy, bundle and device budgets are approved.

## Phase 5 — Personal depth and portfolio release

- [ ] Add global archive filters and comparable snapshots.
- [ ] Add bookmarks, memory notes and evidence-backed recent windows.
- [ ] Add a local playlist builder and richer export package.
- [x] Add local Share & Feedback and WhatsApp invitation flows without automatic transmission.
- [x] Found a local-only Audio Lab with preview, limits and explicit not-analyzed states.
- [x] Add Guest Museum: optional local display label, account-free import and
  automatic comparison with Kevin's public flagship in `1.4.0` — deployed
  2026-07-29.
- [ ] Add an optional Supabase control plane for auth, safe snapshots and feedback; raw events remain local.
- [ ] Implement ListenBrainz as the first live connector, then review Last.fm terms and Spotify beta limits.
- [ ] Publish privacy-safe product screenshots, walkthrough media and an engineering case study.
- [x] Publish `v1.0.0-rc.1` — published 2026-07-16 and now superseded — complete acceptance testing, then tag `v1.0.0` — published 2026-07-16 and now superseded.
- [x] Publish `v1.1.0` — deployed 2026-07-26 — with Expedition Console, Living Artist Atlas and governed artist identities.
- [x] Publish `v1.2.0` — deployed 2026-07-29 — with five hubs, three experience depths, local Share/Audio foundations and automated browser/accessibility gates.
- [x] Preserve `v1.3.0` — private checkpoint 2026-07-29, never published or
  deployed — and integrate it into `v1.4.0`.
- [x] Publish `v1.4.0` — deployed 2026-07-29 — after full verification,
  visual approval, clean commit, CI and exact Pages smoke verification.
- [ ] Verify and publish `v1.5.0` — private candidate **2026-08-01** — with
  corrected portrait fallbacks, explicit snapshot/genre provenance, bounded
  archive imports and mobile/RTL/accessibility release fixes.
- [ ] Synchronize the separate GitHub profile repository only after the live
  `v1.5.0` deployment manifest and exact Pages commit are verified.
- [ ] Plan a later version — date not verified — for optional anonymous/Google
  identity, revocable safe snapshots and policy-approved live connectors.

## Definition of v1.0 done

- CI, CodeQL, dependency review and Pages smoke tests are green.
- Public and visitor data boundaries are enforced automatically.
- No unrelated import can render flagship-specific claims.
- Import, restore, save, export and clear flows acknowledge success or failure.
- Core journeys pass EN/ES/HE, RTL, mobile, desktop, keyboard, reduced-motion and contrast checks.
- README, metadata, manifest, release notes and the live deployment describe the same product.
