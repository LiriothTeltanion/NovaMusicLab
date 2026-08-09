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
candidate.

## Release gate

Status: **private candidate — integrated product changes are not yet frozen or
fully verified; the previous source and visual evidence no longer proves the
current worktree**.

Before publication, the exact frozen source must pass:

1. Freeze the integrated source, then rerun `npm ci`, `npm run verify`,
   `npm run test:e2e`, `npm run audit:dependencies` and `git diff --check` on
   Node `22.13.0`. Final counts must be recorded only after that exact run.
2. Recapture the nine v1.6.0 screenshots, tour and social preview from the
   frozen integrated source, review them in desktop/mobile and EN/ES/HE, then
   run `npm run audit:release-media` and `npm run verify:release`. The current
   assets document an earlier v1.6.0 baseline and are not release evidence for
   this changed source.
3. Pull-request CI, CodeQL and dependency review.
4. Kevin's explicit approval for the exact merge candidate.
5. Live Pages verification showing version `1.6.0`, status `deployed`, the real
   deployment date and the approved merge commit.

Until all five steps pass, the public site and v1.5.0 release evidence remain
the authoritative deployed state. A future deployment date must be the real
date; the candidate must never be presented as already public.
