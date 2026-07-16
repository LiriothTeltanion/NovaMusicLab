# Offline Artist Knowledge

Nova Music Lab uses a compact, generated artist-knowledge cache for curated context without scraping biographies at visitor runtime or copying large copyrighted pages into the frontend.

## Source order

1. MusicBrainz for stable artist identities, aliases, areas, dates, tags and releases.
2. Wikidata for structured public identifiers, roles, countries, dates and official links.
3. Curated corrections for ambiguous or weak automatic matches.
4. Cover Art Archive and verified storefront/media sources for artwork metadata.

## Generated artifact

`src/data/offline_artist_knowledge.json` is built with:

```bash
npm run knowledge:artists
```

The generator caches development-time requests under `scripts/.cache/`. It stores compact structured facts and archive context; project prose remains original and evidence-linked.

Rebuilding the base knowledge file may require re-running member enrichment scripts. Inspect the script output and current data audit before committing regenerated assets.

## Runtime use

The knowledge layer supports artist, album and track dossiers, emotional context and the Data Quality Center's enrichment queue. It must not turn a missing match into an invented biography.

## Scale boundary

A world-scale music database does not belong in the frontend bundle. A future large index should be a separate local/server-side build tool using official dumps and should output only the compact, reviewed cache required by the active archive.

## Verification

```bash
npm run audit:data
npm run audit:links
```

Use the audit's current priority queue rather than static coverage numbers in documentation.
