---
name: trilingual-copy
description: Write, change or review user-visible copy in Nova Music Lab across English, Spanish and Hebrew, including RTL layout and bidirectional music names. Use whenever a string, label, tooltip, error message, aria-label or share text changes.
---

# Trilingual copy

Every user-visible string exists in **three** languages: `es`, `en`, `he`. A change that
lands in one or two is incomplete, not a partial improvement.

## Where strings live

| Layer | Location | How it changes |
|---|---|---|
| App UI (ES + EN) | `STRINGS` in `src/context/AppContext.tsx` (~to line 2732) | Hand-authored |
| Hebrew UI | `src/i18n/heStrings.ts` | **Generated** — `npm run i18n:hebrew` |
| Hebrew artist overlay | `src/data/artist_enrichment_he.json` | **Generated** — same command |
| Language metadata | `LANGUAGE_OPTIONS`, `DOCUMENT_METADATA` in `src/utils/i18n.ts` | Hand-authored |
| Share / preview numbers | `src/data/share_metrics.json` | **Generated** — `npm run share:sync` |

Narrower regeneration when you know what moved:
`npm run i18n:hebrew:central` (UI only) · `npm run i18n:hebrew:data` (JSON only).

## Workflow

1. Add or edit the ES and EN entries in `STRINGS`.
2. Run `npm run i18n:hebrew`.
3. Never hand-patch `heStrings.ts` or `artist_enrichment_he.json` — the next regeneration
   overwrites it and the diff hides the real source change.
4. If the string states a metric, take it from data, not from a literal.
   `scripts/sync_share_metrics.mjs --check` (`npm run audit:share`) fails the build when a
   share surface drifts from `core_metrics` — this has already shipped a wrong number once.
5. Verify with `npx vitest run src/utils/i18n.test.ts scripts/hebrew_i18n.test.mjs scripts/rtl_foundation.test.mjs`.

## RTL rules

- Hebrew is `rtl` with locale `he-IL`; ES/EN are `ltr`.
- `index.html` carries a **prepaint script** that restores the saved language and `dir`
  from `nml_lang` *before* the Google Fonts request. `scripts/rtl_foundation.test.mjs`
  asserts that ordering — keep the prepaint above the font link, always.
- Mixed-direction text needs **bidirectional isolation**. A Latin artist name dropped into
  a Hebrew sentence without isolation reorders punctuation and numerals on screen.
- Hebrew ships as its own lazy chunk with its own bundle budget (35 KB gzip for the UI
  catalog, 55 KB for the artist overlay). ES/EN visitors must never pay for it.
- Number formatting uses `useGrouping: 'always'` — Spanish drops the separator on
  four-digit numbers, which reads like a typo between two grouped figures.

## Tone and accessibility

- Write for someone who just tapped a link a friend sent, not for a technical reader.
  "local-first", "evidence-linked" and "ListenBrainz" mean nothing in a chat preview;
  concrete numbers do the work.
- Emoji can carry the museum's personality, but **never as the only accessible label**.
- Say *unavailable* plainly when data cannot support a claim. Never soften it into a
  plausible-sounding number.
- Emotional and personality copy must keep its non-clinical framing visible.
