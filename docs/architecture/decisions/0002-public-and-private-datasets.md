# ADR 0002 — Public flagship and private visitor profiles

- **Status:** Accepted
- **Decision date:** 2026-07-16

## Context

The repository includes Kevin's curated flagship aggregate while visitors can import unrelated archives. Treating both as one anonymous dataset causes narrative leakage and obscures privacy intent.

## Decision

Every active dataset has an explicit profile:

- `flagship` with privacy tier `curated-public`;
- `visitor-import` with privacy tier `browser-private`.

Flagship-only stories may personalize Kevin's exhibition. Visitor mode may only render claims derived from its active payload, capabilities and provenance.

## Consequences

- A public manifest and CI audit govern the flagship bundle.
- Components need explicit capability and profile inputs.
- Tests include an unrelated archive that must never render flagship-specific names, dates or stories.
- Public exact-granularity sections require deliberate review rather than accidental bundling.
