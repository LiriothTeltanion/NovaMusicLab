---
name: release-train
description: Prepare, verify, deploy or document a Nova Music Lab version release, including release media, deployment attestation, changelog and tagging. Use when bumping package.json version, cutting a release, or writing release evidence.
---

# Release train

Semantic versioning from `v1.0.0`. Current public version: **v1.6.0**, deployed 2026-08-09.
`main` is production and must stay deployable at every commit.

## Order of operations

1. **Freeze the product source.** Feature work merges first, on its own focused PRs.
2. **Bump `package.json`.** The version bump is what activates the release-media audit in
   CI — ordinary same-version PRs reuse already-reviewed media.
3. **Regenerate release media**, then audit it:
   ```bash
   npm run screenshots:capture
   npm run audit:release-media
   ```
   Assets land in `assets/releases/<version>/` and are **source-fingerprinted and immutable**.
4. **One uninterrupted release gate:**
   ```bash
   npm run verify:release
   npm run test:e2e
   git diff --check
   git status --short
   ```
   Uninterrupted matters: a gate assembled from three partial runs is not the gate.
5. **Browser acceptance**: desktop and mobile, dark and light, EN/ES/HE with RTL, keyboard,
   reduced motion, zero console errors. Privacy-safe screenshots only.
6. **Agreement check** — `package.json`, `CHANGELOG.md`, `README.md`, `CURRENT_STATUS.md`,
   `docs/operations/RELEASE.md` and `src/releases/currentRelease.ts` must state the same
   version, date and IndexedDB schema revision.
7. **Merge the reviewed source** through a PR with protected checks green.
8. **CI deploys and proves it**: the workflow stamps commit + version + the real
   `Asia/Jerusalem` deployment date, then the smoke job polls the live URL until the shell,
   `build-meta.json` and `release-profile-manifest.json` all agree on that exact commit and
   version. A healthy but stale Pages artifact fails this on purpose.
9. **Tag** an annotated tag at the deployed commit and publish the GitHub Release.
10. **Record the evidence** in `CURRENT_STATUS.md` and `docs/operations/RELEASE.md`:
    workflow run id, commit SHA, test counts, deployment date.

## Rules

- **Never tag or deploy while a required check is red.**
- Never raise a bundle budget, weaken an audit or delete a test to reach a release.
- A documentation-only redeploy keeps the existing version and deployment date while
  correctly receiving its own commit SHA — do not invent a new version for a docs change.
- The product version and IndexedDB **schema revision 4** are independent. Never write
  "Nova Music Lab v4".
- Release scope statements must also say what is deliberately **out** (currently: DAW,
  FL Studio, MIDI, Tauri, desktop packaging, backend, accounts, OAuth and automatic
  Spotify/Last.fm synchronization).
- Live `build-meta.json` and the deployed profile manifest are authoritative for what is
  actually being served — not any Markdown file.
