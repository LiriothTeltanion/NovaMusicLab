# Claude Art Handoff — Nova Music Lab

Originally written by Codex on 2026-07-03 as a time-boxed addendum steering "the
next Claude pass" toward filling missing art. That pass (and several more since)
already happened — coverage is now 100/100 across artist images, galleries,
albums, curated enrichment, and media profiles (run `npm run audit:data` for the
current numbers; don't trust a hardcoded table in a doc, they go stale fast).
Read `HANDOFF.md` first for full architecture rules and the current change log.
This file is kept for the JSON schema reference below, which is still accurate.

## Image Data Rules

### Artist Images

File: `src/data/artist_images.json`

Expected shape:

```json
"bring me the horizon": {
  "thumb": "https://...",
  "source": "wikipedia"
}
```

Rules:

- Keys are lowercased artist names.
- `ArtistAvatar.tsx` reads this file directly.
- Use stable, public image URLs.
- Current sources include Wikimedia and Spotify CDN.
- For large avatar renders, `ArtistAvatar` tries hi-res variants automatically:
  - Wikimedia `/330px-` can become `/640px-`
  - Spotify `ab67616100005174` can become `ab6761610000e5eb`
- If no image exists, the app falls back to colored initials, so missing entries are safe but less polished.

### Artist Galleries (multi-photo)

File: `src/data/artist_gallery.json` — added after this doc was first written.

Expected shape: an array of `{url, source}` per lowercase artist key (2-4
entries). `ArtistPhotoCarousel.tsx` crossfades through them, starting from a
deterministic "photo of the day" index. See `HANDOFF.md`'s pitfalls section for
the two real bugs already found and fixed in this file (duplicate photos served
under two different Wikimedia URL shapes, and a real historical photo pulled in
by a Commons category search colliding with the band name "Slaves").

### Album Images

File: `src/data/album_images.json`

Expected key:

```text
artist lowercase|||album title lowercase
```

Expected shape:

```json
"bring me the horizon|||sempiternal": {
  "thumb": "https://...",
  "source": "itunes"
}
```

Rules:

- `CoverArt.tsx` expects exact lowercase `artist|||title` keys.
- Prefer official storefront cover URLs such as iTunes/Apple artwork where already used.
- Use 600px or better when possible.
- Do not add random fan uploads when official art is available.

### Track Images

File: `src/data/track_images.json`

Expected key:

```text
artist lowercase|||track title lowercase
```

Expected shape:

```json
"deafheaven|||in blur": {
  "thumb": "https://...",
  "source": "itunes"
}
```

Rules:

- Track art falls back to same-key album art only when the key matches.
- If no track image exists, `CoverArt` falls back to a deterministic gradient tile.
- High-value targets are top tracks and tracks shown in artist dossiers, plus any
  curated "refuge song" referenced in `EmotionalMap.tsx`'s `EMOTION_DETAILS` —
  those live outside the top-100 dataset and need their own art pass.
- Never reuse a different track's cover art as a stand-in for a track you
  couldn't find real art for, even if they share an artist — a copy-pasted cover
  is itself a signal that the underlying artist-track attribution was never
  actually confirmed. Leave a genuine gap instead.

## Extraction scripts

`scripts/` now has many more extraction/enrichment scripts than when this doc
was written (gallery expansion, Wikidata retry, member enrichment, the data
quality auditor, etc.) — see `HANDOFF.md`'s "Reproducible extraction scripts"
section for the current list and the pitfalls learned while writing them
(especially the `cacheKey()` Unicode bug and the "don't trust a lone Wikipedia
title match" lesson).

## Validation

```bash
npm run lint
npm run test
npm run build
npm run audit:data:strict
```

Expected: lint clean (aside from pre-existing `console.log` warnings in dev
scripts, which are intentional there), all tests pass, build clean, and the
audit prints zero errors.
