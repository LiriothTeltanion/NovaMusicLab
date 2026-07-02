# Nova Music Lab — Engineering Handoff

Complete state-of-the-project document for any agent (Codex GPT 5.5, Claude, or human)
continuing work on this codebase. Everything below was verified working as of the
last commit on `main`.

## What this app is

A **fully client-side** React 19 + TypeScript + Vite music-analytics dashboard
("Nova Music Lab") that analyzes personal Last.fm CSV / Spotify Extended Streaming
History exports. Hard constraints (from `.github/agents/nova-music-scan.agent.md`):

- **No backend, no runtime API calls, no user-data upload.** All data assets are
  baked at build time. The only runtime network activity is ordinary `<img>` loads
  of remote image URLs and the verified official Spotify iframe embeds.
- Bilingual **ES/EN** everywhere, cyberpunk/glassmorphism aesthetic, 14 themes.

Stack: React 19.2, TS 6, Vite 8, Tailwind 3.4, framer-motion, Recharts, lucide-react,
canvas-confetti, html-to-image. Lint: oxlint. Tests: Vitest 4 + React Testing Library (jsdom).

## Validation commands (all green at handoff)

```
npm run dev      # Vite dev server (PORT env respected; .claude/launch.json exists)
npm run lint     # oxlint — clean
npm run test     # 41 tests, 7 files — all pass
npm run build    # tsc -b && vite build — clean
```

CI: `.github/workflows/ci.yml` runs lint+test+build on push/PR (no remote configured yet).

## Architecture conventions (FOLLOW THESE)

### i18n — the single most important convention
ALL user-visible strings live in the `STRINGS` object in
`src/context/AppContext.tsx`, split into `es:`/`en:` mirrors with per-component
groups (`t.dashboard.*`, `t.wrapped.*`, `t.timeCapsule.*`, …). Strings needing
interpolation are **function-valued keys**:
`subtitle: (count: number) => \`${count} logros...\``.
Never add inline `lang === 'en' ? 'x' : 'y'` ternaries for static chrome — that
pattern was purged (261 occurrences removed). Exception: genuinely per-item
generated bilingual data may live next to the data (`label_es`/`label_en` pairs,
`EMOTION_DETAILS` es/en sub-objects).

Locale formatting: numbers/dates always via
`toLocaleString(lang === 'en' ? 'en-US' : 'es-ES')` (or `formatNumber` /
`getMonthNames` / `getWeekdayNames` in `src/utils/analytics.ts`, which use Intl).

### Theming
`THEMES` in AppContext: 14 themes (7 dark + 7 light), each
`{c1,c2,c3,c4,bg,name,label,mode:'dark'|'light'}`. A `useEffect` sets CSS vars
`--c1..c4 --bg --fg --glass-bg` and `data-mode` on `<html>`. Components use
`tc.*` inline or Tailwind classes. **Light-mode remaps** live in `src/index.css`:
hardcoded `text-white`/`text-gray-N`/`border-white/N`/`bg-white/N` utilities are
globally remapped under `[data-mode="light"]`, plus a Recharts tick/legend fill
fix. All 14 themes pass WCAG AA (verified computationally for c1-vs-bg).
Arbitrary hex text colors (`text-[#...]`) will NOT be remapped — use
`text-[var(--fg)]` or theme vars instead.

### Component patterns
- Sections: `export default function X({ data }: { data: MusicDnaData })`,
  root `<div className="space-y-N animate-fade-in">`, glass-panel cards,
  font-mono uppercase headings, framer-motion entrances
  (`ease: 'easeOut' as const` — plain strings fail TS with framer-motion v12).
- Every section renders inside a shared `ErrorBoundary` keyed by tab in `App.tsx`.
- Tabs/nav: `App.tsx` `Tab` union + `menuItems` + lazy imports + render slot +
  `t.nav.*` keys (both languages). 19 nav items currently.

## Visual asset system (the recent big push)

### Components
| Component | Purpose | Fallback chain |
|---|---|---|
| `ArtistAvatar.tsx` | round artist photo; `tooltip` prop (default on) shows name+flag+country+genre; fade-in; **hi-res**: at size>=48 tries 640px variant (Wikimedia `/330px-`→`/640px-`, Spotify prefix `ab67616100005174`→`ab6761610000e5eb`) | hi-res → standard → colored initials |
| `CoverArt.tsx` | square album/track artwork, `kind: 'album'\|'track'` | track art → same-key album art → deterministic gradient + disc/note icon |
| `FlagArt.tsx` | hand-authored SVG flags (viewBox 30x20) for all 25 countries in artist_meta | globe motif |
| `GenreIcon.tsx` | flat line icon per `normalizeGenre()` category (17), `currentColor` | question-mark icon |
| `GenreArt.tsx` | illustrated gradient "cover tile" per genre + pattern + icon | Unclassified palette |

### Data assets (`src/data/`)
| File | Coverage | Source & keying |
|---|---|---|
| `artist_images.json` | **99/100** dataset artists | Wikipedia REST (`/api/rest_v1/page/summary/<title>` → `thumbnail.source`) + Spotify CDN via the claude.ai Spotify MCP connector (`is_saved:true` used to disambiguate). Key: lowercase artist name. Only "Som" missing (unresolvably ambiguous). |
| `album_images.json` | **85/100** top albums | iTunes Search API, 600px (`100x100bb.jpg`→`600x600bb.jpg`). Key: `` `${artist}|||${title}`.toLowerCase() `` |
| `track_images.json` | **39/50** top tracks (effective coverage higher via album fallback) | same as albums, `entity=song` |
| `artist_meta.json` | 446 artists `{genre,country}` | 100 extracted from bundled dataset + ~346 authored. Used by `parser.ts` `metaForArtist()` (upload enrichment) and the avatar tooltip |
| `recent_pulse.json` | snapshot 2026-07-02 | user's REAL current Spotify top artists/tracks via connector; powers the Current Pulse section |
| `artist_enrichment.json` + `artist_media_links.json` | bios/origins/key albums; verified official Spotify embed URLs | authored by a parallel content session; consumed by dossiers & `MediaEmbedHub` |

### Reproducible extraction scripts (`scripts/`)
- `scripts/fetch_itunes_art.mjs` — pass 1: fetch album+track art from the public
  iTunes Search API (no key), artist+title validated, 350ms rate-limit, writes the
  two JSON files. Reads a targets file (see script header for path; regenerate the
  targets from `music_dna_compiled.json` top_albums/top_tracks).
- `scripts/fetch_itunes_art_pass2.mjs` — pass 2 for misses: cleaned search terms
  (strip parentheticals from the QUERY), title-only fallback with artist
  validation, song-entity fallback for single-only releases.

**IMPORTANT pitfalls learned:**
- Spotify Web API needs a client secret → NOT usable client-side. Last.fm removed
  artist photos from its API years ago (returns placeholders). Wikimedia + iTunes
  + the claude.ai Spotify connector (dev-time only) are the viable free sources.
- The Spotify MCP connector returns max 5 entities/query; batching multiple
  artists in one query returns junk (generated playlists) — one query per entity.
  `is_saved: true` = the user follows it = correct disambiguation signal.
- **The account hit its monthly spend limit** during the album-art workflow
  (150 subagents all failed). That's why iTunes/WebFetch/Node-script paths were
  used instead. Prefer direct scripts over agent fan-outs for bulk HTTP fetches.
- Never accept a text-match result for ambiguous names (Som, Paloma, Knox…)
  without a strong signal; wrong art is worse than no art.

### PNG export (WrappedCard)
`html-to-image` `toPng` with: `skipFonts: true` (Google Fonts stylesheets are
cross-origin → SecurityError spam otherwise) and a
`filter` skipping nodes with `data-no-export` (cross-origin `<img>` taints the
canvas → export dies). Any cross-origin image inside the exported card MUST be
wrapped in `<div data-no-export>`. Card uses inline gradient bg (not
backdrop-filter glass — doesn't capture).

## Full change log (commit order, oldest first)

1. **Foundation**: git init, `.gitignore` additions, `.claude/launch.json`
   (repo root at `NovaMusicScan/` with `npm --prefix`, autoPort), CI workflow,
   explicit `vitest.config.ts`, `vite.config.ts` PORT support.
2. **i18n consolidation**: 261 inline ternaries → central STRINGS (15 components);
   "Stats Pro" identical-branch bug fixed (kept as bilingual brand term);
   "Cargando módulo" accent fix; COUNTRY_META made bilingual with real EN
   translations; locale-aware numbers everywhere incl. CountUp (was es-ES only);
   Intl-based month/weekday names replacing hardcoded arrays; FinalReport (was
   100% Spanish) fully translated; leftover Spanish-only strings in
   ObsessionDetector/SpotifyVsLastfm/EmotionalMap translated.
3. **Stability**: `ErrorBoundary` around every tab (keyed by tab for clean reset);
   `ParseError` with codes `INVALID_JSON`/`NO_VALID_ROWS` surfaced as translated
   uploader errors; >200MB file warning; **real bug fixed**: cross-source overlap
   match was case-sensitive (`normalizedTrackKey` added — match-rate was
   undercounting when Last.fm/Spotify capitalization differed).
4. **Themes**: 7 light themes added (Daylight, Linen, Mint Fresh, Blossom, Sky,
   Sand, Lavender Light — all AA-verified; mintfresh c1 darkened to pass);
   light-mode infrastructure (see conventions above); scrollbar/cyber-grid/
   glass-panel de-hardcoded; AnimatedParticles white particle fixed for light mode.
5. **Perf+tests**: useMemo audit (Achievements, StatsDeepDive, CulturalMap);
   RTL+jsdom infra (**Node 26 quirk: jsdom localStorage broken — polyfilled in
   `src/test-setup.ts`**, don't remove); parser edge-case tests; oxlint stricter
   rules (`no-unused-vars`, `react/exhaustive-deps`, `no-console` warn-with-allow,
   `typescript/no-floating-promises`).
6. **Metadata**: `artist_meta.json` 18→446 entries wired into `metaForArtist()`.
7. **Artist/genre visuals**: ArtistAvatar + GenreIcon + GenreArt rollout across
   Top Histórico, Dashboard chart Y-ticks (foreignObject custom tick),
   Achievements, Era Explorer, Obsessions, Hidden Insights, Spotify vs Last.fm,
   Emotional Map chips, Artist Identity influences. Fixed genre fragmentation bug
   in TopHistorico (was using raw genre strings instead of `normalizeGenre()`).
8. **Narrative layer** (parallel session): `SectionNarrative`, `deepNarratives`
   ES/EN for all sections, `DataQualityCenter` section (confidence matrix,
   methodology, transparency checklist).
9. **Three new sections**: `TimeCapsule` (era rediscovery timeline, faded vs
   still-in-top verdicts, Spotify search links), `WrappedCard` (per-year shareable
   card, confetti, PNG download), `RecentPulse` (connector snapshot vs archive,
   still-reigning/new-blood verdicts — compares against FULL top-100, not top-20).
10. **Flags**: FlagArt in Cultural DNA country cards + Top Histórico artist rows.
11. **Content/dossier layer** (parallel session): clickable artist/album/track
    dossiers in TopHistorico, `artist_enrichment.json`, `MediaEmbedHub` (official
    embeds + legal search links), ExpandableInsightCard/MethodologyPanel/
    SectionQuickRead, hero & Emotional Map deepening, 3 more test files.
12. **Cover art + avatar v2**: everything in the "Visual asset system" section.

## Known gaps / next opportunities (prioritized suggestions)

1. **Missing art**: 15 albums, 11 tracks, 1 artist ("Som") have fallback art.
   Could retry with MusicBrainz/Deezer API (public, no key:
   `api.deezer.com/search/album?q=...` — CORS-friendly, good underground coverage)
   or manual curation. Keep dev-time-only.
2. **CulturalMap `LANG_DATA` is hardcoded** (78% Inglés etc.) — derive from data
   (artist countries → language mapping) and translate labels per lang.
3. **Theme transition smoothing**: add a CSS `transition` on `--bg`/`--fg`
   consumers when switching themes (currently instant).
4. **Wrapped PNG without photos**: the export excludes cross-origin images. A
   nicer approach: fetch the image as blob → dataURL at click time (CORS allows
   Wikimedia; iTunes images send CORS headers too) and swap `src` before capture.
5. **`platform_breakdown`** exists in types/parser for uploads but is displayed
   nowhere — a "Platforms & Devices" panel (upload-only) is a cheap section.
6. **PWA/offline**: app is fully static — manifest + service worker = installable.
7. **Data portability**: export/import the parsed `MusicDnaData` JSON so users
   don't re-upload raw exports.
8. **The `recent_pulse.json` snapshot is dated** — refreshing it requires the
   Spotify connector in a Claude session (or replace with a small paste-in flow).
9. **Nav is 19 items** — consider grouping (e.g. collapsible sidebar categories).
10. If reusing subagent fan-outs: mind the account spend limit; prefer plain
    Node scripts for bulk HTTP work.

## Cross-agent etiquette

Multiple agents (Claude sessions, Codex) work on this repo in parallel. Rules that
kept this clean so far:
- Commit early with descriptive messages; one concern per commit.
- Don't rewrite the STRINGS/theming/asset conventions — extend them.
- Re-read any file before editing (parallel sessions modify `App.tsx`,
  `AppContext.tsx`, `TopHistorico.tsx` frequently).
- Validate with lint+test+build before committing; check the dev preview for
  visual changes in BOTH languages and at least one dark + one light theme.
