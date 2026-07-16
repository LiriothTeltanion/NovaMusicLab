# Storage and Migrations

Nova Music Lab stores visitor museum state in browser IndexedDB. This is a local browser database, not a cloud account or synchronization service.

The product candidate is **v1.0.0-rc.1**. The number **4** below is the IndexedDB schema version only; it is not the application's product version.

## Product guarantees

- Importing an archive does not upload the raw file to Nova Music Lab.
- Storage success or failure must be visible to the visitor.
- A storage failure must never silently replace an imported archive with the flagship exhibition.
- Portable exports remain the recovery and migration path.
- Clearing data requires confirmation and an acknowledged result.

## Dataset envelope

Persisted and portable visitor datasets should use a versioned envelope rather than storing an unlabelled analytics object:

```ts
interface DatasetEnvelope {
  schemaVersion: number;
  datasetId: string;
  datasetKind: 'flagship' | 'visitor-import';
  label: string;
  createdAt: string;
  importedAt?: string;
  analysisTimezone: string;
  sources: string[];
  privacyTier: 'curated-public' | 'browser-private';
  capabilities: Record<string, 'available' | 'partial' | 'unavailable'>;
  provenanceSummary: Record<string, unknown>;
  payload: MusicDnaData;
}
```

Exact runtime types may evolve, but each field's purpose must remain explicit.

## Required storage outcomes

Storage functions should return typed outcomes:

```text
restored
not_found
saved
deleted
storage_unavailable
invalid
quota_exceeded
stale_intent
failed
```

Callers must handle every state. `null` or `false` must not ambiguously mean both “nothing saved” and “database failed.”

## Migration rules

1. Increment the schema version for any incompatible envelope or payload change.
2. Read the old value without mutation.
3. Validate it against the old schema.
4. Migrate one version at a time.
5. Validate the migrated value against the new schema.
6. Write the new value atomically.
7. Retain or offer a portable backup before destructive migration.
8. Test success, invalid input, blocked IndexedDB, quota failure and interrupted writes.

## Clear and recovery

- Show the active archive label, source set and last saved time.
- Confirm clear operations with the exact archive being removed.
- Await deletion and report its result.
- Offer a short-lived in-memory undo where feasible.
- Never delete the visitor's original files; Nova Music Lab only controls its own browser state.

## Implemented database contract

- Database name: `nova-music-lab`.
- Dexie schema: `4`.
- Primary stores: `museums`, `imports`, `events`, `entities`, `dedupeClusters`, `importIssues`, `capabilities`, `aggregates`, `insights`, `snapshots`, `settings`, `artistKnowledge` and `visualAssets`.
- Compatibility store: legacy `datasets` remains declared so current aggregate restore/save flows keep working during the verified migration wave.
- Cross-tab mutation authority: save and clear claim a durable monotonic intent in the compatibility store. The final write revalidates epoch, owner and operation in the same IndexedDB transaction, so older work becomes a typed `stale-intent` no-op.
- Atomic boundary: staging-museum activation archives the previous active museum and promotes the candidate in one transaction.
- Transitional authority: the UI's `datasets.active` aggregate is the only production active pointer. The v4 public demo remains archived until normalized event migration is connected, preventing split-brain state during bootstrap.
- Artist bootstrap: a small generated metadata file is checked after page load/idle time; the complete manifest is imported and installed only when its SHA-256 source fingerprint differs.

`src/db/database.ts` is the exact store/index declaration, `src/db/schema.ts` owns record types and version constants, and `src/db/storageResult.ts` defines recoverable outcomes. The compatibility module `src/utils/datasetStorage.ts` returns distinct saved/loaded/missing/cleared/stale and failure states while preserving wrappers for older callers. The uploader confirms destructive clear inline with the exact archive label and saved timestamp, then acknowledges the committed result.

Still required before a default event-level cutover: stepwise legacy data migration, quota preflight, blocked-upgrade UI, import-worker cancellation, backup/restore receipts and destructive-clear undo.
