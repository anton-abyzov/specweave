# SpecWeave (this repository)

This is the source of the `specweave` npm package: a CLI plus a Claude Code plugin that plans work as increments (`spec.md` + `ledger.jsonl`) and hands it between AI tools. This file is for anyone changing SpecWeave itself; the file SpecWeave writes into user projects is `src/templates/AGENTS.md.template`.

## Layout

| Path | What it is |
|---|---|
| `bin/specweave.js` | Commander entry; each command lazily imports `dist/src/cli/commands/<name>.js` |
| `src/cli/commands/` | One file per CLI command |
| `src/core/tasks/` | Task parser, `ledger.jsonl` fold, `task` board, verify, AC derivation |
| `src/core/session/` | `pickup`, `handoff` (doc, Git capture, `--push`, secret scrub) |
| `src/core/increment/` | Increment creation, metadata, status transitions |
| `src/core/hooks/handlers/` | Claude Code hook handlers, reached through `plugins/specweave/hooks/run.mjs` |
| `src/sync/`, `src/integrations/` | GitHub, Jira and ADO sync (opt-in, only on `specweave sync`) |
| `src/templates/` | What `init` and `update` write into user projects |
| `skills/sw-*` | The one skill source for every tool; `npm run generate:skills` writes the plugin copies in `plugins/specweave/skills/` (never edit those) |
| `docs-site/` | spec-weave.com (Docusaurus); deploys from `develop` |

## Work here

- Node 22. `npm ci`, then `npm run build` (tsc, dashboard, plugin copies). The CLI runs from `dist/`, so rebuild before trying a command: `node bin/specweave.js <cmd>`.
- Tests: `npm run test:unit` is what CI runs (`tests/unit/**`). Co-located `src/**/*.test.ts` files are not in CI; run them with `npx vitest run src/<path>` when you touch that code, and put new tests under `tests/unit/`.
- Typecheck with `npx tsc --noEmit -p .` before pushing.
- Adding or renaming a CLI command or option: regenerate completions with `node scripts/completions/generate.mjs`.
- `init` refuses to run inside the system temp directory; use a scratch folder elsewhere to try it.
- Keep files under 1,500 lines. Prefer deleting code to adapting it.
- Default branch is `develop`. PRs target `develop`.

## Releasing

1. `npm run release:minor` (or `:patch`, `:major`) bumps `package.json`, the plugin and marketplace manifests, and adds a CHANGELOG entry; `npm run validate:versions` checks they agree.
2. Merge to `develop`, then push the tag `vX.Y.Z` on that commit. `.github/workflows/release.yml` builds, checks the tag against `package.json` and publishes to npm through GitHub OIDC trusted publishing. No local npm token is needed or used.

## Project notes

- Increment state lives only in `ledger.jsonl`. Never write derived state (checkboxes, board tables) back into markdown; a legacy `tasks.md` is read, and rewritten only by `specweave task render --write`.
- Hooks must stay fast and offline: no network, no Git in SessionStart, and a hook error must never block the user's tool.
- Changing an increment's status never calls a tracker. Only `specweave sync push` and the explicit close-on-complete setting do.
