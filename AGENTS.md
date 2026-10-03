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

`develop` only accepts pull requests, so a release is a version PR:

1. Run **Release & Publish** on `develop` from the Actions tab, or `gh workflow run release.yml --ref develop -f version_type=patch` (or `-f version=X.Y.Z`). It bumps `package.json`, the plugin and marketplace manifests and the CHANGELOG (an `## [Unreleased]` section becomes the entry; without one, the commits since the last tag are listed), builds and packs it, pushes `release/vX.Y.Z` and opens the PR. Locally, `npm run release:patch` (or `:minor`, `:major`) on a branch does the same bump. Tick `dry_run` to bump, build and pack without pushing anything.
2. Merge the PR. A push to `develop` that changes the version in `package.json` to one with no tag tags that commit `vX.Y.Z` and publishes it to npm through GitHub OIDC trusted publishing, then creates the GitHub release. No local npm token or tag push is needed.

Pushing a `vX.Y.Z` tag on a commit whose `package.json` has that version still publishes it the same way. A PR opened by the Actions token starts no CI run; the release job builds and checks the tarball again before publishing.

## Project notes

- Increment state lives only in `ledger.jsonl`. Never write derived state (checkboxes, board tables) back into markdown; a legacy `tasks.md` is read, and rewritten only by `specweave task render --write`.
- Hooks must stay fast and offline: no network, no Git in SessionStart, and a hook error must never block the user's tool.
- Changing an increment's status never calls a tracker. Only `specweave sync push` and the explicit close-on-complete setting do.
