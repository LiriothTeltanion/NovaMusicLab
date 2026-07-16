# ADR 0001 — Local-first architecture

- **Status:** Accepted
- **Decision date:** 2026-07-16

## Context

Listening exports contain detailed personal behavior. The product does not require a server to generate its core museum.

## Decision

Visitor archives are parsed, analyzed and stored in the browser. GitHub Pages hosts static assets and a separately reviewed flagship aggregate. No Nova backend stores visitor archives.

## Consequences

- Privacy and deployment stay comparatively simple.
- Browser storage failure, quota and migration behavior must be treated as product states.
- Cross-device sync and collaborative features are unavailable without a future, explicitly approved architecture change.
- External fonts, artwork, embeds and optional Gemini calls must remain documented exceptions to network isolation.
