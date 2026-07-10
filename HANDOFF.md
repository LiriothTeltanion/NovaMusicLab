# Nova Music Lab — Engineering Handoff

Complete state-of-the-project document for any agent (Claude, Codex, Antigravity,
or human) continuing work on this codebase. Everything below was verified working
as of the last commit on `main` plus a second working-tree reconciliation pass on
2026-07-10 (Antigravity wave 2: globe, generative avatars/flags, hero rewrite,
dataset recompile — reviewed, fixed and kept; see change log).

## What this app is

A **fully client-side** React 19 + TypeScript + Vite music-analytics dashboard
("Nova Music Lab") that analyzes personal Last.fm CSV / Spotify Extended Streaming
History / Apple Music CSV / YouTube Takeout / ListenBrainz JSON exports. Hard
constraints (from `.github/agents/nova-music-scan.agent.md`):

- **No backend, no runtime API calls, no user-data upload.** All data assets are
  baked at build time. The only runtime network activity is ordinary `<img>` loads
  of remote image URLs, verified official Spotify/YouTube iframe embeds, an
  export-time CORS re-fetch of those same image URLs (`src/utils/imageLoader.ts`,
  used only to inline already-displayed images as base64 for PNG export), and one
  documented **opt-in exception**: `AIAssistant.tsx` calls the Gemini API directly
  from the browser, but only if the user pastes their own personal API key into
  its settings panel (stored in `localStorage`; sent via the `x-goog-api-key`
  header, never as a `?key=` URL param, so it can't leak through logged URLs).
  With no key configured it runs a fully local template-based "sandbox mode" with
  zero network calls. Never widen this exception elsewhere without calling it out
  here first.
- Bilingual **ES/EN** everywhere, cyberpunk/glassmorphism aesthetic, 14 themes.
- **Never fabricate data.** If a real number/attribution isn't available, show an
  honest gap (placeholder, "unresolved", lower confidence badge) instead of
  synthesizing a plausible-looking fake one. This bit the project once already:
  a "Discrepancy Auditor" table used to show a per-artist Spotify play count that
  was actually `Math.round(realLastfmPlays * seededRandom())` dressed up with a
  matching fake "cause" explanation. It was removed entirely (see change log).

Stack: React 19.2, TS 6, Vite 8, Tailwind 3.4, framer-motion, Recharts, lucide-react,
canvas-confetti, html-to-image. Lint: oxlint. Tests: Vitest 4 + React Testing Library (jsdom).

## Validation commands (all green at last check)

```
npm run dev              # Vite dev server (PORT env respected; .claude/launch.json exists)
npm run lint              # oxlint — clean (dev scripts keep intentional no-console warnings)
npm run test              # 146 tests, 23 files — all pass
npm run build             # tsc -b && vite build — clean
npm run audit:data        # read-only coverage report across every data layer (see below)
npm run audit:data:strict # same, but exits non-zero on real errors (duplicates, invalid rows, missing flags...)
```

**Always run `npm run audit:data` before trusting any coverage number in a doc,
including this one — numbers here go stale fast and the audit script is the
source of truth, not prose.** As of 2026-07-10 (after the honest-data recompile
shifted the top-100): primaryArtistImages, artistGalleries,
curatedArtistEnrichment, offlineKnowledge, mediaProfiles, trackArt and albumArt
are at **100/100**; youtubeVerified 98/100, youtubeEmbeddable 97/100,
spotifyVerified 93/100. `offline_artist_knowledge.json`: 99/100 MusicBrainz
matched (Odeon is a documented curated override), 77/100 Wikidata profiles,
71/100 with band-member lineups (506 member rows — re-run
`scripts/enrich_artist_members.mjs` after ANY `npm run knowledge:artists`,
which rebuilds the file WITHOUT the members enrichment).

CI: `.github/workflows/ci.yml` runs lint+test+build on push/PR (no GitHub remote
yet — blocked on installing/authing the `gh` CLI locally, not a code issue).

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
  `t.nav.*` keys (both languages). ~23 nav items now, grouped into 6 collapsible
  sidebar groups (`NavGroupId`: overview/archive/identity/listening/data/export).
- **Every routed section component must be `React.lazy()`-imported.** One
  component (`InteractiveBackdrop.tsx`, a persistent decorative canvas rendered
  unconditionally at the app root) was briefly imported eagerly and nearly
  doubled the main bundle (398KB → 968KB minified) because it transitively pulls
  in `emotionalEngine.ts` → `offlineArtistKnowledge.ts`, which bundles the full
  ~800KB `offline_artist_knowledge.json` + `artist_enrichment.json`. Fixed by
  making it `lazy()` too, wrapped in its own `<Suspense fallback={null}>`. If you
  add another always-visible decorative component, check its import chain for
  `emotionalEngine`/`offlineArtistKnowledge` before wiring it in eagerly.
- **`React.useMemo`/list keys**: when a rendered list's items can share a value
  (e.g. two different artists both having a song literally titled "The Journey"),
  never key by that shared value alone (`key={track}`) — React will warn and can
  silently drop/duplicate DOM nodes. Key by something that's actually unique per
  row (composite `${artist}-${title}`, or the array index for a static list).

## Visual asset system

### Components
| Component | Purpose | Fallback chain |
|---|---|---|
| `ArtistAvatar.tsx` | round artist photo; `tooltip` prop (default on) shows name+flag+country+genre; fade-in; **hi-res**: at size>=48 tries 640px variant (Wikimedia `/330px-`→`/640px-`, Spotify prefix `ab67616100005174`→`ab6761610000e5eb`) | hi-res → daily gallery pick → standard → colored initials |
| `ArtistPhotoCarousel.tsx` | rotating multi-photo hero portrait for dossier headers (crossfades through `artist_gallery.json`, click to cycle manually); `size` prop is clamp()-driven so it scales down on narrow viewports instead of overflowing | falls back to plain `ArtistAvatar` if the gallery has fewer than 2 photos |
| `CoverArt.tsx` | square album/track artwork, `kind: 'album'\|'track'` | track art → same-key album art → deterministic gradient + disc/note icon |
| `FlagArt.tsx` | hand-authored SVG flags (viewBox 30x20) for every country appearing in the archive or `artist_meta.json` (Brazil added 2026-07-07) | globe motif |
| `GenreIcon.tsx` | flat line icon per `normalizeGenre()` category (17), `currentColor` | question-mark icon |
| `GenreArt.tsx` | illustrated gradient "cover tile" per genre + pattern + icon | Unclassified palette |
| `BrandIcon.tsx` | small colored platform icon (Spotify/YouTube/etc.) for link chips | — |

### Data assets (`src/data/`) — check `npm run audit:data` for current numbers, this table is a snapshot
| File | Coverage (2026-07-07) | Source & keying |
|---|---|---|
| `artist_images.json` | 100/100 dataset artists | Wikipedia REST + Spotify CDN. Key: lowercase artist name. |
| `artist_gallery.json` | 100/100 with 2+ photos, 46/100 with the full 4 | Wikimedia Commons categories + Wikipedia media-list + Deezer artist picture, all HTTP-verified. Remaining gaps are genuinely underground artists with no more free photos online. |
| `album_images.json` | 100/100 top albums | iTunes Search API, 600px. Key: `` `${artist}|||${title}`.toLowerCase() `` |
| `track_images.json` | 99/100 top tracks + curated EmotionalMap picks | same as albums plus Deezer. The one gap ("Slaves - Prayers") is a real archive track with no findable distinct cover art online — deliberately left blank rather than reusing another track's cover. |
| `artist_meta.json` | 446 artists `{genre,country}` | 100 extracted from bundled dataset + ~346 authored. General-purpose: this is the one file that also helps a *different* user's uploaded library, not just Kevin's. |
| `offline_artist_knowledge.json` | 100/100 artists have a row; 77/100 have a Wikidata profile (confirmed ceiling); 67/100 have band-member data | MusicBrainz + Wikidata, cached under `scripts/.cache/offline_artist_knowledge` |
| `member_enrichment.json` + `member_images.json` | ~48 / ~25 individual band members (top 30 artists only) | Wikidata + Wikipedia PageImages, per-member photo/age/socials. See "known gotchas" below for two real bugs found and fixed here. |
| `recent_pulse.json` | snapshot 2026-07-02 | user's REAL current Spotify top artists/tracks via connector; powers the Current Pulse section |
| `artist_enrichment.json` | 100/100 top artists | curated bilingual bios grounded in each artist's real MusicBrainz/archive data (release groups, formation info) — not generic filler. Artists with a weak public footprint got short, evidence-based reads instead of inflated biographies. |
| `artist_media_links.json` | 100/100 have a profile; 90/100 Spotify-verified; 100/100 YouTube-verified and embeddable | Spotify/YouTube/Wikipedia, `mediaConfidence: verified\|partial\|search`. YouTube embeds are individually oEmbed-verified (author_name/title checked against the artist) before being accepted. |

### Reproducible extraction scripts (`scripts/`)
Every script is dev-time-only, self-contained (duplicates small helpers rather
than importing from `src/`), caches responses under `scripts/.cache/<name>/`
(gitignored), and writes back into the matching `src/data/*.json` file. Notable
ones beyond the original iTunes-art pass:
- `expand_artist_gallery_v2.mjs` / `v3.mjs` — Commons/Wikipedia/Deezer gallery
  expansion. Has an explicit block-list for filenames matching sensitive/
  unrelated real-world terms (see gotcha below), not just a portrait-likeness
  filter.
- `retry_wikidata_by_name.mjs` — name-based Wikidata fallback for artists the
  main MBID-based build missed; verifies P31/P106 (instance-of/occupation)
  before accepting a candidate.
- `dedupe_artist_gallery.mjs` — one-off / re-runnable cleanup for photos that
  are the same underlying file served under two different Wikimedia URL shapes.
- `audit_data_quality.mjs` — the read-only coverage report, see validation
  commands above.
- `enrich_members_wikidata.mjs` / `fetch_member_photos.mjs` — per-band-member
  enrichment (photo/age/socials) for the top 30 artists' rosters.

**IMPORTANT pitfalls learned (read before writing a new fetch script):**
- Spotify Web API needs a client secret → NOT usable client-side. Last.fm removed
  artist photos from its API years ago (returns placeholders). Wikimedia, iTunes,
  Deezer, and MusicBrainz/Wikidata are the viable free, keyless sources.
- Never accept a text-match result for ambiguous names (Som, Paloma, Knox…)
  without a strong signal (exact single search hit, or a verified occupation/
  instance-of claim); wrong art or wrong facts are worse than none.
- **A `cacheKey(name)` that strips to `[a-z0-9]` only will collapse ANY name
  written in a non-Latin script (Hebrew, Cyrillic, CJK, …) to the same empty
  string.** This silently made two different band-member lookups share one
  cache file, so 8 different real Hebrew band members all ended up with one
  member's photo/birthdate/Spotify link copied onto all of them. Every
  `cacheKey()` in this repo now appends a stable numeric hash of the *full*
  original string so the readable ASCII part can be empty without colliding.
  If you write a new fetch script with a name-based cache, copy that pattern.
- A bare "does a Wikipedia page exist at this exact title" lookup can resolve to
  a same-named unrelated thing — "James Monteith" (a TesseracT member) once
  resolved to an 1876 geography textbook of the same name. Cross-check the
  page's description/occupation before accepting an image, don't just take the
  first thumbnail that exists.
- If reusing subagent/workflow fan-outs for bulk lookups: mind account spend/
  session limits (a full 6-way parallel code audit failed outright once, all
  6 agents hit "session limit"); prefer plain Node scripts for bulk HTTP work,
  and fall back to direct tool calls (Read/Grep/Bash) if agents are unavailable.

### PNG export (WrappedCard)
`html-to-image` `toPng` with: `skipFonts: true` (Google Fonts stylesheets are
cross-origin → SecurityError spam otherwise) and a
`filter` skipping nodes with `data-no-export` (cross-origin `<img>` taints the
canvas → export dies). `src/utils/imageLoader.ts` (`fetchBase64Image`) offers an
alternative: fetch a CORS-friendly image (Wikimedia/iTunes both send CORS
headers) and convert to a base64 data URL before capture, so it doesn't need the
`data-no-export` exclusion at all.

## Full change log (recent waves, newest first)

- **2026-07-10 reconciliation pass 2 + honest-data recompile**: Antigravity landed
  a second large uncommitted wave (InteractiveGlobe wired into CulturalMap with a
  real world-border dataset + per-country dossier, generative cyber-avatars/flags,
  a big HeroSection rewrite with AI-dossier/telemetry cards, a terminal-style
  upload console, `compile_kevin_music_dna.ts` rebuilding the bundled dataset from
  the RAW exports, theme-transition smoothing, mock-data test isolation). Kept all
  of it after review; fixed: 2 lint errors (unused confetti import, unstable
  `metrics` memo dep), a dead-end "Launch Chat Console" CTA (went to dashboard,
  now opens the AI Assistant), an AudioContext leak per hero click, an invalid
  `boxShadow` hsl+hex-alpha value, per-frame trig re-projection of the whole
  world map (now precomputed unit vectors + multiply-adds; the rAF effect also
  no longer tears itself down every frame), ~2s of artificial `sleep()` theater
  in the upload console (now 0ms paint yields), city-level location string on
  the public hero (now country-only), and the Gemini key moving from a `?key=`
  URL param to the `x-goog-api-key` header. **The big one: the recompiled
  dataset was double-counting.** Kevin's Last.fm was auto-scrobbling Spotify
  (77% of Last.fm rows have the same track on Spotify within ±10min — verified
  empirically against the raw exports), and every Spotify track START (including
  39K skips and 97K sub-30s samples) counted as a play. `parseMusicSources` now
  applies Spotify's own 30s stream-counting rule + cross-source dedup (same
  normalized artist+track from different sources within 10min collapses to the
  richer event; same-source loop listening never collapses), and
  `parseLastfmDate` now parses Last.fm's "DD Mon YYYY HH:MM" as UTC (it was
  being read as local time, shifting every scrobble by the machine's UTC offset
  — which would also have made dedup silently miss everything). Bundled archive
  went 212K fake → **79,855 honest plays** (Last.fm-only view was 50K
  undercounted). A junk "2005 era" (misparsed rows attributed to artist
  "YouTube") is also guarded out. Year-range guard widened from a hardcoded
  2010-2028 to 2002..currentYear+1 so other users' genuinely old history isn't
  silently dropped. Top-100 shifted → coverage refilled the honest way (see
  audit): 6 new curated bios authored, photos via single-exact-match Deezer +
  Commons (both-must-match iTunes/Deezer for art — removed the script's
  same-artist-any-title fallback, which violated the no-wrong-art rule),
  3 oEmbed-verified uploads-playlist embeds. Also: NFC normalization on every
  runtime JSON lookup (parser/ArtistAvatar/CoverArt/artistGallery) so
  NFD-encoded uploads match bundled NFC keys; diacritic-insensitive search in
  TopHistorico; keyboard access + aria-labels on ~10 click-only cards/controls;
  c3 contrast fixed in 4 dark themes (computed, all pass 4.5:1); heading-order
  fix in FinalReport; dead code removed (legacy parser wrappers,
  `topCountriesWithKnownMeta`, the unused `CULTURAL_LANGUAGE_DATA` table,
  orphaned hero STRINGS + `.waveform-bar` CSS); 3 new test files
  (analytics/artistEnrichment/mediaLinks) + parser dedup/NFC/threshold tests;
  `getAlbumEnrichment` substring matches now require 5+ chars so "Live"/"II"
  can't inherit an unrelated album's year.
- **2026-07-07 reconciliation pass**: another parallel session (working tree
  changes, unattributed but referred to as "antigravity") had landed a large
  batch of uncommitted work — new `AIAssistant.tsx` (Gemini chat, opt-in, see
  hard-constraints note above), `DailyHeatmap.tsx` + `GenreConstellation.tsx`
  (new visualizations), cross-section deep-linking (`activeTab`/
  `selectedArtistName` moved into `AppContext` so clicking an artist avatar
  anywhere jumps to its full Top Histórico dossier), a real fix for the
  long-documented `CulturalMap` hardcoded-language-data gap, per-band-member
  enrichment, and a collapsible nav-group sidebar. Reviewed, fixed what was
  broken (fabricated data table removed, bundle-size regression fixed, lint
  error fixed, member-photo mixups fixed, a React duplicate-key bug fixed,
  root-cause `cacheKey` bug patched everywhere it appeared), kept everything
  else. See the "pitfalls learned" section above for the specific bugs found.
- **Wave: EmotionalMap attribution fixes + gallery/Wikidata expansion**:
  adversarially verified (MusicBrainz + Deezer, 2 independent checks per claim)
  every curated "refuge song" in `EmotionalMap.tsx`'s `EMOTION_DETAILS` and
  fixed 6 real wrong artist-track attributions, always by swapping in a
  different real, verified track for the *already-stated* artist rather than
  changing who's credited — keeps every mood's prose/artist-roster untouched.
  Deduped 35 same-photo-different-URL duplicates from `artist_gallery.json`
  (two Wikimedia URL shapes serving the same file). Removed a real historical
  slavery photo + a broken file icon that a Commons category search had pulled
  into the "Slaves" (band) gallery — the band's name collided with an unrelated
  real-world atrocity category. Grew Wikidata coverage 71→77/100 (confirmed
  ceiling) and YouTube embeddable coverage 20→100/100 (oEmbed-verified).
- **Ola 3**: Apple Music CSV + ListenBrainz JSON importers, first-visit
  onboarding tour, museum comparator (compare two datasets side by side),
  mobile + contrast + bundle-split pass.
- **Ola 2**: IndexedDB persistence + JSON export/import, emotional timeline +
  mood stations, generative mood-art gallery + museum poster PNG export, PWA
  (manifest + service worker).
- **Earlier waves**: i18n consolidation (261 ternaries → STRINGS), 7 light
  themes + light-mode infra, error boundaries + upload validation, memoization
  audit, `artist_meta.json` 18→446 entries, artist/genre visual system
  (ArtistAvatar/GenreIcon/GenreArt rollout), narrative layer (SectionNarrative,
  DataQualityCenter), TimeCapsule/WrappedCard/RecentPulse sections, FlagArt,
  clickable artist/album/track dossiers in TopHistorico.

## Known gaps / next opportunities (prioritized, re-verified 2026-07-10)

1. **YouTube embeddable is 97/100**: Saurom (legacy `/user/` channel URL — the
   uploads-playlist trick needs a `UC…` channel id), Enforcer and Marty Friedman
   (no channel on file). Needs a manually-found, oEmbed-verified official video.
2. **`spotifyVerified` is 93/100** — the remaining artists lack a
   Wikidata-P1902-confirmed Spotify link.
3. **`member_enrichment.json`/`member_images.json` cover the OLD top-30
   rosters** — new top-30 entrants (e.g. TesseracT is now #5) haven't had the
   per-member photo/age/socials pass. Re-run `enrich_members_wikidata.mjs` +
   `fetch_member_photos.mjs` when touching that area.
4. **`recent_pulse.json` snapshot is dated** (2026-07-02) — refreshing it
   requires the Spotify connector in a Claude session, or a small paste-in flow.
5. **`platform_breakdown`**: the bundled merged dataset now carries real
   platform data from the Spotify export, but the panel's "limited data" logic
   should be sanity-checked against it.
6. **Single-photo galleries**: Enforcer, Girafot (source-availability limits so
   far, not script gaps).
7. **`AppContext-*.js` chunk is ~170KB minified** (STRINGS for both languages
   ship eagerly) — splitting per-language would cut the critical path, but it's
   an architectural change; don't do it casually.
8. **Era narratives in `EraExplorer.tsx` embed specific stat numbers as prose**
   (13,011 plays for 2021, etc., updated 2026-07-10 to match the deduped
   dataset). If the bundled dataset is ever recompiled again, re-check those
   hardcoded numbers — `scripts/compile_kevin_music_dna.ts` does NOT update
   them automatically.

## Cross-agent etiquette

Multiple agents (Claude sessions, Codex, and now Antigravity) work on this repo
in parallel, sometimes on the same working tree without committing. Rules that
kept this clean so far:
- Commit early with descriptive messages; one concern per commit.
- **Before building on top of anything, `git status`/`git diff` first.** A
  parallel session's uncommitted work can contain real improvements *and* real
  regressions at the same time — don't assume either way without checking.
- Don't rewrite the STRINGS/theming/asset conventions — extend them.
- Re-read any file before editing (parallel sessions modify `App.tsx`,
  `AppContext.tsx`, `TopHistorico.tsx` frequently).
- Never fabricate a statistic to fill a UI gap — an honest "no data" beats a
  plausible-looking fake number every time. See the hard-constraints note above.
- If you add a feature that calls a third-party API at runtime (even opt-in,
  even with the user's own key), document the exception at the top of this
  file — don't let "no runtime calls" silently become false.
- Validate with `npm run lint`/`test`/`build` **and `npm run audit:data:strict`**
  before committing; check the dev preview for visual changes in BOTH languages
  and at least one dark + one light theme.
