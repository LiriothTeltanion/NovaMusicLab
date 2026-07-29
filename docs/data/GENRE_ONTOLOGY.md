# Genre ontology and artist assertions

This document describes the genre foundation prepared for Nova Music Lab
`v1.4.0` — private candidate 2026-07-29. It does not describe a published or
deployed release.

## Product rule

A genre vocabulary and an artist classification are different things.

- The vocabulary answers: “Which genre names can the visitor search?”
- An assertion answers: “Which of those terms is actually supported for this
  artist, by which source, and with what review state?”
- The analytical projection answers: “Which single family receives this
  artist's listens so the charts still reconcile exactly?”

The application therefore never assigns every available genre to every artist.
An artist may have many genre, subgenre, scene, style and descriptor assertions,
but only one analytical family. `Unclassified` is an honest projection state,
not a musical genre.

## Lazy public artifacts

### `src/data/genre_ontology.v1.json`

The ontology combines:

1. the complete MusicBrainz `/genre/all` vocabulary snapshot;
2. Nova's reviewed analytical families and starter terms;
3. labels already observed in the public artist catalog.

MusicBrainz terms are searchable candidates. Their presence in the vocabulary
is not evidence that any specific artist belongs to them. Nova-observed labels
remain provisional unless an artist assertion accepts them.

Refresh the external vocabulary deliberately:

```bash
node scripts/sync_genre_ontology.mjs --snapshot-date YYYY-MM-DD
```

The maintenance script identifies itself to MusicBrainz, respects the public
API rate limit and is never called by the visitor runtime or normal verification
gate.

### `src/data/artist_genre_assertions.v1.json`

This artifact preserves artist-to-term evidence as one of:

- `accepted`: reviewed in `scripts/artist_truth_policy.mjs`;
- `candidate`: useful evidence that still needs review;
- `rejected`: a known unsafe match that must not reappear in the interface.

Evidence providers remain distinct: Nova catalog, Nova curation, MusicBrainz
and Wikidata are never flattened into an unattributed string array. The build
starts from `offline_artist_knowledge.json`, where provider boundaries still
exist.

Rebuild deterministically after a reviewed source change:

```bash
node scripts/build_artist_genre_assertions.mjs
```

## Runtime and privacy boundary

Both artifacts load only when a visitor opens Genre Lab or the Living Artist
Atlas. They do not enter the initial museum bundle. They contain public artist
metadata and stable provider identifiers, not listening-export rows, account
identifiers or credentials.

The existing 6,413-artist catalog remains the complete denominator. The new
knowledge artifact adds evidence to classified artists without rewriting the
original catalog or guessing labels for unresolved long-tail artists.

Local visitor corrections continue to live in the versioned local dataset
envelope. This first slice deliberately avoids a Dexie schema migration. A
future relational migration must be additive, reversible and separately
approved.

## Mathematical invariants

- Catalog artist count equals `core_metrics.unique_artists`.
- Catalog play count equals `core_metrics.total_plays`.
- A secondary term never receives additional chart plays.
- Every accepted or rejected assertion has explicit curation evidence.
- Every assertion references a valid ontology term.
- Rejected assertions are stored as regression guards and never offered as
  artist tags.

Run:

```bash
node scripts/audit_genre_knowledge.mjs
```

The full release gate also runs the public-bundle privacy audit because these
JSON files are public, offline application assets.

## Next data wave

Review the unresolved queue by listening impact, not alphabetically. The first
25 high-impact unresolved artists represent a much larger improvement than
hundreds of one-play guesses. For each artist:

1. resolve a stable artist identity;
2. collect MusicBrainz/Wikidata genre evidence separately;
3. reject homonyms explicitly;
4. accept only terms that survive review;
5. regenerate and audit both artifacts.

MusicBee genres may enter as `candidate` evidence after source-specific
normalization. They must never silently override reviewed artist identity or
the single-family chart projection.
