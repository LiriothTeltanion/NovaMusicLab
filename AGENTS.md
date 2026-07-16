# Nova Music Lab Engineering Guide

These rules apply to every contributor or coding agent working in this repository.

## Product principles

- Keep code clean, ordered, typed and easy to review.
- Preserve the expressive cyber-museum visual identity; emojis are welcome when they clarify hierarchy or tone, but never as the only accessible label.
- Personalize the flagship exhibition from verified project context without inventing facts.
- Separate flagship-only content from visitor-derived analysis.
- Prefer an honest unavailable state over a plausible fabricated number, attribution or biography.

## Privacy

- Never commit raw listening exports, API keys, account identifiers, browser databases or private CV files.
- Treat `src/data/music_dna_compiled.json` and `src/data/recent_pulse.json` as public artifacts.
- Keep `src/data/public_dataset_manifest.json` synchronized with the published bundle.
- Run `node scripts/audit_public_bundle_privacy.mjs` for any public-data change.
- Document every new runtime network request.

## Language, visuals and accessibility

- User-visible copy must support English, Spanish and Hebrew.
- Preserve Hebrew RTL behavior and bidirectional isolation for music names.
- Review visual changes on mobile and desktop, in a dark and light theme.
- Include keyboard, focus, contrast, loading/error and reduced-motion behavior.
- Extend existing theme, chart, surface and motion conventions instead of creating isolated one-off systems.

## Architecture

- Every routed museum room remains lazy-loaded.
- Do not pull the flagship dataset or offline artist catalog into the entry bundle.
- Keep source parsing, normalization, validation, deduplication and aggregation explicit.
- Use stable composite keys for rendered lists and normalized artist/media identities.
- Re-read high-churn files before editing and preserve unrelated shared-worktree changes.

## Verification

```bash
npm run verify
node scripts/audit_public_bundle_privacy.mjs
git diff --check
git status
```

Use targeted tests while iterating, then close release work with the full gate and a privacy-safe browser review in EN/ES/HE.
