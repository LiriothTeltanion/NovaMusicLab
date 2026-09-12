# Nova Music Lab — current status

Last reviewed: **2026-08-09**.

## Product versions

- **v1.6.0 — deployed 2026-08-09.** **The Living Archive Finds Its Voice · El
  archivo vivo encuentra su voz** is the latest verified public version. Its
  release commit, which is also the annotated-tag target, is
  `e0d49d2940343fe2ebd7cfb4eee4cbd4d8d39cae`.
- **v1.5.0 — deployed 2026-08-01; superseded 2026-08-09.** Its initial release
  commit remains `0e00227cb03d3bb2cbc1c3eead4ed3a5e6603b7d`.
- IndexedDB **schema revision 4** remains the storage contract. It is not the
  product version.

## Public flagship snapshot

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

## v1.6.0 release scope

The v1.6.0 release adds the refreshed Spotify, Last.fm and YouTube archive,
then makes its purpose explicit: this is Kevin Cusnir / Lirioth Teltanion's real
public listening museum and also a local-first tool where visitors can import
supported listening-history exports to build their own private museum.

The integrated clarity slice adds:

- clearer visible hubs — **Overview, Pulse, Artists, Stories and Create** — plus
  truthful Guided, Explore and Deep Dive reading-depth descriptions;
- a complete lazy Atlas navigator across **6,593 exact-name catalog entries**,
  sortable A–Z or by listens, with search, letter filters and human-first artist
  introductions before technical evidence;
- genre views that keep **Unclassified** separate and label the number of
  smaller classified families instead of presenting a large unexplained
  `Other` category;
- a cover-led Obsessions spotlight and visual loop grid; all **50 / 50** bundled
  obsession moments have an exact track-art mapping in the **170-entry** track
  artwork index;
- a stronger Atlas portrait fallback: **5,691 / 6,593** catalog rows match the
  lazy primary-image index by normalized exact name, while missing or failed
  remote images remain usable through deterministic generated art; and
- visible non-clinical boundaries around emotional and personality readings.
  They are evidence-aware creative interpretations, not diagnoses.

DAW, FL Studio, MIDI, Tauri, desktop packaging, backend, accounts, OAuth and
automatic Spotify/Last.fm synchronization remain deliberately outside this
release.

## Release gate

Status: **verified and deployed 2026-08-09**.

The exact released source completed every publication gate:

1. Node `22.13.0` clean `npm ci` (255 packages), zero
   known vulnerabilities, strict data/privacy checks, build and bundle budgets;
   132 test files and 803 tests pass with 1 intentional private-fixture skip.
2. Nine source-fingerprinted v1.6.0 media assets,
   release-media audit and desktop/mobile EN/ES/HE visual review.
3. One uninterrupted `npm run verify:release` passes and
   Playwright passes 18/18 desktop/mobile journeys with one worker.
4. Pull request [#38](https://github.com/LiriothTeltanion/NovaMusicLab/pull/38)
   passed the protected checks and merged the reviewed source.
5. Workflow run
   [`31319814024`](https://github.com/LiriothTeltanion/NovaMusicLab/actions/runs/31319814024)
   verified, deployed and smoke-tested commit
   `e0d49d2940343fe2ebd7cfb4eee4cbd4d8d39cae` on Pages.
6. Annotated tag `v1.6.0` and the
   [GitHub Release](https://github.com/LiriothTeltanion/NovaMusicLab/releases/tag/v1.6.0)
   resolve to that same product commit. Live `build-meta.json` and the deployed
   profile manifest remain authoritative for the currently served artifact;
   documentation-only deployments keep version `1.6.0` and the deployment date
   while correctly receiving their own commit SHA.
