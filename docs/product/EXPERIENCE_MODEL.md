# Experience model

Status: Nova Music Lab `1.2.0` — **deployed 2026-07-29**. The public site reports product `1.2.0` from the verified GitHub Pages artifact.

Nova Music Lab separates **where a visitor goes** from **how much explanation they want**. This prevents a beginner setting from hiding rooms and prevents an expert setting from unexpectedly changing the URL.

## Five museum hubs

| Hub | Purpose | Entry route |
|---|---|---|
| Home | Orientation, archive overview, sharing and feedback | `#/dashboard` |
| Pulse | Recent movement, loops, achievements and yearly summaries | `#/recent-pulse` |
| Atlas | Living Artist Atlas, rankings and cultural geography | `#/artist-identity` |
| Stories | Eras, identity, emotion and the final narrative | `#/eras` |
| Data Lab | Import, local audio, comparison, quality and advanced statistics | `#/upload` |

Every room belongs to exactly one hub. The active hub is derived from the current hash route and is never saved as duplicate state. Existing room URLs remain canonical and shareable.

## Three experience depths

| Depth | Default behavior | Audience |
|---|---|---|
| Guided | Uses everyday language, opens explanatory introductions and emphasizes one clear next step | First visit or relaxed exploration |
| Explore | Balanced default; uses short human explanations and lets visual evidence lead | First entry and regular museum visit |
| Deep Dive | Opens methodology and prioritizes exact fields, provenance, limits and advanced tools | Musicians, researchers and power users |

### Progressive language contract

Depth changes the presentation, never the underlying facts:

- **Guided** starts with what a result means in everyday language. Technical
  terms appear only when essential and are explained where they appear.
- **Explore** keeps descriptions brief and human. It shows the strongest
  evidence and a visible limitation without opening every method or raw field.
- **Deep Dive** may expose reconciliation, normalization, confidence,
  provenance, raw coverage and other specialist details.
- Important privacy warnings, unavailable states and evidence limits remain
  visible in every depth; simpler language must never turn uncertainty into a
  stronger claim.
- Artist descriptions should introduce the person or group before presenting
  identifiers, coverage metrics or source mechanics.
- A source such as MusicBee must have the same evidence boundary in every
  depth: its library snapshot never becomes a listening timeline merely because
  the explanation is simpler.

Changing depth:

- does not navigate;
- does not change the URL or browser history;
- does not change the active archive;
- does not hide rooms;
- is saved locally under `nml_experience_depth`;
- preserves the older `nml_expedition_journey` key while migrating its value additively.

Depth is separate from the Expressive, Calm and Static motion setting. System reduced motion still overrides animation.

## First-entry and shared-link behavior

- A new visitor starts in Explore. Guided remains one tap away for more explanation.
- The welcome tour may open only at the root landing route.
- A direct room link opens that room immediately without placing onboarding over shared content.
- The header exposes all five hubs; the room rail and previous/next controls stay scoped to the active hub.
- Nova Command (`Ctrl/Cmd+K`) continues to expose the complete museum.

## Verification contract

Unit and browser checks must prove:

1. every non-hero room belongs to one hub;
2. hub entries use valid canonical room routes;
3. changing depth preserves hash and selected room;
4. a direct Atlas link does not open onboarding;
5. Explore is the clean default and Guided opens introductory narratives;
6. Deep Dive opens methodology panels;
7. EN, ES and HE/RTL remain usable at mobile and desktop widths.
