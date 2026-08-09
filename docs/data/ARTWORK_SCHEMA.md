# Artwork Schema

Nova Music Lab uses curated public media where identity is verified and deterministic visual fallbacks where it is not. Wrong artwork is worse than missing artwork.

## Generated knowledge manifest

`src/data/artist_knowledge_manifest.json` joins verified artist identity and visual-asset records for the Dexie knowledge stores. Its small companion, `artist_knowledge_manifest_meta.json`, contains counts and the source fingerprint so returning browsers do not fetch the full catalog when nothing changed. A second generated companion, `artist_open_primary_images.json`, is a compact runtime map for editorial surfaces: it includes only primary Wikimedia assets whose canonical license state is `declared` or `verified`, without importing the full manifest into the entry bundle. Regenerate the artifacts with `npm run knowledge:manifest`, reapply reviewed Commons rights metadata, and validate them with `npm run audit:knowledge`.

Every manifest asset carries provider/source URL, license state, attribution, verification date, dimensions, normalized focal point, cache policy, third-party privacy impact and review status. An external URL is not treated as redistribution permission. Generated remote images use `remote-browser`, meaning that the browser requests them when rendered and controls ordinary HTTP caching; this is descriptive behavior, not an opt-in claim. Their `privacyImpact` remains `third-party-request` and their app-controlled `maxAgeDays` is `null`.

## Artist images

File: `src/data/artist_images.json`

```json
{
  "bring me the horizon": {
    "thumb": "https://example.invalid/artist.jpg",
    "source": "wikipedia"
  }
}
```

- Keys use normalized lowercase artist names.
- Prefer stable public URLs and sufficiently large images.
- Verify ambiguous names through more than a title match.
- `ArtistAvatar` tries a right-sized URL, the original URL and reviewed gallery candidates before deterministic initials.
- Remote candidates have a seven-second limit so a stalled CDN cannot leave an invisible portrait forever.

## Artist galleries

File: `src/data/artist_gallery.json`

Each normalized artist key maps to an array of `{ "url", "source" }` entries. Gallery expansion must:

- remove duplicate underlying Wikimedia files across alternate URL forms;
- reject unrelated category collisions and sensitive historical imagery;
- verify that the depicted subject matches the artist;
- keep an honest single-photo gallery when no verified alternative exists.

Ambiguous names are governed by `artist_gallery_identity_policy.json`. The
strict audit and tests only accept identity-reviewed open-media subjects for
Santa Cruz, Normandie, mgk/Machine Gun Kelly, Ghost, Roosevelt, Perturbator,
nightlife, SOM, Nine Inch Nails/NIN, Volumes and Thornhill. Provider portraits
remain as deterministic fallbacks where no reviewed Commons photo is known.
Their reviewed CDN asset tokens are pinned too, so changing a row's `source`
label cannot make an unrelated provider image pass; provider artwork refreshes
must update the policy in the same reviewed change.

## Album art

File: `src/data/album_images.json`

Key format:

```text
artist lowercase|||album title lowercase
```

Prefer official storefront art such as Apple/iTunes artwork. Use exact artist/title identity and 600px or better when available.

## Track art

File: `src/data/track_images.json`

Key format:

```text
artist lowercase|||track title lowercase
```

Never substitute a different track's cover merely because it shares the artist. A deterministic fallback is more honest than incorrect art.

An exact same-key album cover may serve as a track fallback when the track and
album title are identical. Personal obsession and annual-summary lookups in
`fetch_curated_track_art.mjs` require the explicit
`--include-personal-rooms` flag because those developer-side requests disclose
the selected artist/track pairs to Deezer or iTunes.

## Media profiles

File: `src/data/artist_media_links.json`

Spotify, YouTube, Wikipedia and official links carry verification/confidence metadata. YouTube embeds must remain embeddable and identity-verified; a search result alone is not a verified profile.

## External identity policy

File: `src/data/artist_external_identity_policy.json`

Provider identifiers are unique by default. A repeated MusicBrainz or Wikidata
identifier is accepted only when the policy declares the exact archive names,
relationship and whether the historical names must remain separate in published
analytics. Rejected provider matches are recorded so a future enrichment pass
cannot silently reintroduce them.

`nightlife` is intentionally curated without its rejected barbershop-quartet
MusicBrainz match. `Girafot` / `ג'ירפות` remain separate published aggregate
rows until the private source archive can be recompiled, while their shared
identity is explicit. `Slaves` / `Rain City Drive` preserve their historical
names by design.

## Fetch-script safeguards

- Cache keys include a stable hash of the full Unicode input; ASCII-only normalization can collapse non-Latin names.
- Respect source rate limits and cache dev-time responses.
- Cross-check ambiguous names with structured occupation/instance evidence.
- Keep scripts development-only; the visitor runtime does not scrape biographies.
- Audit the final output instead of trusting fetch success.

The two optional iTunes maintenance passes require an explicit target file so
they can never read from a different checkout by accident:

```bash
node scripts/fetch_itunes_art.mjs path/to/media_targets.json
node scripts/fetch_itunes_art_pass2.mjs path/to/media_targets.json
```

The target file must be a JSON object containing `albums` and `tracks` arrays.
Both scripts write only to this repository's `src/data` directory. Treat their
output as a proposal: inspect the identity matches and run the audits below
before committing generated artwork metadata.

## Verification

```bash
npm run audit:data
npm run audit:identity
npm run audit:links
npm run audit:knowledge
npm run audit:pwa
npm run test
```

Coverage numbers deliberately do not live in this document. `npm run audit:data` is the current source of truth.

## Product identity artwork

- `src/components/NovaMark.tsx` is the application mark.
- `scripts/generate_nova_icons.mjs` generates favicon, Apple touch, PWA and maskable artifacts; `public/icon-monochrome.svg` supports monochrome surfaces.
- `scripts/capture_readme_visuals.mjs` is the canonical generator for the 1280×640 Open Graph/Twitter PNG. `assets/social/nova-music-lab-social-preview.svg` is an editable design reference whose copy should remain aligned, but it is not rasterized by the release pipeline. `public/social-preview.png` is preserved as the legacy fallback. The reviewed `public/social-preview-v2.png` now mirrors the `v1.6.0` private-candidate artifact generated from the public manifest and share metrics; it is candidate evidence, not a claim that Pages has moved beyond deployed v1.5.0.
- `assets/readme/nova-music-lab-banner.svg` is static by design so repository visitors never receive an unavoidable animation.
