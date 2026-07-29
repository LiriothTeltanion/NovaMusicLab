# Living Sonic Cartography

Nova Music Lab's visual system treats every room as a coordinate in one living museum rather than an unrelated dashboard theme. `src/components/museumVisualIdentity.ts` is the source of truth for room family, palette, atmosphere and navigation identity.

## Identity layers

- **Nova mark:** an open orbit, waveform and letterform used by the app, favicon, PWA, maskable and monochrome icons.
- **Room families:** related rooms share a visual grammar while retaining distinct accent palettes.
- **Atmosphere:** deterministic SVG/canvas geometry reacts to the active room and artist without becoming content or blocking interaction.
- **Repository art:** the README banner and 1280×640 social preview use the same cyan, violet, magenta and amber Living Sonic Cartography palette.

## Expedition Console

The application shell is a navigation instrument rather than a generic dashboard frame:

- **Five hubs** organize the complete museum into Home, Pulse, Atlas, Stories and Data Lab without hiding rooms.
- **Guided** opens plain-language introductions and gives first-time visitors a clear next step.
- **Explore** keeps the full museum visual and self-directed without adding explanatory panels automatically.
- **Deep Dive** opens methodology and foregrounds provenance, limitations and advanced controls.
- **Archive Capsule** exposes active mode, source, date, privacy and persistence without inventing unavailable metadata.
- **Nova Command** provides keyboard-first access to every room and experience depth with focus restoration.

The active hub scopes the sidebar, room sequence and mobile controls while Nova Command retains access to the complete museum. Experience depth changes presentation only: it persists between visits but never hides a room or changes a shared URL. A control must never look selected while another navigation surface follows a different state.

## Living Artist Atlas

The Atlas became the flagship visual room in `1.1.0` — deployed 2026-07-26. It combines three explicit layers:

1. **Archive evidence:** rank, plays, share, tracks and albums from the active dataset.
2. **Offline knowledge:** documented profiles, releases, external identities and provenance loaded outside the entry bundle.
3. **Remote media:** provider-labelled portraits and explicitly opt-in Spotify/YouTube players.

Remote photographs progressively reveal over deterministic local cartography so missing or failed media never produces a fabricated portrait or empty visual hole. The later generative identity chapter remains clearly labelled as an imagined interpretation.

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
