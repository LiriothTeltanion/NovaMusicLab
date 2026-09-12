---
name: verify-gate
description: Choose and run the cheapest sufficient Nova Music Lab verification tier, then interpret the failure. Use when asked to verify, test, lint, check, or "make CI green" in this repository, or before opening a pull request.
---

# Verify gate

Nova Music Lab has five verification tiers. Running the heaviest one on every change wastes
minutes; running too light a one lets CI catch what you should have. Pick by blast radius.

## 1. Choose the tier

| Change touches | Run |
|---|---|
| One module, mid-iteration | `npx vitest run <path/to/file.test.ts>` |
| Types/style only | `npm run lint` |
| Any component, util or route | `npm run verify` |
| Anything in `src/data/` or `scripts/` | `npm run verify` **and** `node scripts/audit_public_bundle_privacy.mjs` |
| Imports, room registration, catalogs | `npm run build:check` (budgets) then `npm run verify` |
| Navigation, focus, responsive, a11y | `npm run test:e2e` |
| `package.json` version bump | `npm run verify:release` + `npm run test:e2e` |

Always close a PR-ready change with:

```bash
npm run verify
node scripts/audit_public_bundle_privacy.mjs
git diff --check
git status
```

`npm run verify` chains: lint → `audit:data:strict` → `audit:genres` → `audit:identity` →
`audit:links` → `audit:knowledge` → `audit:privacy` → `audit:pwa` → `audit:share` →
`test` → `build:check`. It stops at the first failure, so re-running after a fix
re-executes the earlier steps — while iterating, run the single failing audit directly.

## 2. Prerequisites

- Node **22.13.0** (`.nvmrc`). Other majors can pass locally and fail CI.
- `npm ci`, never `npm install`, so `package-lock.json` stays authoritative.
- Vitest runs single-worker by design (`maxWorkers: 1`, `fileParallelism: false`).
  Slowness is expected; do not raise the worker count to speed it up.

## 3. Reading failures

| Symptom | Real cause | Fix |
|---|---|---|
| `audit:share` drift | `share_metrics.json` behind `core_metrics` | `npm run share:sync` |
| `audit:knowledge` mismatch | Manifest fingerprint stale | `npm run knowledge:manifest` |
| `audit:genres` failure | Ontology or assertions regenerated partially | `npm run genres:sync && npm run genres:build` |
| `audit:identity` failure | New artist collides with a reviewed variant group | Declare it in `artist_external_identity_policy.json` — do not merge rows |
| `audit:privacy` hit in a `.md` | A doc quotes a forbidden raw key or value | Describe it in prose; never quote it |
| Bundle budget over | A static import pulled a catalog into a room | See `/bundle-budget` |
| Vitest worker exit | Memory pressure | Confirm single-worker config is intact |

## 4. Forbidden "fixes"

Do not raise a bundle budget, weaken a strict audit flag, skip a test, or delete a test
to reach green. Document and fix the regression. If the failure is genuinely unrelated to
the change, say so explicitly with the evidence rather than silencing the check.
