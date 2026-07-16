# Contributing to Nova Music Lab

Nova Music Lab is Kevin Cusnir's flagship personal music museum and a public engineering portfolio. Contributions must preserve analytical honesty, privacy, multilingual quality and the visual identity of the museum.

## Before you begin

- Read [`AGENTS.md`](./AGENTS.md) and the [architecture overview](./docs/architecture/OVERVIEW.md).
- Check `git status` and re-read any file before editing; multiple tools may share the working tree.
- Never commit raw listening exports, API keys, private CVs, account identifiers or browser storage dumps.
- Use minimal synthetic fixtures for parser and privacy tests.

## Local setup

```bash
npm ci
npm run dev
```

Use the Node version declared in `.nvmrc`.

## Branches and GitHub Desktop

`main` is the deployable production branch. Create a focused branch from the latest `main`, for example:

```text
codex/v1-privacy-boundary
codex/v1-import-reliability
codex/v1-visual-system
codex/v1-docs-release
```

In GitHub Desktop:

1. Fetch origin and confirm `main` is current.
2. Create the focused branch.
3. Review every changed file and avoid bundling unrelated work.
4. Commit one concern at a time.
5. Publish the branch and open a pull request.
6. Wait for required checks, squash merge, delete the branch and fetch `main` again.

## Commit messages

Use Conventional Commit-style subjects:

```text
feat(import): move archive parsing to a worker
fix(storage): surface IndexedDB restore failures
refactor(data): separate flagship and visitor profiles
style(museum): unify room typography and motion
docs: document the public data boundary
test(parser): add a foreign-archive privacy fixture
ci: protect verified Pages deployments
chore(release): prepare v1.0.0-rc.1
```

Avoid single-character or ambiguous commit messages.

## Product and data expectations

- Classify claims as observed, derived, inferred or unavailable.
- Do not fabricate a number, date, attribution, biography or source capability.
- Keep flagship-only narratives out of visitor imports.
- When an artist or media identity is ambiguous, prefer an honest unresolved state.
- All user-visible copy must be complete in English, Spanish and Hebrew.
- Hebrew changes must preserve RTL composition and mixed-direction music names.
- Emoji can support the museum's personality, but never use emoji as the only accessible label.

## Visual and accessibility review

For a visual change, check:

- mobile and desktop widths;
- one dark and one light theme;
- English, Spanish and Hebrew/RTL;
- keyboard navigation and visible focus;
- reduced-motion behavior;
- contrast and text legibility;
- loading, empty, partial and error states.

Attach only privacy-safe screenshots to the pull request.

## Verification

Run before requesting review:

```bash
npm run verify
node scripts/audit_public_bundle_privacy.mjs
git diff --check
git status
```

Add targeted tests for changed behavior. Data or media work must also run the relevant strict audit and inspect its priority queue rather than copying stale coverage numbers from documentation.

## Pull requests

Complete the repository pull-request template. Explain the visitor outcome, evidence boundary, privacy/network impact, visual proof, checks run and any intentionally deferred work.

Security and privacy vulnerabilities must use a private [GitHub Security Advisory](https://github.com/LiriothTeltanion/NovaMusicLab/security/advisories/new), not a public issue.
