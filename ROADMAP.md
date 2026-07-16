# Nova Music Lab Roadmap

The v1 roadmap follows one order: **truth → privacy → reliability → architecture → expansion**. A new room is lower priority than making every existing room honest, recoverable and understandable.

## Phase 0 — Release rescue and governance

- [x] Correct the Pages URL and replace volatile README snapshots.
- [x] Add the v1 documentation and GitHub governance foundation.
- [x] Make creator CV links optional instead of requiring private PDFs.
- [x] Add a public flagship manifest and privacy audit.
- [ ] Align package metadata and Node requirements.
- [ ] Make the complete verification and Pages pipeline green.
- [ ] Configure branch rules, repository About fields and a custom social preview on GitHub.

## Phase 1 — Truth and privacy boundary

- [ ] Separate Flagship Exhibition and My Museum at the data/profile level.
- [ ] Add capability flags and provenance to interpretive rooms.
- [ ] Add an unrelated foreign-archive fixture that forbids flagship leakage.
- [ ] Redact, omit or explicitly review every exact-granularity public section.
- [ ] Add a no-remote-media Privacy Mode.
- [ ] Make Gemini key retention session-first with explicit remember and clear controls.

## Phase 2 — Parser, import and storage reliability

- [ ] Resolve short-play, missing-duration, deduplication, track identity and timezone edge cases.
- [ ] Move large parsing work into a Web Worker with cancellation and real progress.
- [ ] Add an import receipt with exclusions, deduplication, coverage and save status.
- [x] Return explicit IndexedDB restore/save/delete outcomes.
- [ ] Add schema migrations, quota handling, retry, confirmation and clear-data undo.

## Phase 3 — Museum journey and visual system

- [ ] Ship Quick Tour, Full Museum and Lab Tools navigation.
- [ ] Show active archive identity, capability and save status in the shell.
- [ ] Replace tiny one-off text styles with semantic typography tokens.
- [ ] Complete automated contrast, axe and visual-regression testing.
- [ ] Add real desktop, mobile and Hebrew/RTL product screenshots.
- [x] Convert README animation to reduced-motion-aware behavior (repository banners are now static).

## Phase 4 — Architecture and long-tail data

- [ ] Split application, context, historical-top and emotional-map monoliths by domain.
- [ ] Separate source adapters, normalization, validation, deduplication and aggregation.
- [ ] Move generated world data out of TypeScript into a compact data artifact.
- [ ] Lazy-load feature-local language and dossier catalogs.
- [ ] Prioritize long-tail genre classification by affected play count.

## Phase 5 — Personal depth and portfolio release

- [ ] Add global archive filters and comparable snapshots.
- [ ] Add bookmarks, memory notes and evidence-backed recent windows.
- [ ] Add a local playlist builder and richer export package.
- [ ] Publish privacy-safe product screenshots, walkthrough media and an engineering case study.
- [ ] Publish `v1.0.0-rc.1`, complete acceptance testing, then tag `v1.0.0`.

## Definition of v1.0 done

- CI, CodeQL, dependency review and Pages smoke tests are green.
- Public and visitor data boundaries are enforced automatically.
- No unrelated import can render flagship-specific claims.
- Import, restore, save, export and clear flows acknowledge success or failure.
- Core journeys pass EN/ES/HE, RTL, mobile, desktop, keyboard, reduced-motion and contrast checks.
- README, metadata, manifest, release notes and the live deployment describe the same product.
