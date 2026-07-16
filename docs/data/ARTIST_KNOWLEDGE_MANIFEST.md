# Artist Knowledge and Artwork Manifest

`src/data/artist_knowledge_manifest.json` is a deterministic, versioned bridge
between existing curated artist data and the v4 browser database. It is derived
from:

- `offline_artist_knowledge.json`
- `artist_images.json`
- `artist_gallery.json`

The generated manifest preserves normalized identities, aliases, MusicBrainz and
Wikidata identifiers, countries, genres, areas, descriptions, activity ranges,
members, releases, official links and provenance. It intentionally excludes
private archive rank and play counts from reusable artist knowledge records.

Every visual asset records:

- Provider and original source page.
- Explicit license state, including `unverified` or `restricted`.
- Attribution requirements.
- Verification timestamp, or honest `null` for legacy rows without one.
- Known dimensions and explicit unknown values.
- Normalized focal point for stable art direction.
- Cache strategy and third-party privacy impact.
- Content hash, or honest `null` until a local asset is downloaded and hashed.
- Review status.

A remote URL is not treated as redistribution permission. Existing legacy
artwork without captured license evidence enters the review queue instead of
being silently labeled free-to-use. Every generated image is currently a
browser-loaded remote URL, so its strategy is `remote-browser`: rendering the
image makes a third-party request and ordinary HTTP caching is controlled by
the browser and provider. This label describes actual behavior; it does not
claim that the visitor opted in. `maxAgeDays` stays `null` because the app does
not control that cache lifetime. Spotify and Deezer licensing remains marked
`restricted` independently of this delivery strategy.

The generator also writes `src/data/artist_knowledge_manifest_meta.json`. Idle
bootstrap checks this small file's SHA-256 source fingerprint first and imports
the full manifest only for a fresh database or changed knowledge build. Bootstrap
failures are surfaced once in the console while the museum shell remains usable.

## Maintenance

```bash
npm run knowledge:manifest
npm run audit:knowledge
```

The build is deterministic: `generatedAt` comes from the source knowledge file,
stable ids are content-derived, and a SHA-256 fingerprint covers every source
file. The audit fails when source data changes without rebuilding the manifest.

The audit also checks unique artist/asset ids, HTTPS provenance, relational
links, license state, attribution, focal coordinates, cache/privacy policy and
summary counts. It rejects generated remote images mislabeled as
`remote-opt-in`, because the current UI loads them directly rather than behind
a consent action. `npm run verify` includes this audit.

## Next enrichment priorities

1. Resolve the current license-review records from their original Commons
   pages and capture license id, author and source URL.
2. Capture exact width, height and content hash for locally permitted artwork.
3. Curate non-default focal points for portraits used in hero or dossier crops.
4. Expand beyond the current archive-scoped 100 artists using small versioned
   knowledge chunks, not one world-scale frontend bundle.
5. Keep all remote media optional under Privacy Mode.
