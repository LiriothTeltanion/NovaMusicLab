---
name: bundle-budget
description: Diagnose and fix a Nova Music Lab bundle-budget failure from scripts/check_bundle_budget.mjs, or evaluate whether a new import, catalog or room fits the entry and lazy-chunk ceilings. Use when build:check fails or a heavy dependency is being added.
---

# Bundle budget

`scripts/check_bundle_budget.mjs` runs after `npm run build` (via `npm run build:check`).
The ceilings exist because a single careless static import can drag a multi-megabyte
catalog onto the landing path where no visitor asked for it.

## The ceilings

| Scope | Budget |
|---|---|
| Entry chunk | 300 KB raw |
| Landing shell closure (`index-`, `HeroSection-`, `InteractiveBackdrop-`) | 285 KB gzip |
| Demo landing (with `music_dna_compiled-`) | 315 KB gzip |
| Hebrew UI catalog / artist overlay / loader | 35 / 55 / 2 KB gzip |
| Album / track artwork maps | 60 / 40 KB gzip |
| Artist portrait index (`artist_images-`) | 165 KB gzip |
| Genre ontology / assertions / full catalog | 114 / 92 / 106 KB gzip |
| Rooms: Dashboard, StatsDeepDive | 325 KB gzip each |
| Rooms: TopHistorico / EmotionalMap / DataUploader / ArtistIdentity | 375 / 345 / 190 / 165 KB gzip |

Vendor chunks are split deliberately in `vite.config.ts`: `vendor-react`, `vendor-motion`,
`vendor-charts`, `vendor-icons` — framework code changes less often than app code, so
splitting keeps returning visitors' caches warm.

## Diagnosis order

1. Read the failure line — it names the chunk and prints its largest contributors.
2. `grep -rn "from '.*<the-catalog>'" src/` — find whether the import is **static**.
   `buildStaticClosure` deliberately ignores dynamic imports, so a `import()` is invisible
   to the closure and a plain `import` is not.
3. Convert the offender to a lazy `import()` at its point of use, the way `CoverArt` loads
   the artwork maps and `ArtistAvatar` loads the portrait index.
4. If the data itself grew, shard it (for the portrait index: by play rank) instead of
   raising the number.
5. Re-run `npm run build:check`.

## Read the comments first

The budget file documents *why* each number is what it is, including a live worked example:
`music_dna_genre_catalog` sits at 106 KB rather than 102 because the 2026-08 archive refresh
took the catalogue from 6,413 to 6,593 artists. The comment also names the real fix — every
row stores `artistKey` and `name` as the same string twice, and dropping the duplicate takes
the file to 79.5 KB gzip, six times the overage. It was deferred because `artistKey` is read
across ~23 files, so it deserves its own commit.

That is the standard: a raised budget needs a receipt.

## Raising a budget

Last resort only. Requires, in the same change: the measured before/after, why splitting or
sharding was rejected, and a comment in `check_bundle_budget.mjs` recording the debt and its
known fix. Never raise a budget simply to make CI green.
