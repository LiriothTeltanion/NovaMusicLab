# Living Sonic Cartography

Nova Music Lab's visual system treats every room as a coordinate in one living museum rather than an unrelated dashboard theme. `src/components/museumVisualIdentity.ts` is the source of truth for room family, palette, atmosphere and navigation identity.

## Identity layers

- **Nova mark:** an open orbit, waveform and letterform used by the app, favicon, PWA, maskable and monochrome icons.
- **Room families:** related rooms share a visual grammar while retaining distinct accent palettes.
- **Atmosphere:** deterministic SVG/canvas geometry reacts to the active room and artist without becoming content or blocking interaction.
- **Repository art:** the README banner and 1280×640 social preview use the same cyan, violet, magenta and amber Living Sonic Cartography palette.

## Motion tiers

| Mode | Behavior |
|---|---|
| Expressive | Reactive canvas drift and richer atmospheric movement. |
| Calm | Default; no continuous canvas RAF, with slower low-cost CSS ambience retained. |
| Static | Deterministic still atmosphere with no autonomous movement. |

The system reduced-motion preference takes priority over the UI selection. Visibility changes pause expressive loops, resizes preserve relative canvas geometry, and decorative layers remain `aria-hidden` and pointer-transparent.

## Quality rules

- Core copy, controls and evidence labels target 12px or larger. Intentional 8–11px micro-labels are limited to redundant auxiliary metadata or decorative indexing; they must not be the only presentation of evidence, state or an action and must remain legible under browser zoom.
- Light themes keep paper-like luminance instead of receiving a dark blend veil.
- Hebrew mirrors layout direction while data plots retain explicit left-to-right geometry.
- Focus states remain visible; programmatic room headings are focusable without a decorative outline.
- New room visuals belong in the shared registry rather than one-off component maps.
