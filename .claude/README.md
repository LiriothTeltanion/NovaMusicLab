# `.claude/` — Nova Music Lab agent harness

Project-scoped configuration for Claude Code and compatible agent harnesses.

| File | Purpose |
|---|---|
| `../CLAUDE.md` | Primary operating guide — read first |
| `../AGENTS.md` | Condensed non-negotiable rules for other harnesses |
| `launch.json` | Dev-server launch profile (`npm run dev`, port 5173) |
| `skills/` | Project-specific skills, invocable by name |

## Skills

| Skill | Invoke when |
|---|---|
| `verify-gate` | Choosing and running the right verification tier; reading a failure |
| `museum-room` | Adding, moving or reworking a routed room, hub or navigation entry |
| `public-data-change` | Touching `src/data/`, enrichment, artwork, identity or the manifest |
| `trilingual-copy` | Any user-visible string, in EN/ES/HE, including RTL |
| `bundle-budget` | A `build:check` budget failure, or adding a heavy import |
| `release-train` | Version bump, release media, deployment evidence, tagging |

Invoke as `/verify-gate`, `/museum-room`, and so on.

## Recommended permission allowlist

This repository's verification loop is long (`npm run verify` chains nine audits plus the
full test suite and a production build), so an agent that must ask before each step is slow
and noisy. The rules below are read-only inspection plus the project's own npm scripts —
nothing that writes outside the worktree or pushes.

Apply them with `/permissions` in an interactive session, or copy into
`.claude/settings.json` (project-wide) or `.claude/settings.local.json` (personal, gitignored):

```json
{
  "permissions": {
    "allow": [
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git show:*)",
      "Bash(git branch:*)",
      "Bash(npm ci)",
      "Bash(npm run lint)",
      "Bash(npm run test)",
      "Bash(npm run build)",
      "Bash(npm run build:check)",
      "Bash(npm run verify)",
      "Bash(npm run verify:release)",
      "Bash(npm run audit:data)",
      "Bash(npm run audit:data:strict)",
      "Bash(npm run audit:genres)",
      "Bash(npm run audit:identity)",
      "Bash(npm run audit:links)",
      "Bash(npm run audit:knowledge)",
      "Bash(npm run audit:privacy)",
      "Bash(npm run audit:pwa)",
      "Bash(npm run audit:share)",
      "Bash(npm run audit:release-media)",
      "Bash(npm run audit:dependencies)",
      "Bash(npm run share:sync)",
      "Bash(npm run genres:sync)",
      "Bash(npm run genres:build)",
      "Bash(npm run knowledge:manifest)",
      "Bash(npm run knowledge:artists)",
      "Bash(npm run i18n:hebrew)",
      "Bash(npm run i18n:hebrew:central)",
      "Bash(npm run i18n:hebrew:data)",
      "Bash(npx vitest run:*)",
      "Bash(node scripts/audit_public_bundle_privacy.mjs)",
      "Bash(node scripts/check_bundle_budget.mjs)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./.cache/**)"
    ]
  }
}
```

The `deny` entries matter here: `.cache/` holds raw provider API responses from the
enrichment harvests, and the privacy audit exists precisely because that material must never
reach a commit or the published bundle.

Deliberately **not** pre-approved: `git push`, `git reset --hard`, `git clean`, and the data
compiler (`npm run compile:data`), which reads an explicitly chosen personal archive path.
