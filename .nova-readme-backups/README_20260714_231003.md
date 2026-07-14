# Nova Music Lab 🎧

**[Live demo →](https://lirioth.github.io/NovaMusicLab/)**

A personal music-analytics museum: upload your Last.fm and/or Spotify listening history and explore it as stats, yearly eras, an emotional map, personal records, achievements, and a narrative final report — entirely in your browser, bilingual (English/Spanish), with 14 selectable themes (7 dark, 7 light).

## What it can analyze

- Last.fm CSV export (artist, album, track, timestamp).
- Spotify Extended Streaming History JSON.
- Apple Music `Play Activity.csv` export.
- ListenBrainz listens JSON export.
- YouTube/YouTube Music Takeout (JSON or HTML watch history).
- Any combination of the above, merged and deduplicated across sources.
- Top artists, tracks, albums and inferred genres.
- Hour-by-day listening heatmap and monthly activity (where the source provides it).
- Sessions, streaks, daily records and per-track obsessions.
- Connection countries, platforms, skip rates and short-play counts (Spotify only).
- A generative "if you were an artist" identity — alias, sound, and album art — derived live from your own top artists and genres, never a fixed template.

## Privacy 🔒

Everything you upload is parsed and processed locally in your browser. Nova Music Lab never sends your raw listening history to a server — the parser doesn't even keep sensitive fields from the Spotify export (e.g. `ip_addr`).

The optional AI Assistant runs in a local sandbox mode until you voluntarily add your own Gemini API key. With that key set, sending a message makes a direct browser request to Google that includes your question and an aggregated listening summary (metrics, top artists/tracks/genres, countries and eras) — never your raw export files. The key is stored in your browser's `localStorage`, so only enable it on a device/profile you trust. Use of Gemini is subject to Google's own policies.

## Tech stack

React 19 + TypeScript, Vite, Tailwind CSS, Recharts, Framer Motion. Fully static — no backend, no database, no runtime API calls except the opt-in AI Assistant described above.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run lint     # oxlint
npm test         # vitest
```

### Using your own data

Upload your own export files from within the app (no rebuild needed), or bake a new dataset into the bundle:

```bash
npm run compile:data -- --source-dir "/path/to/your/exports"
```

This requires an explicit source folder (never reads personal files by accident) and expects the layout `lastfm.csv`, `my_spotify_data/Spotify Extended Streaming History/`, and/or `watch-history.html`. It updates `src/data/music_dna_compiled.json`; pass `--output <path>` to write elsewhere and review the result first.

## Project structure

- `src/utils/parser.ts` — importing and aggregating raw exports into one dataset.
- `src/utils/analytics.ts` — shared calculations for the UI, records, sources and genre normalization.
- `src/utils/identityEngine.ts` — the live "if you were an artist" generator: personality traits, archetypes, sound/alias/album art, all derived from whichever archive is loaded, never fabricated per visitor.
- `src/data/music_dna_compiled.json` — the bundled demo dataset.
- `src/components/` — the museum's visual modules.
- `src/context/AppContext.tsx` — language, theme and shared UI state.

## Data-quality notes

The bundled demo dataset ships with fully curated metadata. When you upload your own files, the app recomputes every metric from scratch: a Last.fm-only upload has no skip/platform data; a Spotify-only upload has no Last.fm scrobbles; uploading both measures overlap by normalized artist + track name. Missing data is always shown as an honest gap — never guessed or fabricated.
