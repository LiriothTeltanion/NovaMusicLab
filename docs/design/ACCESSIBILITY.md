# Accessibility

Nova Music Lab treats accessibility as part of analytical trust. A chart or museum narrative is incomplete when its evidence is inaccessible to keyboard, screen-reader, low-vision or motion-sensitive visitors.

## Required behavior

- Semantic heading order and named landmarks.
- Visible keyboard focus and logical focus restoration after room navigation.
- Escape and focus containment for drawers, dialogs and menus.
- Text alternatives for meaningful images and decorative hiding for purely ornamental art.
- Exact-value tables or equivalent summaries for quantitative charts.
- Formula-safe CSV export where tabular download is offered.
- Expressive, Calm and Static atmosphere controls. Calm is the default; Static removes autonomous atmosphere animation.
- The operating-system reduced-motion preference overrides the selected mode for transitions and canvas art.
- Repository banner/social artwork is static, avoiding motion in README and link previews.
- No essential state communicated by color or emoji alone.
- Correct `lang`, `dir`, locale formatting and bidirectional isolation.

For `v1.5.0` — deployed 2026-08-01 — the release boundary additionally
requires one exact `NOVA MUSIC LAB` accessible Hero heading, a trilingual skip
link, one `h1` per routed room, focus return when Escape closes overlays, LTR
isolation for counters inside Hebrew RTL, decorative artist avatars with empty
alternative text when adjacent text already names the artist, and a Genres
deep link that stays visible and chart-safe at 360/390 pixels.

## Responsive and language matrix

Review the core journey at:

```text
320 × 568
360 × 800
390 × 844
768 × 1024
1024 × 768
1366 × 768
1440 × 900
```

For each release candidate, cover English, Spanish and Hebrew/RTL; one dark and one light theme; keyboard navigation; and reduced motion.

## Automated gates

The v1 gate includes:

- axe checks for core rooms and dialogs;
- Playwright journeys for flagship, import, restore, language, route and export flows;
- automated contrast checks for semantic tokens across all themes;
- privacy-safe visual regression screenshots;
- coverage thresholds for parser, storage and capability/provenance logic.

Automation supplements, rather than replaces, manual keyboard, zoom, screen-reader and motion review.
