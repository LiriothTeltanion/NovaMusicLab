# Public Data Policy

Everything committed to this repository or deployed to GitHub Pages is public. The flagship aggregate is intentional project content, not browser-private visitor state.

## Required manifest

`src/data/public_dataset_manifest.json` declares:

- schema version;
- dataset kind and privacy tier;
- analysis timezone;
- an explicit freshness contract separating observed dates, build time,
  enrichment evidence and the dated Pulse from any live connection;
- exact archive-name catalog grain and the reviewed count of preserved
  normalized name-variant groups;
- allowed top-level sections;
- prohibited exact/raw sections;
- review status for sessions, obsessions, daily plays, platform breakdown and Recent Pulse;
- human-readable review notes.

The manifest is a review contract, not a privacy claim by itself. CI verifies it against the bundled files and scans repository text for account identifiers, personalized export filenames and email-like values.

The freshness object uses the explicit public fields `observedFrom`,
`observedThrough`, `datasetGeneratedAt`, `enrichmentGeneratedAt`,
`recentPulseSyncedAt` and `liveConnection`. The older top-level `generated_at`
field remains for archive compatibility; it is not a substitute name inside
the freshness contract.

`6,593` is the current candidate number of exact artist-name **catalog entries**, not a
claim that the archive contains 6,593 verified people. The candidate catalog has
182 known normalized name-variant groups. They remain separate so historical
names and aliases are not silently deleted or merged without identity evidence.

## Current source candidate

The `v1.6.0` source candidate dated 2026-08-09 is not yet deployed. Its reviewed
public-data contract currently reports:

- 82,661 plays, 20,908 tracks and 6,593 exact artist-name catalog entries;
- listening observed from 2015-03-01 through 2026-08-06;
- dataset generation at `2026-08-06T21:44:39.498Z`, which is 2026-08-07 in
  the declared `Asia/Jerusalem` analysis timezone;
- artist enrichment generated 2026-07-29 and Recent Pulse synchronized
  2026-07-02;
- no live connection or automatic synchronization;
- 94.2% of plays assigned to an analytical genre family, detailed evidence for
  457 of 6,593 entries and 1,648 entries still unclassified;
- 85 accepted, 1,203 candidate and 2 rejected genre assertions. Rejected
  assertions remain stored as guards and are never displayed as facts.

The latest verified public deployment remains `v1.5.0` until the complete
release gate promotes the candidate.

## Allowed public content

- Reviewed aggregate metrics, leaders, genres and eras.
- Broad, aggregated platform families after device models, versions and identifiers have been removed.
- Curated artist/media metadata with documented public sources.
- Exact-granularity sections only when their manifest status is explicitly `published-curated` or `redacted`.
- Deterministic generated art and original project prose.
- Synthetic test fixtures that contain no real personal history.

## Prohibited public content

- Raw export rows or original archive files.
- IP addresses, account/user IDs, email addresses or usernames.
- Raw device identifiers, MAC/advertising IDs or user-agent strings.
- Precise coordinates or unreviewed location history.
- API keys, tokens, cookies, environment secrets or browser database dumps.
- Private CV/employment documents.
- Any new undeclared dataset section.

## Refresh workflow

1. Compile to an explicit review output, never directly over the public bundle.
2. Inspect the diff and current data audit.
3. Decide whether each exact-granularity section is published, redacted or omitted.
4. Update the manifest.
5. Run:

```bash
npm run audit:data:strict
npm run audit:links
node scripts/audit_public_bundle_privacy.mjs
npm run test
```

6. Review the built `dist` artifact, not only source files.
7. Obtain the CODEOWNER review before merge.

If a private field was committed, removing it in a later commit is not sufficient; assess Git history and rotate any exposed credential immediately.
