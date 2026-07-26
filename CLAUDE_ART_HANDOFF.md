# Artwork schema moved

The former agent-specific art handoff has been migrated to a neutral, maintained reference:

**[`docs/data/ARTWORK_SCHEMA.md`](./docs/data/ARTWORK_SCHEMA.md)**

Before proposing artist media, also read
`src/data/artist_external_identity_policy.json`. It records reviewed historical
name relationships, transliteration splits and provider matches that must not be
reintroduced.

Use the current data audit rather than historical coverage numbers:

```bash
npm run audit:data
npm run audit:identity
```
