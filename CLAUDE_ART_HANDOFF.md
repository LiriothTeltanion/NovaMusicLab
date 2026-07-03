# Claude Art Handoff — Nova Music Lab

Updated by Codex on 2026-07-03 after the latest visual/data-improvement pass.

This file is a focused addendum to `HANDOFF.md`. Read `HANDOFF.md` first for the full architecture rules, then use this file to continue the **artist photos, album covers, track covers, and media-art coverage** work.

## Current Goal For Claude

Kevin wants the next Claude pass to focus on:

- adding more real artist pictures
- adding more album cover art
- adding more track/single cover art where possible
- keeping all image/audio/media usage legal and source-transparent
- not breaking the i18n, theme, or data-quality systems Codex just expanded

## Current Asset Coverage

Current `src/data/` counts:

| Asset | File | Count |
|---|---:|---:|
| Artist photos | `src/data/artist_images.json` | 99 |
| Album covers | `src/data/album_images.json` | 85 |
| Track/single covers | `src/data/track_images.json` | 39 |
| Artist biographies/catalog context | `src/data/artist_enrichment.json` | 42 |
| Spotify/YouTube media profiles | `src/data/artist_media_links.json` | 42 |

High-value next target: increase `album_images.json` and `track_images.json` first, then fill artist photos for any visible Top Histórico artists still using initials.

## Recent Codex Changes Claude Should Know

### 1. New Platforms & Devices Section

Files:

- `src/components/PlatformsDevices.tsx`
- `src/App.tsx`
- `src/context/AppContext.tsx`
- `src/components/DynamicMuseumBackground.tsx`

What changed:

- Added a new Data sidebar tab: **Plataformas / Platforms**.
- It shows source status, Spotify device/platform telemetry, skips, short plays, and what is missing when the active data is Last.fm-primary.
- Current bundled data does **not** include `platform_breakdown`, so the section intentionally shows a polished limited-data state.
- If a future Spotify Extended Streaming History export includes `platform`, the chart will automatically render.

Do not remove this section. It is now part of the navigation and i18n.

### 2. App-Wide Visual Background Upgrade

Files:

- `src/components/DynamicMuseumBackground.tsx`
- `src/index.css`

What changed:

- Added app-wide animated museum visuals:
  - moving grid
  - waves
  - particles
  - spectrum bars
  - stage-light layer
  - two animated beams
  - scanlines
  - vinyl/radar rings
- Visual intensity uses music data like night ratio, top genre, and top-artist concentration.
- Light themes have blend-mode handling.
- Reduced-motion users are covered by the existing `prefers-reduced-motion` block in `index.css`.

When adding art, check dark and light themes because the background is now more dynamic.

### 3. Top Histórico Artist/Album Visual Polish

Files:

- `src/components/TopHistorico.tsx`
- `src/components/CoverArt.tsx`
- `src/components/MediaEmbedHub.tsx`

What changed:

- Artist dossier now has a premium exhibit header:
  - glowing artist portrait
  - mood chips
  - archive-cover stack
  - visual-signal badge
- Album dossier now has a record-display header:
  - large cover art
  - release-year badge
  - catalog chapter badge
  - nearby album cover stack
- Key-albums timeline now shows album covers and year badges.
- `CoverArt` now has better shadows/borders and `decoding="async"`.
- `MediaEmbedHub` has a richer listening-station frame, artist name, and better Spotify/YouTube embed presentation.

This is the main place where more album and artist pictures will become immediately visible.

### 4. Legal Media Audit / Media Links

Files:

- `src/components/MediaCoverageAudit.tsx`
- `src/utils/mediaCoverage.ts`
- `src/utils/mediaLinks.ts`
- `src/data/artist_media_links.json`
- `src/components/DataQualityCenter.tsx`
- `src/components/MediaEmbedHub.tsx`

What changed:

- Data Quality now includes a media coverage audit for legal listening readiness.
- Media profiles can have:
  - Spotify artist/album/track URLs
  - YouTube channel/video/playlist URLs
  - official audio/live links
  - confidence/source notes
- The app only uses public links and official embeds/searches. It does not host or download audio.

When adding artist media, use verified official URLs when possible. Search fallback is acceptable, but mark coverage honestly.

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
- High-value targets are top tracks and tracks shown in artist dossiers.

## Existing Extraction Scripts

Scripts:

- `scripts/fetch_itunes_art.mjs`
- `scripts/fetch_itunes_art_pass2.mjs`

These were moved into `scripts/` so extraction is reproducible. Use or extend them rather than doing one-off manual edits when filling many album/track covers.

Before running or changing scripts:

- inspect the script first
- keep output deterministic
- avoid deleting existing good entries
- preserve the JSON key format exactly

## Files Claude Should Be Careful With

These files are currently touched by recent Codex/Claude work:

- `src/App.tsx`
- `src/context/AppContext.tsx`
- `src/index.css`
- `src/components/TopHistorico.tsx`
- `src/components/MediaEmbedHub.tsx`
- `src/components/CoverArt.tsx`
- `src/components/DynamicMuseumBackground.tsx`
- `src/components/DataQualityCenter.tsx`
- `src/data/artist_enrichment.json`
- `src/data/artist_media_links.json`
- `src/utils/mediaLinks.ts`

Do not revert or overwrite unrelated changes. Re-read before editing.

## Recommended Next Claude Workflow

1. Run a coverage audit for missing art:
   - top 100 artists vs `artist_images.json`
   - top 100 albums vs `album_images.json`
   - top 100 tracks vs `track_images.json`

2. Fill album/track art first:
   - use iTunes/Apple Search API or existing extraction scripts
   - preserve existing entries
   - add only confident matches

3. Fill missing artist photos:
   - prefer Wikimedia REST/Commons or Spotify CDN when already known
   - avoid low-quality cropped thumbnails if a better public image exists

4. Update media links only when verified:
   - `src/data/artist_media_links.json`
   - add official Spotify/YouTube URLs
   - keep `mediaConfidence` honest: `verified`, `partial`, or `search`

5. Validate:

```bash
npm run lint
npm test
npm run build
```

Expected:

- lint passes with only existing `scripts/fetch_itunes_art*.mjs` console warnings
- tests pass: 41/41
- build passes

6. Browser smoke test:
   - Top Histórico → Artistas
   - Top Histórico → Álbumes
   - Top Histórico → Canciones
   - Data Quality → media audit
   - check one dark theme and one light theme
   - check ES and EN labels still work

## Most Recent Validation By Codex

After the latest visual pass:

- `npm run lint` passed with existing script console warnings
- `npm test` passed: 41/41
- `npm run build` passed
- Browser checked Top Histórico artist and album tabs in Spanish
- No console errors in the browser

## Important Architecture Reminder

All visible UI strings must stay in `STRINGS` in `src/context/AppContext.tsx` unless they are already localized data fields in JSON. Do not reintroduce inline `lang === 'en' ? ... : ...` UI text.

For this next Claude pass, the safest path is mostly data-only:

- add image URLs to `artist_images.json`
- add cover URLs to `album_images.json`
- add cover URLs to `track_images.json`
- optionally add verified URLs to `artist_media_links.json`

That will immediately improve the new Codex visual surfaces without requiring new component architecture.
