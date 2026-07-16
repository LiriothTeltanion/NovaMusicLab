# Public Data Policy

Everything committed to this repository or deployed to GitHub Pages is public. The flagship aggregate is intentional project content, not browser-private visitor state.

## Required manifest

`src/data/public_dataset_manifest.json` declares:

- schema version;
- dataset kind and privacy tier;
- analysis timezone;
- allowed top-level sections;
- prohibited exact/raw sections;
- review status for sessions, obsessions, daily plays, platform breakdown and Recent Pulse;
- human-readable review notes.

The manifest is a review contract, not a privacy claim by itself. CI verifies it against the bundled files and scans repository text for account identifiers, personalized export filenames and email-like values.

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
