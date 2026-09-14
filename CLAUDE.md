# CLAUDE.md — Nova Music Lab

Operating guide for Claude Code and other AI assistants working in this repository.
Read this first; it is the fastest path to a correct, mergeable change.

`AGENTS.md` holds the same non-negotiable rules in condensed form for other agent
harnesses. When the two disagree, `AGENTS.md` and the files under `docs/` win —
this file is the navigation and efficiency layer on top of them.

---

## 1. What this project is

Nova Music Lab is a **static, local-first React 19 + TypeScript museum** for listening
history. It ships as a GitHub Pages site with **no backend and no visitor database**.

It serves two distinct product profiles at once:

| Profile | Data source | Where it lives |
|---|---|---|
| **Flagship Exhibition** | Kevin Cusnir / Lirioth Teltanion's reviewed public aggregate | Committed build artifact in `src/data/` |
| **My Museum** (visitor) | An archive the visitor selects in their own browser | Parsed in-browser, stored in IndexedDB |

- Live site: <https://liriothteltanion.github.io/NovaMusicLab/>
- Current public version: **v1.6.0** (deployed 2026-08-09); IndexedDB **schema revision 4**
- Runtime: **Node 22.13.0** (`.nvmrc`), Vite 8, Vitest 4, Playwright, Tailwind 3, oxlint
- 133 test files across `src/`, `scripts/` and `e2e/`

The product version and the IndexedDB schema version are unrelated numbers. "Schema v4"
never means "Nova Music Lab v4".

---

## 2. Invariants — never break these

These are enforced by CI. Violating one turns the pipeline red and blocks deployment.

1. **No raw visitor archive leaves the browser.** No upload endpoint, no Nova backend.
2. **No secret in the frontend.** No API key, account identifier, private CV file,
   browser-storage dump or raw listening export enters Git.
3. **No fabricated fact.** A number, date, attribution, biography or source capability
   that cannot be supported must render as *unavailable*, never as a plausible default.
4. **No flagship-only narrative presented as visitor-derived evidence.** Profile identity,
   privacy tier and capabilities live in explicit data metadata — never inferred from the
   presence of a particular artist or date.
5. **Every routed room stays lazy-loaded** (`React.lazy` in `src/App.tsx`). Heavy catalogs
   and the flagship dataset stay out of the entry bundle.
6. **All user-visible copy exists in English, Spanish and Hebrew**, with working RTL and
   bidirectional isolation for music names.
7. **Emoji may support hierarchy and tone, never as the only accessible label.**
8. **Bundle budgets are ceilings, not targets.** Do not raise a budget, weaken a strict
   audit, or delete a test to make CI green — fix the underlying regression.

### Evidence contract

Every analytical or narrative output is one of:

- **Observed** — directly supported by normalized archive events
- **Derived** — deterministically calculated from observed data
- **Inferred** — an interpretation shown with its evidence and limitations
- **Unavailable** — the active source cannot support the claim

Emotional and personality readings are **evidence-aware creative interpretations, not
diagnoses**. Their non-clinical boundary must stay visible in the UI.

---

## 3. Commands

### Daily loop

```bash
npm ci          # locked install; Node 22.13.0
npm run dev     # Vite dev server on :5173 (PORT overrides)
npm run build   # tsc -b && vite build
npm run preview # serve the production bundle
```

### Verification tiers — pick the cheapest one that covers your change

| Tier | Command | Use when |
|---|---|---|
| Targeted | `npx vitest run <path>` | Iterating on one module |
| Lint only | `npm run lint` | Style/typing sweep (oxlint) |
| Bundle | `npm run build:check` | Anything that could move bundle weight |
| **Canonical** | `npm run verify` | **Before every PR** |
| Release | `npm run verify:release` | Version bump / release preparation |
| Browser | `npm run test:e2e` | Navigation, a11y, responsive work |

`npm run verify` = lint → strict data audit → genre, identity, media-link, knowledge,
privacy, PWA and share audits → Vitest → TypeScript build → bundle budgets.

### Audits and data pipeline

| Command | Purpose |
|---|---|
| `npm run audit:data` / `audit:data:strict` | Dataset quality and priority queues |
| `npm run audit:privacy` | Public bundle privacy boundary (also run standalone) |
| `npm run audit:identity` | Reject undeclared duplicate artists and bad external matches |
| `npm run audit:links` | Curated media profiles and embeds |
| `npm run audit:genres` / `audit:knowledge` | Genre ontology and artist-knowledge manifest |
| `npm run audit:pwa` / `audit:share` | PWA contract; share-metric drift |
| `npm run audit:release-media` | Immutable source-fingerprinted release assets |
| `npm run compile:data -- --source-dir <path>` | Recompile the flagship aggregate |
| `npm run i18n:hebrew` | Regenerate the Hebrew UI catalog |
| `npm run screenshots:capture` | Regenerate README/release visuals |

The compiler **never** searches personal directories automatically — the source path is
always explicit.

### Close-out ritual (from `AGENTS.md`)

```bash
npm run verify
node scripts/audit_public_bundle_privacy.mjs
git diff --check
git status
```

---

## 4. Repository map

```
src/
  App.tsx                  2,009 lines — data gate, room registry, lazy routes, shell
  main.tsx                 entry point
  types.ts                 MusicDnaData and the shared analytical model
  index.css                1,759 lines — design tokens + glass surface system
  bootstrapScheduler.ts    idle-time bootstrap sequencing

  components/              121 top-level files + 8 folders, 156 total (see §6)
    shell/                 navigation model, hubs, command palette, journey state
    artist-atlas/          Living Artist Atlas
    hero/  share/  emotion/  audio-lab/  visitor/
    Surface.tsx            the one glass-surface primitive
    chartKit.tsx           shared Recharts wrappers, tooltip, CSV export, gradients
    museumVisualIdentity.ts  Living Sonic Cartography: room families, palettes, motion

  context/
    AppContext.tsx         2,988 lines — STRINGS (ES/EN), THEMES, language/theme state
    ExperienceContext.tsx  reading-depth state

  utils/                   69 files — parser, analytics, storage, identity, i18n, links
    parser.ts              source adapters → normalized ParsedPlay → aggregateData()
    analytics.ts           shared derived calculations
    datasetStorage.ts      legacy active-aggregate persistence with explicit outcomes
    i18n.ts                Lang / direction / locale / DOCUMENT_METADATA

  db/                      Dexie schema v4: museums, imports, events, entities,
                           dedupe clusters, capabilities, aggregates, insights
  engines/                 emotionalEngine, moodCore
  genres/  knowledge/      genre ontology and deterministic artist-knowledge manifest
  i18n/                    heStrings.ts (1,358 lines) + lazy Hebrew loader
  data/                    36 files, 28 of them JSON — the public bundle (see §5)
  releases/                release history and current-release metadata
  workers/                 musicBeeImport.worker.ts
  hooks/  audio/

scripts/                   67 .mjs pipeline + audit scripts, plus 13 in scripts/lib/
e2e/smoke.spec.ts          Playwright desktop + mobile journeys with axe
docs/                      architecture / data / design / operations / product + ADRs
assets/                    readme, screenshots, social, releases/<version>/
public/                    icons, manifest, sw.js, release-profile-manifest.json
```

### Big files — navigate, do not read whole

| File | Strategy |
|---|---|
| `src/App.tsx` (2,009) | `grep -n "lazy(\|^function \|^const "` to find the region first |
| `src/context/AppContext.tsx` (2,988) | `STRINGS` runs to ~line 2732; `THEMES` after it |
| `src/components/TopHistorico.tsx` (3,319) | Grep by feature; it has three dedicated test files |
| `src/index.css` (1,759) | Grep the token name, not the whole sheet |
| `src/data/*.json` | Generated artifacts — inspect with `node`/`jq`, never open blind |

---

## 5. Data: generated artifacts vs. source

Almost everything in `src/data/` is **generated by a script in `scripts/`**. Hand-editing a
generated file desynchronizes it from its audit and fails CI.

| Artifact | Produced by |
|---|---|
| `music_dna_compiled.json` | `npm run compile:data` |
| `music_dna_genre_catalog.json`, `artist_genre_assertions.v1.json` | `genres:build` |
| `genre_ontology.v1.json` | `genres:sync` |
| `artist_knowledge_manifest*.json` | `knowledge:manifest` |
| `offline_artist_knowledge.json` | `knowledge:artists` |
| `artist_enrichment_he.json`, `src/i18n/heStrings.ts` | `i18n:hebrew` |
| `share_metrics.json` | `share:sync` (drift fails `audit:share`) |
| `public_dataset_manifest.json` | Hand-maintained **declaration** — must match the bundle |

`music_dna_mock.json` is the test fixture: `src/test-setup.ts` mocks
`music_dna_compiled.json` with it globally, so tests never touch the real flagship data.

### Rules for any public-data change

1. Run the generator, never the editor.
2. Run `npm run audit:data` **and** `npm run audit:identity`, then read the *current*
   priority queue — never copy a coverage number from prose or an older document.
3. Keep `public_dataset_manifest.json` in step with the published bundle. Exact-granularity
   sections (`sessions`, `obsessions`, `daily_plays`, `platform_breakdown`,
   `snapshot_freshness`, `recent_pulse`) need an explicit declared status.
4. Run `node scripts/audit_public_bundle_privacy.mjs`. It scans every tracked text file for
   forbidden raw keys (`ip`, `email`, `user_id`, `device_id`, `latitude`, …) — including
   Markdown, so never *quote* a flagged value in a doc; describe it instead.
5. Before proposing artist media, read `src/data/artist_external_identity_policy.json`. It
   records reviewed name relationships, transliteration splits and rejected provider
   matches that must not be reintroduced.

---

## 6. Navigation model

Defined in `src/components/shell/museumNavigation.ts` — the single source of truth.

**Five hubs → 24 rooms:**

| Hub | Entry room | Rooms |
|---|---|---|
| `home` | `dashboard` | dashboard, share |
| `pulse` | `pulse` | pulse, obsessions, achievements, wrapped |
| `atlas` | `artist` | artist, top, cultural |
| `stories` | `eras` | eras, timecapsule, personality, emotions, inner, insights, report |
| `lab` | `upload` | upload, audio, aiassistant, compare, museums, platforms, quality, statsdeep |

**Three reading depths:** `guided`, `explore`, `deep-dive` (`ExperienceContext`,
persisted under `nml_experience_depth`).

Room order inside a hub is intentional: landing room first, then approachable → detailed.

### Adding or changing a room

1. Register the id in `CURRENT_MUSEUM_ROOM_IDS` and place it in `MUSEUM_HUB_ROOMS`.
2. Add the `React.lazy(...)` import in `src/App.tsx` — never a static import.
3. Give it an identity entry in `museumVisualIdentity.ts` (family, palette, motif).
4. Add EN + ES strings to `STRINGS` in `AppContext.tsx`, then run `npm run i18n:hebrew`.
5. Cover it in `src/components/shell/museumNavigation.test.ts` and a component test.
6. Run `npm run build:check` — a new room usually needs a `ROOM_GZIP_BUDGETS` entry in
   `scripts/check_bundle_budget.mjs`.

---

## 7. Visual system, motion and accessibility

- **One surface primitive:** `Surface.tsx` with variants `featured | analysis | utility`.
  Extend it rather than inventing a second glass system.
- **One chart kit:** `chartKit.tsx` — `ChartFrame`, `ChartCanvas`, `GlassTooltip`,
  `ChartGradients`, `axisProps`, `csvCell`. Charts carry a `ChartConfidence`
  (`exact | estimated | ytd`); do not present an estimate as exact.
- **Tokens over literals.** 50 project CSS custom properties in `src/index.css`:
  `--surface-*`, `--type-*`, `--motion-*`, `--nova-*`, `--c1..--c4`, `--font-*`.
  Add a token before adding a hex value.
- **Motion modes:** `expressive | calm | static`, default **calm**, stored at
  `nml_motion_mode`. A `prefers-reduced-motion` preference always overrides the mode.
- **Visual review is part of the change, not a follow-up.** Mobile *and* desktop; one dark
  *and* one light theme; EN/ES/HE with RTL; keyboard and visible focus; reduced motion;
  loading, empty, partial, success and failure states. Attach only privacy-safe screenshots.

---

## 8. Internationalization

Three languages, all first-class: `es`, `en`, `he` (`src/utils/i18n.ts`).

- ES and EN strings are authored in `STRINGS` in `AppContext.tsx`.
- Hebrew is **generated**: `npm run i18n:hebrew` writes `src/i18n/heStrings.ts` and
  `src/data/artist_enrichment_he.json`. Never hand-patch those two.
- Hebrew loads lazily (`loadHebrewExperience.ts`) with its own bundle budgets — ES/EN
  visitors must not pay its transfer cost.
- `index.html` carries a **prepaint script** that restores the saved language and `dir`
  *before* the Google Fonts request. `scripts/rtl_foundation.test.mjs` asserts that
  ordering; keep the prepaint above the font link.
- Mixed-direction music names need bidirectional isolation. Do not concatenate a Latin
  artist name into a Hebrew sentence without it.
- Share/preview copy numbers come from `share_metrics.json`, not from typed literals —
  `audit:share` fails on drift.

---

## 9. Testing

- **Unit / component:** Vitest + jsdom + Testing Library. `maxWorkers: 1` and
  `fileParallelism: false` are deliberate — the suite is memory-heavy and this keeps
  Windows and CI deterministic. Do not "optimize" them back.
- **Script tests:** `scripts/*.test.mjs` run in the same Vitest suite and validate
  pipeline libraries, artifact shape, contrast floors and the RTL foundation.
- **E2E:** Playwright over `npm run preview`, desktop 1440×900 and mobile 390×844, with
  `@axe-core/playwright`, `colorScheme: dark`, `reducedMotion: reduce`, service workers
  blocked. One worker in CI and on Windows, at most two elsewhere.
- `src/test-setup.ts` polyfills `localStorage`, stubs `getContext`, provides an
  immediate `IntersectionObserver` and mocks the flagship dataset.
- Conventions: `describe`/`it`, explicit `afterEach(cleanup)`, query by role or test id,
  assert on class contracts (`nova-surface--featured`) rather than snapshots.
- **Fixtures must be minimal and synthetic.** Never use a real archive as a test fixture.

---

## 10. Bundle budgets

`scripts/check_bundle_budget.mjs` enforces four families of ceilings:

- Entry chunk **315 KB raw**; landing shell closure **300 KB gzip**; demo landing **330 KB gzip** (raised about 5 percent on 2026-09-14; the receipt is in `scripts/check_bundle_budget.mjs`)
- Hebrew chunks, artwork maps and the artist portrait index (165 KB gzip) — lazy-only
- Genre ontology / assertions / full catalog — loaded only by Genre Lab and the Atlas
- Per-room gzip budgets: Dashboard 325, StatsDeepDive 325, TopHistorico 375,
  EmotionalMap 345, DataUploader 190, ArtistIdentity 165

The comments in that file carry the *reasons* — including a documented 4 KB debt in
`music_dna_genre_catalog` with the exact fix (drop the duplicated `artistKey` field, read
in ~23 files). Read the comment before touching a number.

If a budget fails: split a lazy chunk, move a static import to `import()`, or shard the
map. Raising the number is the last resort and needs an explicit written justification.

---

## 11. Git, PRs and CI

- `main` is production and must stay deployable. Branch from the latest `main`.
- Branch naming in this repo's history: `codex/<scope>`; agent branches are assigned per
  session — use the branch you were given and never push elsewhere.
- **Conventional Commit subjects**, one concern per commit:
  `feat(import): move archive parsing to a worker`,
  `fix(storage): surface IndexedDB restore failures`,
  `docs: document the public data boundary`. No single-character messages.
- **Shared worktree etiquette:** run `git status` and re-read files immediately before
  patching; other agents may have changed them. Preserve unrelated changes; never reset
  the worktree destructively.
- PRs use `.github/PULL_REQUEST_TEMPLATE.md`: visitor outcome, evidence boundary,
  privacy/network impact, visual proof, checks run, deferred work.
- Security and privacy issues go to a **private GitHub Security Advisory**, never a public issue.

**`quality-and-pages.yml`** — verify → browser → deploy → smoke:

1. Checkout with `persist-credentials: false`; Node from `.nvmrc`; `npm ci`
2. `npm run audit:dependencies` fails on any known vulnerability
3. `npm run verify`, then the privacy audit again as an explicit release boundary
4. Release-media audit on `main`, manual runs and version-changing PRs only
5. Build, stamp commit + version + Jerusalem deployment date, upload `dist` (main only)
6. Deploy to Pages, then poll the live URL until the shell **and** the exact
   commit/version markers in `build-meta.json` and `release-profile-manifest.json` agree

PRs additionally get CodeQL and dependency review. Actions are pinned by SHA — keep them
pinned when bumping.

**Never deploy or tag while a required check is red.**

---

## 12. Fast paths — how to be efficient here

- **Start from the audit, not the prose.** Coverage numbers in Markdown age; the scripts
  are authoritative. `npm run audit:data` before believing any figure.
- **Grep before reading.** The five largest source files are 1,700–3,300 lines each.
- **Match the change to the tier.** A copy tweak needs `npx vitest run` on one file plus
  `npm run i18n:hebrew`; it does not need `verify:release`.
- **Look for an existing primitive first.** `Surface`, `chartKit`, `museumVisualIdentity`,
  `SectionNarrative`, `SectionQuickRead`, `ExpandableInsightCard`, `MethodologyPanel`,
  `InterpretiveBoundaryNotice` already solve most layout and framing needs.
- **Data question → `scripts/` first.** ~70 scripts already cover fetch, enrichment,
  dedupe, residue tracking and audit. Check for one before writing a new pipeline.
- **A missing value is a feature.** When in doubt, render the unavailable state.
- **Trace `useApp()` / `useExperience()`** to find where language, theme, depth and
  navigation state actually live before adding new state.

### Documentation index

| Question | File |
|---|---|
| System map, layers, ADRs | `docs/architecture/OVERVIEW.md` |
| What may ship publicly | `docs/data/PUBLIC_DATA_POLICY.md` |
| Threats and mitigations | `docs/architecture/PRIVACY_THREAT_MODEL.md` |
| IndexedDB v4 and migrations | `docs/architecture/STORAGE_AND_MIGRATIONS.md` |
| Required checks | `docs/operations/QUALITY_GATES.md` |
| Release procedure and records | `docs/operations/RELEASE.md` |
| Accessibility contract | `docs/design/ACCESSIBILITY.md` |
| Visual system | `docs/design/VISUAL_SYSTEM.md` |
| Hubs, depths, rooms | `docs/product/EXPERIENCE_MODEL.md` |
| Supported archives | `docs/product/DATA_SOURCES.md` |
| Genre ontology | `docs/data/GENRE_ONTOLOGY.md` |
| Artwork provenance | `docs/data/ARTWORK_SCHEMA.md` |
| Current verified state | `CURRENT_STATUS.md` |

Project-specific Claude Code skills live in `.claude/skills/` — invoke them by name
(`/verify-gate`, `/museum-room`, `/public-data-change`, `/trilingual-copy`,
`/bundle-budget`, `/release-train`).
