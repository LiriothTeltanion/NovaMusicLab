# Nova Music Lab — current status

Last reviewed: **2026-08-01**.

## Product versions

- **v1.5.0 — private candidate 2026-08-01.** Working title: **The Living
  Archive Gets a Face · El archivo vivo cobra rostro**. This branch is not a
  public deployment and must not be tagged until all local, CI and live gates
  pass.
- **v1.4.0 — initially deployed 2026-07-29.** This remains the current public
  product version. The latest verified documentation-only Pages artifact was
  deployed **2026-07-31**; that later artifact date does not create a new
  product version.
- IndexedDB **schema revision 4** remains the storage contract. It is not the
  product version.

## Public flagship snapshot

- Observed listening period: **2015-03-01 through 2026-07-03**.
- Dataset generated: **2026-07-14**.
- Recent Pulse synchronized: **2026-07-02**.
- Aggregate: **80,550 plays** and **6,413 catalog rows**.
- Runtime status: **local historical snapshot; no automatic synchronization**.
- Artist-image map: **5,321 usable keys** after rejecting **53** known empty
  Deezer placeholders (33 empty artist segments and 20 empty hashes).

The catalog-row count is not a claim of 6,413 unique people or canonical artist
identities. The identity audit currently documents **181 known normalized-name
variant groups**; no rows are merged or deleted in this candidate.

## Candidate scope

The v1.5.0 candidate is limited to:

- trustworthy portrait fallbacks and invalid-provider-placeholder rejection;
- clearer genre-family, reviewed-evidence and unclassified coverage language;
- explicit snapshot freshness across the product and documentation;
- bounded ZIP expansion and browser-storage failure recovery;
- mobile, Hebrew RTL, keyboard and screen-reader release fixes;
- synchronized package, release history, documentation and visual evidence.

DAW, FL Studio, MIDI, Tauri, desktop packaging, backend, accounts, OAuth and
automatic Spotify/Last.fm synchronization are deliberately outside this
candidate.

## Release gate

Status: **local source gate passed; release media in progress**. The candidate
is eligible for publication only after:

1. ~~`npm ci`, `npm run verify`, `npm run test:e2e`, `npm audit` and
   `git diff --check` pass.~~ Verified locally on Node `22.13.0`: 710 tests
   passed with 1 intentional private-fixture skip; Playwright passed 18/18;
   privacy and bundle gates passed; npm reported zero known vulnerabilities.
2. Final release visuals are generated from the frozen product source and pass
   `npm run audit:release-media`.
3. CI, CodeQL and dependency review pass on a pull request.
4. Kevin explicitly approves the merge.
5. GitHub Pages serves matching `build-meta.json` and release-profile evidence
   for the exact merge commit.

Until step 5 succeeds, every v1.5.0 reference must retain the status
**private candidate 2026-08-01**.
