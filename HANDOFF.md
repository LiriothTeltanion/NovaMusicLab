# Nova Music Lab — Continuation Guide

This short file remains as a compatibility entry point for existing tools. Canonical guidance now lives in focused, durable documents rather than a dated agent transcript.

## Start here

1. [`AGENTS.md`](./AGENTS.md) — repository-wide engineering, privacy, language and verification rules.
2. [`README.md`](./README.md) — product identity, public boundary and local setup.
3. [`docs/architecture/OVERVIEW.md`](./docs/architecture/OVERVIEW.md) — system map and module boundaries.
4. [`docs/data/PUBLIC_DATA_POLICY.md`](./docs/data/PUBLIC_DATA_POLICY.md) — what may ship in the public flagship bundle.
5. [`docs/operations/QUALITY_GATES.md`](./docs/operations/QUALITY_GATES.md) — required local and CI checks.
6. [`ROADMAP.md`](./ROADMAP.md) — ordered v1 priorities.
7. [`CHANGELOG.md`](./CHANGELOG.md) — durable pre-release and release history.

## Non-negotiable constraints

- The application is local-first: visitor raw archives are parsed and stored in the browser.
- The public flagship bundle is intentionally published and must pass its privacy manifest audit.
- No raw exports, API keys, account identifiers, private CV files or browser-database dumps enter Git.
- No fabricated statistic, attribution, biography or source capability fills a visual gap.
- User-visible work supports English, Spanish and Hebrew/RTL.
- Routed rooms remain lazy-loaded and bundle budgets remain enforced.
- New runtime network behavior must be documented in the README and privacy threat model.

## Shared-worktree etiquette

- Run `git status` and inspect diffs before editing.
- Re-read files immediately before patching; other agents may have changed them.
- Preserve unrelated changes and never reset the shared worktree destructively.
- Keep one concern per commit and use descriptive Conventional Commit-style subjects.
- Validate any data refresh from the current audit output, not a coverage number copied from prose.

## Required close-out

```bash
npm run verify
node scripts/audit_public_bundle_privacy.mjs
git diff --check
git status
```

Visual work also requires a privacy-safe browser review at mobile and desktop widths, one dark and one light theme, and English, Spanish and Hebrew/RTL.
