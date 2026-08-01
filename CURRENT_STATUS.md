# Nova Music Lab — current status

Last reviewed: **2026-08-01**.

## Product versions

- **v1.5.0 — deployed 2026-08-01.** **The Living Archive Gets a Face · El
  archivo vivo cobra rostro** passed local, pull-request, protected Pages and
  exact live-artifact gates. Initial release commit:
  `0e00227cb03d3bb2cbc1c3eead4ed3a5e6603b7d`.
- **v1.4.0 — initially deployed 2026-07-29; superseded 2026-08-01.** Its final
  documentation-only Pages artifact was deployed 2026-07-31.
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
variant groups**; no rows were merged or deleted in this release.

## Release scope

The deployed v1.5.0 release includes:

- trustworthy portrait fallbacks and invalid-provider-placeholder rejection;
- clearer genre-family, reviewed-evidence and unclassified coverage language;
- explicit snapshot freshness across the product and documentation;
- bounded ZIP expansion and browser-storage failure recovery;
- mobile, Hebrew RTL, keyboard and screen-reader release fixes;
- synchronized package, release history, documentation and visual evidence.

DAW, FL Studio, MIDI, Tauri, desktop packaging, backend, accounts, OAuth and
automatic Spotify/Last.fm synchronization are deliberately outside this
release.

## Release gate

Status: **deployment accepted and independently verified 2026-08-01**.

1. ~~`npm ci`, `npm run verify`, `npm run test:e2e`, `npm audit` and
   `git diff --check` pass.~~ Verified locally on Node `22.13.0`: 710 tests
   passed with 1 intentional private-fixture skip; Playwright passed 18/18;
   privacy and bundle gates passed; npm reported zero known vulnerabilities.
2. ~~Final release visuals are generated from the frozen product source and
   pass `npm run audit:release-media`.~~ Verified: 9/9 assets pass, and the
   complete post-capture `npm run verify:release` plus Playwright 18/18 pass.
3. ~~CI, CodeQL and dependency review pass on a pull request.~~ Pull request
   [#27](https://github.com/LiriothTeltanion/NovaMusicLab/pull/27) passed every
   required check.
4. ~~Kevin explicitly approves the merge.~~ Approved 2026-08-01.
5. ~~GitHub Pages serves matching `build-meta.json` and release-profile
   evidence for the exact merge commit.~~ Workflow
   [`30693829107`](https://github.com/LiriothTeltanion/NovaMusicLab/actions/runs/30693829107)
   deployed and smoke-tested `0e00227cb03d3bb2cbc1c3eead4ed3a5e6603b7d`;
   both live identity files reported version `1.5.0`, status `deployed` and date
   2026-08-01.

The tracked source manifest remains a neutral private-candidate handoff by
design. CI stamps the exact commit and deployment date only inside the verified
Pages artifact; the live manifests are the authoritative deployment evidence.
