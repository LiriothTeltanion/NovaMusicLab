# Quality Gates

## Canonical local gate

```bash
npm run verify
node scripts/audit_public_bundle_privacy.mjs
git diff --check
```

`npm run verify` runs lint; strict data and media-link audits; artist-knowledge, public-bundle privacy and PWA contract audits; the Vitest suite; TypeScript compilation; the production build; and bundle-budget checks.

## Targeted iteration

During development, run the narrowest relevant test first, then close with the canonical gate. Examples:

```bash
npx vitest run src/utils/parser.test.ts
npx vitest run src/utils/datasetStorage.test.ts
npx vitest run src/components/CreatorCvLink.test.tsx scripts/cv_asset.test.mjs
npm run audit:data
```

## GitHub pipeline

`quality-and-pages.yml`:

1. Checks out the exact revision with no persisted credentials.
2. Uses the Node version in `.nvmrc`.
3. Installs `package-lock.json` with `npm ci`.
4. Runs the complete verification gate.
5. Repeats the public-bundle privacy audit as an explicit release boundary.
6. Stamps the artifact with its exact source commit and package version.
7. Uploads `dist` only for a successful `main` run.
8. Deploys that verified artifact to Pages.
9. Polls the deployed URL and accepts it only when the shell and exact commit/version marker are live.

Pull requests additionally receive dependency review and CodeQL analysis.

## Visual acceptance

For UI work, automation is incomplete without a browser review covering:

- mobile and desktop;
- dark and light themes;
- EN, ES and HE/RTL;
- keyboard and focus;
- reduced motion;
- loading, empty, partial, success and failure states;
- privacy-safe screenshots when appearance changes.

## Release blocking policy

Do not deploy or tag while a required check is red. Do not raise bundle budgets, weaken strict audits or delete tests only to make a pipeline green; document and fix the underlying regression.
