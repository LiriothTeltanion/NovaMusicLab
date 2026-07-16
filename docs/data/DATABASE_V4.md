# Local Database v4

Nova Music Lab **IndexedDB schema v4** is a local-first browser database implemented with Dexie on
top of IndexedDB. It has no cloud database, account, tracking, or synchronization
dependency. The application can therefore preserve a private museum without
uploading raw listening history.

This document names a storage schema, not a product generation. The application
version is `1.0.0` on the stable release line.

## Safety contract

- A new import is written as a `staging` museum.
- Validation and reconciliation complete before activation.
- Activation archives the previous active museum and promotes the staged museum
  in one IndexedDB transaction.
- A failed transaction reports an explicit `StorageResult` and preserves the
  previously active museum.
- The legacy `datasets` store remains declared during the v4 upgrade. The
  existing aggregate storage path continues to work until its dedicated
  migration is implemented and verified.
- While that compatibility path is authoritative, bootstrap keeps the v4
  public-demo museum `archived` and does not invent a second active pointer.
  Staged/private v4 activation is available to migration tooling, but the UI
  will only adopt it after event-level cutover and receipt tests are complete.
- Unknown and missing durations remain `null`; track duration is never silently
  substituted for played duration.
- Deduplication clusters retain every event id and are explicitly reversible.

## Stores

| Store | Purpose |
| --- | --- |
| `museums` | Profile, dataset kind, privacy mode, timezone and activation state |
| `imports` | Source files, hashes, progress, parser version and reconciliation counts |
| `events` | Normalized immutable listening evidence |
| `entities` | Artist, track, album and genre identities per museum |
| `dedupeClusters` | Reversible duplicate decisions and confidence |
| `importIssues` | Row-level diagnostics with safe evidence snippets |
| `capabilities` | Available, limited, estimated or unavailable features |
| `aggregates` | Parser/timezone/filter-keyed derived caches |
| `insights` | Values linked to evidence and provenance |
| `snapshots` | Versioned, checksummed museum restore points |
| `settings` | Global or museum-scoped preferences and schema metadata |
| `artistKnowledge` | Provenance-rich reusable artist facts |
| `visualAssets` | Artwork license, attribution, dimensions, focal point and cache policy |
| `datasets` | Read-compatible legacy v2 aggregate store |

## Storage result states

Storage operations never collapse every failure into “no data.” They return:

- `success`, with `opened`, `saved`, `loaded`, `deleted`, `cleared`, or
  `unchanged` action metadata.
- `not-found`.
- `unavailable` when IndexedDB cannot be used.
- `blocked` when another tab prevents migration.
- `quota-exceeded` with a recoverable cleanup/export path.
- `validation-error` for rejected records.
- `migration-error` for unsupported or unsafe upgrades.
- `transaction-error` when an atomic operation aborts.
- `unknown-error` as an honest final fallback.

## Current integration boundary

The schema-v4 database is implemented and independently exercised, but the existing UI
still uses `src/utils/datasetStorage.ts` for its aggregate compatibility path. That module now returns explicit storage outcomes. The deliberate boundary prevents an
untested cutover from changing or deleting a real browser museum. The later
integration wave must add import workers, quota preflight, migration receipts,
full-fidelity backup round trips, and user-visible recovery controls before v4
becomes the default storage path.

## Verification

```bash
npx vitest run src/db/database.test.ts src/db/storageResult.test.ts
npx tsc --noEmit -p tsconfig.app.json
```
