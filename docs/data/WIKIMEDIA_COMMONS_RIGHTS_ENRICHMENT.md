# Wikimedia Commons rights metadata enrichment

Nova Music Lab keeps remote artist images in a review state until their source
page exposes usable rights and attribution metadata. The maintenance script
`scripts/enrich_wikimedia_commons_rights.mjs` reads the public artist knowledge
manifest and resolves only Wikimedia Commons file titles through the official
MediaWiki `imageinfo.extmetadata` API.

This is a metadata workflow, not an image downloader:

- It never requests image binaries.
- It never reads raw listening exports, account identifiers or local media paths.
- A network request sends only public Commons file titles already present in the
  public manifest.
- Spotify, Deezer and other provider-controlled images are never changed.
- HTML returned inside attribution fields is converted to bounded plain text
  before it can enter the cache or manifest.
- Email-like contact details embedded in public attribution are removed from
  both the ignored cache and the public manifest; the readable creator name is
  preserved when available.

## Safety model

Network and public-manifest writes require separate flags:

```bash
# Cache-only dry run: no network, no manifest mutation.
node scripts/enrich_wikimedia_commons_rights.mjs

# Explicit network access: query at most 25 public file titles.
# This writes only the ignored scripts/.cache metadata cache.
node scripts/enrich_wikimedia_commons_rights.mjs --fetch --limit 25

# Apply already-reviewed cached metadata, without network access.
node scripts/enrich_wikimedia_commons_rights.mjs --write

# Explicitly fetch and then apply.
node scripts/enrich_wikimedia_commons_rights.mjs --fetch --write
```

`--refresh` re-queries cached titles and therefore requires `--fetch`. Both the
manifest and cache paths must remain inside the repository. Writes use a sibling
temporary file followed by an atomic rename.

The cache lives at
`scripts/.cache/wikimedia-commons-extmetadata.v1.json`, which is excluded from
Git. It records the API endpoint, fetch time, Commons title, page id, sanitized
license and attribution fields, and a SHA-256 fingerprint of the retained
metadata. It contains no image bytes.

## Evidence and license states

The API is evidence of what Commons declares; it is not an independent legal
review. The script therefore uses conservative states:

- `declared`: Commons publishes a recognized open-license or public-domain term.
- `restricted`: the returned term explicitly says non-free, fair use,
  permission-only or all rights reserved.
- `unverified`: metadata is absent, unreadable or not recognized.
- `verified`: never assigned automatically by this script.

The existing `verifiedAt` field remains unchanged for API-only declarations.
Each enriched asset instead receives a `rightsMetadata` provenance block with
the Commons API source, file title, page id, fetch time and metadata fingerprint.
Public-domain and CC0 declarations can set attribution to optional; other open
licenses keep attribution required.

An asset URL, cache hit or `declared` state does not authorize local
redistribution by itself. Local image downloads remain a separate, manually
reviewed future step.

## Deterministic maintenance order

The artist manifest generator remains the source-of-truth build step and will
replace previous enrichment output. Run the rights pass after regeneration:

```bash
npm run knowledge:manifest
node scripts/enrich_wikimedia_commons_rights.mjs --fetch
# Review scripts/.cache/wikimedia-commons-extmetadata.v1.json.
node scripts/enrich_wikimedia_commons_rights.mjs --write
npm run audit:knowledge
node scripts/audit_public_bundle_privacy.mjs
git diff --check
git diff -- src/data/artist_knowledge_manifest.json
```

Before committing, inspect identity, creator, license URL and source page for
every changed record. If a title is ambiguous or the metadata is contradictory,
leave it `unverified`.

## 2026-07-28 acquisition evidence — private checkpoint

During preparation for `1.2.0` — planned 2026-07-29, not published or deployed — the
local rights-enrichment checkpoint on 2026-07-28 queried all 170 unique Commons file
titles already referenced by the public manifest. The reviewed cache produced:

- 164 titles with a recognized open-license or public-domain declaration;
- 4 titles left `unverified` because Commons returned only a generic
  `Attribution` term;
- 2 unresolved titles left unchanged;
- 169 of 171 Commons asset rows matched, because one public title can support
  more than one asset row;
- 6 Commons asset rows still explicitly awaiting license review.

This run enriched rights and attribution metadata only. It did not download,
re-host or redistribute image bytes, and it did not promote any declaration to
`verified`.
