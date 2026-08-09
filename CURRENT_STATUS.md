# Nova Music Lab — current status

Last reviewed: **2026-08-09**.

## Product versions

- **v1.6.0 — private candidate 2026-08-09.** **The Living Archive Finds Its
  Voice · El archivo vivo encuentra su voz** is the current source candidate.
  It has not been tagged, released, merged to `main` or deployed.
- **v1.5.0 — deployed 2026-08-01.** This remains the latest verified public
  version. Its initial release commit is
  `0e00227cb03d3bb2cbc1c3eead4ed3a5e6603b7d`.
- IndexedDB **schema revision 4** remains the storage contract. It is not the
  product version.

## Candidate flagship snapshot

- Observed listening period: **2015-03-01 through 2026-08-06**.
- Dataset generated: **2026-08-07 in Asia/Jerusalem**
  (`2026-08-06T21:44:39.498Z`).
- Artist enrichment generated: **2026-07-29**.
- Recent Pulse synchronized: **2026-07-02**.
- Aggregate: **82,661 plays**, **20,908 tracks** and **6,593 exact
  artist-name catalog entries**.
- Runtime status: **local historical snapshot; no automatic synchronization**.

The catalog count is not a claim of 6,593 unique people or canonical artist
identities. The reversible identity audit documents **182 known normalized-name
variant groups**; no rows are silently merged or deleted.

Genre layers remain explicit:

- **94.2%** of plays map to an analytical family.
- **457 / 6,593** catalog entries have detailed evidence.
- **1,648** entries remain unclassified.
- Assertions: **85 accepted**, **1,203 candidate**, **2 rejected and hidden**.

## Candidate scope

The v1.6.0 candidate adds the refreshed Spotify, Last.fm and YouTube archive,
clearer source-labelled artist biographies, broader media evidence, improved
mobile room navigation and synchronized public facts. It preserves the
local-first visitor import and the evidence boundaries established in v1.5.0.

DAW, FL Studio, MIDI, Tauri, desktop packaging, backend, accounts, OAuth and
automatic Spotify/Last.fm synchronization remain deliberately outside this
candidate.

## Release gate

Status: **private candidate — full release gate and final v1.6.0 media pending**.

Before publication, the exact frozen source must pass:

1. ~~`npm ci`, `npm run verify`, `npm run test:e2e`,
   `npm run audit:dependencies` and `git diff --check`.~~ Passed locally on Node
   `22.13.0`: 770 Vitest tests passed with 1 intentional private-fixture skip,
   Playwright passed 18/18, dependency/privacy/data/bundle gates passed and npm
   reported zero known vulnerabilities.
2. Final source-fingerprinted v1.6.0 screenshots, tour and social preview plus
   `npm run audit:release-media` and `npm run verify:release`.
3. Pull-request CI, CodeQL and dependency review.
4. Kevin's explicit approval for the exact merge candidate.
5. Live Pages verification showing version `1.6.0`, status `deployed`, the real
   deployment date and the approved merge commit.

Until all five steps pass, the public site and v1.5.0 release evidence remain
the authoritative deployed state. A future deployment date must be the real
date; the candidate must never be presented as already public.
